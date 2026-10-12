-- 0014 — platform staff, and a log nobody can quietly edit
--
-- Settles the sixth actor decision (db/DECISIONS.md, 2026-10-12):
--
--   6. What can the two of you see?
--      EVERYTHING, AND EVERY LOOK IS LOGGED LIKE ANYONE ELSE'S. The schema
--      had no platform-staff actor at all, so 0007's rule — hold
--      view_documents, the candidate applied to your school, the application
--      reached screening — had no answer for a founder doing support, and the
--      honest outcome of that is someone reading rows out of the database
--      with no trace. A logged superuser is weaker than break-glass and far
--      stronger than an untracked psql session.
--
-- The option was chosen on the condition that the log cannot be quietly
-- edited, so that is enforced here rather than promised: document_access_log
-- and audit_log refuse UPDATE and DELETE outright, except the one UPDATE
-- 0011's deletion flow needs — stamping subject_anonymised_at, and clearing
-- the requester's ip and user agent with it. TRUNCATE is not a row operation
-- and still works, which is what keeps db:reset usable on a scratch branch.

BEGIN;

CREATE TYPE platform_user_role AS ENUM ('owner', 'staff');

CREATE TABLE platform_users (
  id         text PRIMARY KEY,
  email      text NOT NULL,
  first_name text,
  last_name  text,
  title      text,
  role       platform_user_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX ON platform_users (lower(email)) WHERE deleted_at IS NULL;

CREATE TRIGGER platform_users_updated_at BEFORE UPDATE ON platform_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE FUNCTION platform_user_is_active(p_platform_user_id text)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM platform_users
                 WHERE id = p_platform_user_id AND deleted_at IS NULL) $$;

-- The platform-side counterpart to may_read_document(). Deliberately broad —
-- that is the decision — and deliberately separate, so no school code path
-- can widen itself by accident, and so a grep for who may read a passport
-- finds two functions and not a disjunction buried in one.
CREATE FUNCTION platform_may_read_document(p_platform_user_id text, p_document_id text)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT platform_user_is_active(p_platform_user_id)
     AND EXISTS (SELECT 1 FROM documents d
                 WHERE d.id = p_document_id AND d.deleted_at IS NULL) $$;

-- ---------------------------------------------------------------------------
-- The log learns a second kind of reader.
-- ---------------------------------------------------------------------------

ALTER TABLE document_access_log
  ALTER COLUMN school_user_id DROP NOT NULL,
  ALTER COLUMN school_id      DROP NOT NULL,
  ADD COLUMN platform_user_id text REFERENCES platform_users(id) ON DELETE RESTRICT;

ALTER TABLE document_access_log
  ADD CONSTRAINT one_reader_per_row CHECK (
    (school_user_id IS NOT NULL AND school_id IS NOT NULL AND platform_user_id IS NULL) OR
    (school_user_id IS NULL     AND school_id IS NULL     AND platform_user_id IS NOT NULL)
  );

CREATE INDEX ON document_access_log (platform_user_id, at DESC)
  WHERE platform_user_id IS NOT NULL;

-- Replaces 0007's version, which assumed every reader was a school user.
CREATE OR REPLACE FUNCTION document_access_log_verify() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.platform_user_id IS NOT NULL THEN
    IF NOT platform_may_read_document(NEW.platform_user_id, NEW.document_id) THEN
      RAISE EXCEPTION 'platform user % may not read document %',
        NEW.platform_user_id, NEW.document_id;
    END IF;
  ELSIF NOT may_read_document(NEW.school_user_id, NEW.document_id) THEN
    RAISE EXCEPTION 'user % may not read document %', NEW.school_user_id, NEW.document_id;
  END IF;
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- Append-only, enforced.
-- ---------------------------------------------------------------------------

CREATE FUNCTION document_access_log_is_append_only() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'document_access_log rows are never deleted (row %)', OLD.id;
  END IF;

  -- The one permitted edit: 0011's deletion flow anonymising the subject.
  IF OLD.subject_anonymised_at IS NULL
     AND NEW.subject_anonymised_at IS NOT NULL
     AND (to_jsonb(NEW) - 'subject_anonymised_at' - 'ip' - 'user_agent')
       = (to_jsonb(OLD) - 'subject_anonymised_at' - 'ip' - 'user_agent')
     AND (NEW.ip IS NULL OR NEW.ip = OLD.ip)
     AND (NEW.user_agent IS NULL OR NEW.user_agent = OLD.user_agent) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'document_access_log row % may only be updated to anonymise its subject', OLD.id;
END $$;

CREATE TRIGGER document_access_log_is_append_only
  BEFORE UPDATE OR DELETE ON document_access_log
  FOR EACH ROW EXECUTE FUNCTION document_access_log_is_append_only();

-- audit_log needs no exception at all: 0011 anonymises the SUBJECT's own row
-- and keeps the trail pointing at it, so an erasure never rewrites history.
-- If that ever stops being true it is a migration that relaxes this trigger
-- on purpose, which is the only way it should be able to happen.
CREATE FUNCTION audit_log_is_append_only() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only (attempted % on row %)', TG_OP, OLD.id;
END $$;

CREATE TRIGGER audit_log_is_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();

-- ---------------------------------------------------------------------------
-- 'platform_user' is the fifth actor type.
-- ---------------------------------------------------------------------------

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_type_check;
ALTER TABLE audit_log ADD  CONSTRAINT audit_log_actor_type_check
  CHECK (actor_type IN ('candidate', 'school_user', 'system', 'referee', 'platform_user'));

-- What a candidate is entitled to be told, and what the data export carries:
-- every look at their documents, school and platform alike, named the same way.
CREATE VIEW document_access_log_readable AS
SELECT l.id,
       l.candidate_id,
       l.document_id,
       d.type AS document_type,
       CASE WHEN l.platform_user_id IS NOT NULL THEN 'platform_user' ELSE 'school_user' END
         AS reader_type,
       COALESCE(l.platform_user_id, l.school_user_id) AS reader_id,
       COALESCE(
         (SELECT btrim(concat_ws(' ', p.first_name, p.last_name)) FROM platform_users p
          WHERE p.id = l.platform_user_id),
         (SELECT btrim(concat_ws(' ', u.first_name, u.last_name)) FROM school_users u
          WHERE u.id = l.school_user_id)) AS reader_name,
       l.school_id,
       s.name AS school_name,
       l.application_id,
       l.action,
       l.at,
       l.subject_anonymised_at
FROM   document_access_log l
LEFT   JOIN documents d ON d.id = l.document_id
LEFT   JOIN schools   s ON s.id = l.school_id;

COMMIT;
