-- 0021 — who may post a role, and when it may go live
--
-- Two rules the product has been claiming without enforcing. Both were true
-- only by accident, and 0020 removed the accident: the admin side now has
-- separate buttons for verifying a school and confirming one of its people,
-- so "a confirmed person at an unverified school" became a state somebody can
-- reach by clicking.
--
--   1. A posting may be LIVE only while its school is verified. The drafted
--      terms of service say "we verify a school as an institution before its
--      postings go live", and until now nothing stopped a pending school from
--      publishing. Drafting is still allowed — a school waiting on us can
--      write its roles, it just cannot show them to candidates.
--
--   2. Whoever is recorded as having created a posting must actually hold
--      `post_jobs` at that school. The permission existed and nothing checked
--      it on this path.
--
-- Both as triggers rather than as checks inside a create function: a trigger
-- cannot be gone around by a second code path, and there will be a second
-- code path — an importer, a duplicate-posting button, a script.

BEGIN;

-- Nobody hand-writes a posting id any more; the form creates them.
ALTER TABLE job_postings
  ALTER COLUMN id SET DEFAULT 'job_' || replace(gen_random_uuid()::text, '-', '');

CREATE FUNCTION job_postings_live_needs_verified_school() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE v_status text;
BEGIN
  IF NEW.status <> 'posted' THEN
    RETURN NEW;
  END IF;

  SELECT verification_status INTO v_status
  FROM   schools WHERE id = NEW.school_id;

  IF v_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION
      'job_posting %: % is not a verified school, so its roles cannot go live',
      NEW.id, NEW.school_id;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER job_postings_live_needs_verified_school
  BEFORE INSERT OR UPDATE OF status, school_id ON job_postings
  FOR EACH ROW EXECUTE FUNCTION job_postings_live_needs_verified_school();

/**
 * The author must hold the permission at the school the posting belongs to.
 *
 * NULL is allowed: a posting created by an importer or a future scheduled job
 * has no human author, and inventing one would be worse than recording none.
 * What is not allowed is naming somebody who could not have done it.
 */
CREATE FUNCTION job_postings_enforce_author() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.created_by_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM school_users u
                 WHERE u.id = NEW.created_by_id
                   AND u.school_id = NEW.school_id
                   AND u.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'job_posting %: % does not belong to school %',
      NEW.id, NEW.created_by_id, NEW.school_id;
  END IF;

  IF NOT school_user_has(NEW.created_by_id, 'post_jobs') THEN
    RAISE EXCEPTION 'job_posting %: % may not post jobs', NEW.id, NEW.created_by_id;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER job_postings_enforce_author
  BEFORE INSERT OR UPDATE OF created_by_id, school_id ON job_postings
  FOR EACH ROW EXECUTE FUNCTION job_postings_enforce_author();

-- ---------------------------------------------------------------------------
-- Un-verifying has to take the roles off air with it
-- ---------------------------------------------------------------------------

/**
 * Replaces 0020's version. Sending a school back to pending while its roles
 * stay visible to candidates would leave exactly the state rule 1 exists to
 * prevent — and the trigger above would not catch it, because it watches
 * postings rather than schools.
 *
 * They become `on_hold` rather than `draft`: the school meant to be hiring and
 * may well be again by Friday. The count comes back so a human can say so.
 * Dropped and recreated rather than replaced: it now returns how many
 * postings it parked, and CREATE OR REPLACE refuses to change a return type.
 */
DROP FUNCTION platform_unverify_school(text, text, text);

CREATE FUNCTION platform_unverify_school(
    p_platform_user_id text, p_school_id text, p_reason text)
  RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_parked int;
BEGIN
  PERFORM platform_assert_staff(p_platform_user_id);

  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'un-verifying a school needs a reason';
  END IF;

  UPDATE schools
     SET verification_status = 'pending', verified_at = NULL
   WHERE id = p_school_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such school: %', p_school_id;
  END IF;

  WITH parked AS (
    UPDATE job_postings SET status = 'on_hold'
    WHERE school_id = p_school_id AND status = 'posted' AND deleted_at IS NULL
    RETURNING 1
  )
  SELECT count(*)::int INTO v_parked FROM parked;

  INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id,
                         school_id, after)
  VALUES ('platform_user', p_platform_user_id, 'school.unverified', 'school',
          p_school_id, p_school_id,
          jsonb_build_object('reason', p_reason, 'postings_parked', v_parked));

  RETURN v_parked;
END $$;

COMMIT;
