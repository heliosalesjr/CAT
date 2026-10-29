-- 0020 — the three things a founder does by hand
--
-- Verifying a school, confirming one of its users, and proving a domain. Until
-- now all three were UPDATE statements somebody typed, which is fine for a
-- week of testing and not fine after that: each one hands out access to real
-- people's documents, and none of them left a trace.
--
-- They are functions rather than plain updates for the same reason
-- `school_user_has()` is a function: the rule about who may do it has to live
-- where it cannot be skipped. Every one of these checks
-- `platform_user_is_active()` first, so a removed founder cannot verify
-- anything even if an old session or a stale page still shows them the button.
-- And every one writes to `audit_log`, which 0014 made append-only.
--
-- What they deliberately do NOT do is decide anything. Whether this school is
-- real, whether this person works there — that judgement is a human reading a
-- phone number and a website, and no amount of schema replaces it.

BEGIN;

CREATE FUNCTION platform_assert_staff(p_platform_user_id text) RETURNS void
  LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT platform_user_is_active(p_platform_user_id) THEN
    RAISE EXCEPTION 'platform user % is not active', p_platform_user_id;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- A school becomes real
-- ---------------------------------------------------------------------------

/**
 * Marks a school verified, which is what lets its postings go live.
 *
 * Does not touch its users: somebody who registered a school still has to be
 * confirmed as working there, and the two are separate questions on purpose.
 * A school can be a real institution while the person who signed it up is not
 * who they say they are.
 */
CREATE FUNCTION platform_verify_school(p_platform_user_id text, p_school_id text)
  RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_before text;
BEGIN
  PERFORM platform_assert_staff(p_platform_user_id);

  SELECT verification_status INTO v_before
  FROM   schools WHERE id = p_school_id AND deleted_at IS NULL;

  IF v_before IS NULL THEN
    RAISE EXCEPTION 'no such school: %', p_school_id;
  END IF;
  IF v_before = 'verified' THEN
    RAISE EXCEPTION 'school % is already verified', p_school_id;
  END IF;

  UPDATE schools
     SET verification_status = 'verified', verified_at = now()
   WHERE id = p_school_id;

  INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id,
                         school_id, before, after)
  VALUES ('platform_user', p_platform_user_id, 'school.verified', 'school',
          p_school_id, p_school_id,
          jsonb_build_object('verification_status', v_before),
          jsonb_build_object('verification_status', 'verified'));

  RETURN p_school_id;
END $$;

/**
 * Sends a school back to pending — the undo, and the lever for a school that
 * turns out not to be what it claimed. Its postings stop being live-able and
 * its users keep their permissions, because those are a separate decision.
 */
CREATE FUNCTION platform_unverify_school(
    p_platform_user_id text, p_school_id text, p_reason text)
  RETURNS text LANGUAGE plpgsql AS $$
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

  INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id,
                         school_id, after)
  VALUES ('platform_user', p_platform_user_id, 'school.unverified', 'school',
          p_school_id, p_school_id, jsonb_build_object('reason', p_reason));

  RETURN p_school_id;
END $$;

-- ---------------------------------------------------------------------------
-- A person is who they say they are
-- ---------------------------------------------------------------------------

/**
 * Confirms a school user by hand, which is what turns their role template into
 * actual permissions — decision 8's third layer resolves them to nothing until
 * this runs.
 *
 * `verification_method` records that a human did it, not a domain, so the
 * difference between "their email proved it" and "somebody decided" stays
 * legible a year from now.
 */
CREATE FUNCTION platform_confirm_school_user(
    p_platform_user_id text, p_school_user_id text)
  RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_school text;
BEGIN
  PERFORM platform_assert_staff(p_platform_user_id);

  SELECT school_id INTO v_school
  FROM   school_users
  WHERE  id = p_school_user_id AND deleted_at IS NULL AND verified_at IS NULL;

  IF v_school IS NULL THEN
    RAISE EXCEPTION 'no such unconfirmed school user: %', p_school_user_id;
  END IF;

  UPDATE school_users
     SET verified_at = now(),
         verification_method = 'manual',
         verified_by_id = p_platform_user_id
   WHERE id = p_school_user_id;

  INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id,
                         school_id, after)
  VALUES ('platform_user', p_platform_user_id, 'school_user.confirmed',
          'school_user', p_school_user_id, v_school,
          jsonb_build_object('method', 'manual'));

  RETURN p_school_user_id;
