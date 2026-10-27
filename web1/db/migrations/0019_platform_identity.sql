-- 0019 — the founders can sign in
--
-- `platform_users` arrived in 0014 as the actor the document rule needed: a
-- row to hold accountable when a founder reads somebody's passport. It was
-- never an account. There is no `auth_user_id` on it and `actor_for_identity`
-- does not mention it, so a founder who signs in resolves to nothing and the
-- product treats them as a stranger who never finished signing up.
--
-- This closes that, and makes the staff list an ALLOWLIST rather than a
-- signup: a row is created from the command line (`npm run admin`) before
-- anybody can claim it, and signing in with that address binds the identity
-- to the row. Nobody grants themselves platform access by typing an email
-- into a form, because there is no form.
--
-- Decision 9 still holds and now covers three tables instead of two: one
-- identity is exactly one actor. A founder who also wants to test the product
-- as a school or a candidate uses a different address for each, which is what
-- they would have to do anyway to see what those people see.

BEGIN;

ALTER TABLE platform_users
  ADD COLUMN auth_user_id text UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  ALTER COLUMN id SET DEFAULT 'plt_' || replace(gen_random_uuid()::text, '-', '');

-- ---------------------------------------------------------------------------
-- One identity, one actor — across all three tables now
-- ---------------------------------------------------------------------------

-- Replaces 0015's version, which compared against exactly one other table.
CREATE OR REPLACE FUNCTION identity_binds_to_one_actor() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE others text[] := array_remove(
          ARRAY['candidates', 'school_users', 'platform_users'], TG_TABLE_NAME);
        other  text;
        clash  text;
BEGIN
  FOREACH other IN ARRAY others LOOP
    IF NEW.auth_user_id IS NOT NULL THEN
      EXECUTE format(
        'SELECT id FROM %I WHERE auth_user_id = $1 AND deleted_at IS NULL LIMIT 1',
        other) INTO clash USING NEW.auth_user_id;
      IF clash IS NOT NULL THEN
        RAISE EXCEPTION
          'identity % already acts as %.% — one person is one actor, so a second role needs a separate account and a separate email',
          NEW.auth_user_id, other, clash;
      END IF;
    END IF;

    IF NEW.email IS NOT NULL THEN
      EXECUTE format(
        'SELECT id FROM %I WHERE lower(email) = lower($1) AND deleted_at IS NULL LIMIT 1',
        other) INTO clash USING NEW.email;
      IF clash IS NOT NULL THEN
        RAISE EXCEPTION
          '% is already the email of %.% — use a different address for this account',
          NEW.email, other, clash;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END $$;

CREATE TRIGGER platform_users_identity_binds_to_one_actor
  BEFORE INSERT OR UPDATE OF auth_user_id, email ON platform_users
  FOR EACH ROW EXECUTE FUNCTION identity_binds_to_one_actor();

-- ---------------------------------------------------------------------------
-- Claiming a seat
-- ---------------------------------------------------------------------------

/**
 * Called once, when somebody signs in and resolves to no actor. If their
 * proved address is on the staff list and nobody has claimed that row, it
 * becomes theirs.
 *
 * Binding by email is safe here and nowhere else: the row was typed by a
 * founder at a command line with a database URL in their hand, so the address
 * is an allowlist entry rather than a claim. Returns the platform_users id it
 * bound, or NULL when the address is not on the list — which is the ordinary
 * case for everybody else signing in.
 */
CREATE FUNCTION claim_platform_seat(p_auth_user_id text, p_email text)
  RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_id text;
BEGIN
  UPDATE platform_users
     SET auth_user_id = p_auth_user_id
   WHERE lower(email) = lower(p_email)
     AND auth_user_id IS NULL
     AND deleted_at IS NULL
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, after)
    VALUES ('platform_user', v_id, 'platform_user.seat_claimed', 'platform_user', v_id,
            jsonb_build_object('auth_user_id', p_auth_user_id));
  END IF;

  RETURN v_id;
END $$;

-- ---------------------------------------------------------------------------
-- Resolution
-- ---------------------------------------------------------------------------

-- Same columns as 0015, one more branch. `school_id` stays null for staff:
-- a founder belongs to the platform, not to a school, and the places that
-- scope a query by school must not accidentally scope one for them.
CREATE OR REPLACE VIEW actor_for_identity AS
SELECT auth_user_id, 'candidate'::text AS actor_type, id AS actor_id, NULL::text AS school_id
FROM   candidates     WHERE auth_user_id IS NOT NULL AND deleted_at IS NULL
UNION ALL
SELECT auth_user_id, 'school_user'::text, id, school_id
FROM   school_users   WHERE auth_user_id IS NOT NULL AND deleted_at IS NULL
UNION ALL
SELECT auth_user_id, 'platform_user'::text, id, NULL::text
FROM   platform_users WHERE auth_user_id IS NOT NULL AND deleted_at IS NULL;

-- What the admin screens count. A view rather than four queries, so the
-- numbers on the page and the lists behind them cannot disagree.
CREATE VIEW platform_queue AS
SELECT
  (SELECT count(*) FROM schools
   WHERE verification_status <> 'verified' AND deleted_at IS NULL)        AS schools_pending,
  (SELECT count(*) FROM school_users
   WHERE verified_at IS NULL AND deleted_at IS NULL)                     AS school_users_pending,
  (SELECT count(*) FROM school_email_domains
   WHERE verified_at IS NULL)                                            AS domains_claimed,
  (SELECT count(*) FROM job_postings
   WHERE status = 'posted' AND deleted_at IS NULL)                       AS postings_live,
  (SELECT count(*) FROM candidates WHERE deleted_at IS NULL)             AS candidates_total;

COMMIT;
