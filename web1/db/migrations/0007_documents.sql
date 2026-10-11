-- 0007 — sensitive document isolation and the audit trail
--
-- Nothing in the mock scoped document access: `view_documents` is a user
-- permission, and documents carry only a candidate id. Taken literally that lets
-- any holder of the permission read any of the 136 candidates' passports.
--
-- The rule, decided: a school user may read a candidate's documents only when
--   (a) the user holds view_documents, AND
--   (b) that candidate has an application to the user's school, AND
--   (c) that application has reached screening (docs_unlocked_at latched).
-- Every read is logged. Storage keys are never returned to a client; the API
-- mints a short-lived signed URL and writes a log row in the same request.

BEGIN;

CREATE TABLE documents (
  id              text PRIMARY KEY,
  candidate_id      text NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  type            document_type NOT NULL,
  status          document_status NOT NULL DEFAULT 'missing',
  file_name       text,
  file_size_kb    int CHECK (file_size_kb >= 0),
  -- Object key inside the restricted bucket. Every document in the mock lives
  -- under sensitive/, so there is no second, laxer class: one bucket, locked
  -- IAM, signed URLs only. Never exposed to a browser.
  storage_key     text,
  uploaded_at     timestamptz,
  verified_at     timestamptz,
  expires_on      date,
  rejection_reason text,
  -- Phase 1 stores a manual flag only; no provider integration.
  background_check_status text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,

  UNIQUE (candidate_id, type),
  CONSTRAINT present_documents_have_a_file CHECK (
    (status = 'missing' AND storage_key IS NULL) OR
    (status <> 'missing' AND storage_key IS NOT NULL)
  ),
  CONSTRAINT rejected_documents_say_why CHECK (
    status <> 'rejected' OR rejection_reason IS NOT NULL
  ),
  CONSTRAINT storage_key_is_in_the_restricted_prefix CHECK (
    storage_key IS NULL OR storage_key LIKE 'sensitive/%'
  )
);

CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ON documents (candidate_id) WHERE deleted_at IS NULL;
CREATE INDEX ON documents (expires_on) WHERE expires_on IS NOT NULL AND deleted_at IS NULL;

-- Derived at read time rather than stored: the mock's daysUntilExpiry was
-- generated on 2026-10-10 and is wrong on any other day.
CREATE VIEW documents_with_expiry AS
SELECT d.*,
       CASE WHEN d.expires_on IS NULL THEN NULL
            ELSE (d.expires_on - CURRENT_DATE) END AS days_until_expiry
FROM   documents d;

-- (b) + (c): is this candidate's paperwork in scope for this school at all?
CREATE FUNCTION documents_unlocked_for(p_candidate_id text, p_school_id text)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.candidate_id = p_candidate_id
      AND a.school_id  = p_school_id
      AND a.docs_unlocked_at IS NOT NULL) $$;

-- The whole rule in one place. Any code path that reaches a storage_key must
-- call this first.
CREATE FUNCTION may_read_document(p_user_id text, p_document_id text)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT school_user_has(p_user_id, 'view_documents')
     AND EXISTS (
       SELECT 1
       FROM   documents d
       JOIN   school_users u ON u.id = p_user_id AND u.deleted_at IS NULL
       WHERE  d.id = p_document_id
         AND  d.deleted_at IS NULL
         AND  documents_unlocked_for(d.candidate_id, u.school_id)) $$;

-- Non-negotiable in CLAUDE.md: who viewed whose sensitive documents.
-- Append-only; see the revoke in 0011.
CREATE TABLE document_access_log (
  id             bigserial PRIMARY KEY,
  document_id    text NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  candidate_id     text NOT NULL REFERENCES candidates(id)  ON DELETE RESTRICT,
  school_user_id text NOT NULL REFERENCES school_users(id) ON DELETE RESTRICT,
  school_id      text NOT NULL REFERENCES schools(id)   ON DELETE RESTRICT,
  application_id text REFERENCES applications(id) ON DELETE SET NULL,
  action         text NOT NULL DEFAULT 'signed_url_issued',
  signed_url_expires_at timestamptz,
  ip             inet,
  user_agent     text,
  at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON document_access_log (candidate_id, at DESC);
CREATE INDEX ON document_access_log (document_id, at DESC);
CREATE INDEX ON document_access_log (school_user_id, at DESC);

-- Refuse to log an access the rule would not have allowed. Cheap, and it
-- turns the log from a record of intent into a record of policy.
CREATE FUNCTION document_access_log_verify() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NOT may_read_document(NEW.school_user_id, NEW.document_id) THEN
    RAISE EXCEPTION 'user % may not read document %', NEW.school_user_id, NEW.document_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER document_access_log_verify BEFORE INSERT ON document_access_log
  FOR EACH ROW EXECUTE FUNCTION document_access_log_verify();

-- Keeps candidates.documents_total / documents_verified honest.
CREATE FUNCTION documents_refresh_counts() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE t text := COALESCE(NEW.candidate_id, OLD.candidate_id);
BEGIN
  UPDATE candidates SET
    documents_total    = (SELECT count(*) FROM documents d
                          WHERE d.candidate_id = t AND d.deleted_at IS NULL
                            AND d.status <> 'missing'),
    documents_verified = (SELECT count(*) FROM documents d
                          WHERE d.candidate_id = t AND d.deleted_at IS NULL
                            AND d.status = 'verified')
  WHERE id = t;
  RETURN NULL;
END $$;

CREATE TRIGGER documents_refresh_counts
  AFTER INSERT OR UPDATE OF status, deleted_at OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_refresh_counts();

COMMIT;
