-- 0015 — identity: who is logged in, and which actor that makes them
--
-- Decided 2026-10-21 (see DECISIONS.md, decisions 7-9):
--
--   B. Magic link by email for BOTH sides first; LinkedIn for candidates
--      later. The adapter tables below are the same whichever providers are
--      enabled, so adding LinkedIn later is a provider entry in the Auth.js
--      config and NOT a migration.
--
--   C. One person is one actor. A school user who wants a job creates a
--      SEPARATE candidate account, with a separate email. That is enforced
--      here rather than left to the signup screen — and it is a kindness as
--      much as a rule: a head of school job-hunting does not want it tied to
--      their work address.
--
-- With magic link, the email IS the identity. So `candidates` finally gets
-- an email column (it had none — a candidate was `tch_0001` and nothing a
-- human could log in as), unique and case-insensitive like school_users'.

BEGIN;

-- ===========================================================================
-- These four tables belong to Auth.js (@auth/pg-adapter 1.11), not to us.
-- Their names and columns are the library's contract, copied from the
-- statements in node_modules/@auth/pg-adapter/src/index.ts — which is why
-- they carry quoted camelCase columns against this schema's own rule in 0001.
-- Four tables of quoted identifiers is cheaper than maintaining a fork of
-- the adapter. Do not rename anything in this section; do not reference
-- these tables from application queries — go through Auth.js.
-- ===========================================================================

CREATE TABLE users (
  -- The adapter inserts without an id and reads it back, so the default is
  -- load-bearing. text, not uuid, because every foreign key in this schema
  -- is text and these ids are about to become one.
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            text,
  email           text,
  "emailVerified" timestamptz,
  image           text
);

CREATE UNIQUE INDEX ON users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE accounts (
  id                  bigserial PRIMARY KEY,
  "userId"            text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                text NOT NULL,
  provider            text NOT NULL,
  "providerAccountId" text NOT NULL,
  access_token        text,
  expires_at          bigint,
  refresh_token       text,
  id_token            text,
  scope               text,
  session_state       text,
  token_type          text,
  UNIQUE (provider, "providerAccountId")
);

CREATE INDEX ON accounts ("userId");

CREATE TABLE sessions (
  id             bigserial PRIMARY KEY,
  "userId"       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires        timestamptz NOT NULL,
  "sessionToken" text NOT NULL UNIQUE
);

CREATE INDEX ON sessions ("userId");

CREATE TABLE verification_token (
  identifier text NOT NULL,
  expires    timestamptz NOT NULL,
  token      text NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ===========================================================================
-- Ours again from here.
-- ===========================================================================

ALTER TABLE candidates ADD COLUMN email text;

-- Nullable, because the 136 profiles in the bundle predate the question and
-- carry no email. The consequence is exact and worth saying: a candidate
-- without an email cannot log in. The seeded ones are demo data, and inventing
-- addresses for them would put fake contact details in a table whose whole
-- purpose is contacting people.
CREATE UNIQUE INDEX ON candidates (lower(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL;

-- Signup needs an id nobody hand-writes. The bundle's `tch_0001` style stays
-- valid; new rows get one of these. (school_users gets the same in 0016, and
-- schools too, for a school somebody registers from the form.)
ALTER TABLE candidates
  ALTER COLUMN id SET DEFAULT 'cnd_' || replace(gen_random_uuid()::text, '-', '');

ALTER TABLE candidates
  ADD COLUMN auth_user_id text UNIQUE REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE school_users
  ADD COLUMN auth_user_id text UNIQUE REFERENCES users(id) ON DELETE SET NULL;

-- Decision C, in the only place that cannot be bypassed. A cross-table rule
-- cannot be a unique index, so it is a trigger on both tables. It checks the
-- identity AND the email: catching the clash at signup gives a sentence the
-- person can act on, where catching it at login gives them a dead end.
CREATE FUNCTION identity_binds_to_one_actor() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE other_table text := CASE TG_TABLE_NAME
                              WHEN 'candidates' THEN 'school_users'
                              ELSE 'candidates' END;
        clash text;
BEGIN
  IF NEW.auth_user_id IS NOT NULL THEN
    EXECUTE format(
      'SELECT id FROM %I WHERE auth_user_id = $1 AND deleted_at IS NULL LIMIT 1',
      other_table) INTO clash USING NEW.auth_user_id;
    IF clash IS NOT NULL THEN
      RAISE EXCEPTION
        'identity % already acts as %.% — one person is one actor, so a second role needs a separate account and a separate email',
        NEW.auth_user_id, other_table, clash;
    END IF;
  END IF;

  IF NEW.email IS NOT NULL THEN
    EXECUTE format(
      'SELECT id FROM %I WHERE lower(email) = lower($1) AND deleted_at IS NULL LIMIT 1',
      other_table) INTO clash USING NEW.email;
    IF clash IS NOT NULL THEN
      RAISE EXCEPTION
        '% is already the email of %.% — use a different address for this account',
        NEW.email, other_table, clash;
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER candidates_identity_binds_to_one_actor
  BEFORE INSERT OR UPDATE OF auth_user_id, email ON candidates
  FOR EACH ROW EXECUTE FUNCTION identity_binds_to_one_actor();

CREATE TRIGGER school_users_identity_binds_to_one_actor
  BEFORE INSERT OR UPDATE OF auth_user_id, email ON school_users
  FOR EACH ROW EXECUTE FUNCTION identity_binds_to_one_actor();

-- The question every request asks after reading the session: who is this?
-- Returns at most one row by construction, which is decision C restated.
CREATE VIEW actor_for_identity AS
SELECT auth_user_id, 'candidate'::text AS actor_type, id AS actor_id, NULL::text AS school_id
FROM   candidates   WHERE auth_user_id IS NOT NULL AND deleted_at IS NULL
UNION ALL
SELECT auth_user_id, 'school_user'::text, id, school_id
FROM   school_users WHERE auth_user_id IS NOT NULL AND deleted_at IS NULL;

COMMIT;
