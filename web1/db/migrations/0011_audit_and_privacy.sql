-- 0011 — audit log, data export, account deletion
--
-- None of these exist in the mock. All three are listed as non-negotiable in
-- CLAUDE.md, and they are the expensive kind to retrofit, so they go in with
-- the first migration set rather than later.

BEGIN;

-- Broader than document_access_log, which stays separate because it is the
-- one with a legal reading and a verification trigger.
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  actor_type  text NOT NULL CHECK (actor_type IN ('candidate','school_user','system')),
  actor_id    text,
  action      text NOT NULL,            -- 'application.stage_changed', ...
  entity_type text NOT NULL,
  entity_id   text NOT NULL,
  school_id   text REFERENCES schools(id) ON DELETE SET NULL,
  before      jsonb,
  after       jsonb,
  ip          inet,
  at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON audit_log (entity_type, entity_id, at DESC);
CREATE INDEX ON audit_log (actor_type, actor_id, at DESC);
CREATE INDEX ON audit_log (school_id, at DESC);

-- Ranking criteria changes are audited by name because the posting keeps only
-- the immediately previous ordering, and a candidate who can see their rank
-- would have to be told the basis changed.
CREATE FUNCTION job_postings_audit_criteria() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ranking_criteria IS DISTINCT FROM OLD.ranking_criteria THEN
    NEW.previous_ranking_criteria := OLD.ranking_criteria;
    NEW.ranking_criteria_updated_at := now();
    INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id,
                           school_id, before, after)
    VALUES ('school_user', NEW.ranking_criteria_updated_by_id,
            'job_posting.ranking_criteria_changed', 'job_posting', NEW.id, NEW.school_id,
            to_jsonb(OLD.ranking_criteria), to_jsonb(NEW.ranking_criteria));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER job_postings_audit_criteria
  BEFORE UPDATE OF ranking_criteria ON job_postings
  FOR EACH ROW EXECUTE FUNCTION job_postings_audit_criteria();

CREATE TABLE data_export_requests (
  id            bigserial PRIMARY KEY,
  subject_type  text NOT NULL CHECK (subject_type IN ('candidate','school_user')),
  subject_id    text NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','running','ready','failed','expired')),
  requested_at  timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  storage_key   text,                   -- restricted bucket, signed URL only
  expires_at    timestamptz,
  error         text
);

CREATE INDEX ON data_export_requests (subject_type, subject_id, requested_at DESC);

CREATE TABLE deletion_requests (
  id            bigserial PRIMARY KEY,
  subject_type  text NOT NULL CHECK (subject_type IN ('candidate','school_user','school')),
  subject_id    text NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','grace_period','anonymising','done','cancelled')),
  reason        text,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  -- Grace window before anything is destroyed, so a mis-click is recoverable.
  executes_at   timestamptz NOT NULL DEFAULT now() + interval '30 days',
  completed_at  timestamptz
);

CREATE INDEX ON deletion_requests (status, executes_at);
CREATE UNIQUE INDEX ON deletion_requests (subject_type, subject_id)
  WHERE status IN ('pending','grace_period','anonymising');

-- Deleting a candidate must not erase the record that someone read their
-- passport: the log keeps ON DELETE RESTRICT, and deletion anonymises the
-- subject instead. This marks the log rows so a later export can prove the
-- trail was preserved, not quietly dropped.
ALTER TABLE document_access_log ADD COLUMN subject_anonymised_at timestamptz;

COMMIT;