END $$;

-- ---------------------------------------------------------------------------
-- A domain stops being a claim
-- ---------------------------------------------------------------------------

/**
 * Proving a domain is the highest-leverage of the three and the easiest to get
 * wrong: from this moment, anybody with an address on it walks into the school
 * verified, with no human in the loop. That is the whole point of decision 8,
 * and it means the check being done here is "do we believe this domain belongs
 * to this institution", not "does this one person work there".
 *
 * The trigger from 0016 still refuses a public provider, so gmail.com cannot
 * reach this function's UPDATE at all.
 */
CREATE FUNCTION platform_prove_domain(
    p_platform_user_id text, p_school_id text, p_domain text)
  RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_domain text := lower(btrim(p_domain));
BEGIN
  PERFORM platform_assert_staff(p_platform_user_id);

  UPDATE school_email_domains
     SET verified_at = now(), verified_by_id = p_platform_user_id
   WHERE school_id = p_school_id AND domain = v_domain AND verified_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no unproved domain % claimed by school %', v_domain, p_school_id;
  END IF;

  INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id,
                         school_id, after)
  VALUES ('platform_user', p_platform_user_id, 'school_domain.proved',
          'school_email_domain', p_school_id || ':' || v_domain, p_school_id,
          jsonb_build_object('domain', v_domain));

  RETURN v_domain;
END $$;

-- ---------------------------------------------------------------------------
-- What the queue screens read
-- ---------------------------------------------------------------------------

-- Everything a person needs to judge a school without opening four tabs: who
-- registered it, how to reach it, and what it claims as its domain.
CREATE VIEW platform_pending_schools AS
SELECT s.id              AS school_id,
       s.name,
       s.city,
       s.country,
       s.website,
       s.phone,
       s.address_line,
       s.student_count,
       s.created_at,
       (SELECT btrim(concat_ws(' ', u.first_name, u.last_name))
        FROM   school_users u
        WHERE  u.school_id = s.id AND u.deleted_at IS NULL
        ORDER  BY u.created_at LIMIT 1)                     AS registered_by,
       (SELECT u.email FROM school_users u
        WHERE  u.school_id = s.id AND u.deleted_at IS NULL
        ORDER  BY u.created_at LIMIT 1)                     AS registered_by_email,
       (SELECT count(*)::int FROM school_users u
        WHERE  u.school_id = s.id AND u.deleted_at IS NULL) AS users_total,
       (SELECT array_agg(d.domain ORDER BY d.domain)
        FROM   school_email_domains d
        WHERE  d.school_id = s.id AND d.verified_at IS NULL) AS domains_claimed
FROM   schools s
WHERE  s.verification_status <> 'verified' AND s.deleted_at IS NULL;

-- And for a person: whether their own address already matches something the
-- school has proved. When it does, the honest answer is usually that they
-- should not have ended up in this queue at all.
CREATE VIEW platform_pending_school_users AS
SELECT u.id            AS school_user_id,
       u.school_id,
       s.name          AS school_name,
       s.verification_status AS school_status,
       btrim(concat_ws(' ', u.first_name, u.last_name)) AS name,
       u.email,
       u.title,
       u.role,
       u.created_at,
       email_domain(u.email) AS email_domain,
       EXISTS (SELECT 1 FROM school_email_domains d
               WHERE d.school_id = u.school_id
                 AND d.domain = email_domain(u.email)
                 AND d.verified_at IS NOT NULL)            AS domain_proved,
       EXISTS (SELECT 1 FROM school_email_domains d
               WHERE d.school_id = u.school_id
                 AND d.domain = email_domain(u.email)
                 AND d.verified_at IS NULL)                AS domain_claimed_only
FROM   school_users u
JOIN   schools s ON s.id = u.school_id
WHERE  u.verified_at IS NULL AND u.deleted_at IS NULL;

CREATE VIEW platform_claimed_domains AS
SELECT d.school_id,
       s.name AS school_name,
       s.verification_status AS school_status,
       d.domain,
       d.created_at,
       (SELECT count(*)::int FROM school_users u
        WHERE u.school_id = d.school_id
          AND email_domain(u.email) = d.domain
          AND u.deleted_at IS NULL)                        AS users_on_domain
FROM   school_email_domains d
JOIN   schools s ON s.id = d.school_id AND s.deleted_at IS NULL
WHERE  d.verified_at IS NULL;

COMMIT;
