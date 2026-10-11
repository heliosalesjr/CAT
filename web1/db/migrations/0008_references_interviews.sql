-- 0008 — references and interviews

BEGIN;

CREATE TABLE references_ (            -- REFERENCES is reserved in SQL
  id            text PRIMARY KEY,
  candidate_id    text NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  referee_name  text NOT NULL,
  referee_email text NOT NULL,
  referee_title text,
  referee_school text,
  relationship  reference_relationship NOT NULL,
  status        reference_status NOT NULL DEFAULT 'requested',
  -- Phase 1 stores these; it does not verify. Phase 2 fills the method in.
  verification_method    text,
  email_domain_matches_school boolean,
  overall_rating int CHECK (overall_rating BETWEEN 1 AND 5),
  note          text,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (responded_at IS NULL OR responded_at >= requested_at)
);

CREATE TRIGGER references_updated_at BEFORE UPDATE ON references_
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ON references_ (candidate_id, status);

-- Derived: the mock's daysWaiting was computed on its generation date.
CREATE VIEW references_with_waiting AS
SELECT r.*,
       CASE WHEN r.responded_at IS NOT NULL THEN NULL
            ELSE EXTRACT(day FROM now() - r.requested_at)::int END AS days_waiting
FROM   references_ r;

CREATE FUNCTION references_refresh_counts() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE t text := COALESCE(NEW.candidate_id, OLD.candidate_id);
BEGIN
  UPDATE candidates SET verified_supervisor_references = (
    SELECT count(*) FROM references_ r
    WHERE r.candidate_id = t AND r.status = 'verified'
      AND r.relationship IN ('direct_supervisor','head_of_school','department_head'))
  WHERE id = t;
  RETURN NULL;
END $$;

CREATE TRIGGER references_refresh_counts
  AFTER INSERT OR UPDATE OF status, relationship OR DELETE ON references_
  FOR EACH ROW EXECUTE FUNCTION references_refresh_counts();

CREATE TABLE interviews (
  id              text PRIMARY KEY,
  application_id  text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id      text NOT NULL REFERENCES candidates(id),
  school_id       text NOT NULL REFERENCES schools(id),
  round_name      text,
  status          interview_status NOT NULL DEFAULT 'proposed',
  -- Stored in UTC with both parties' zones alongside, because the dashboards
  -- must render school-local AND candidate-local on the same row without
  -- guessing which zone a wall-clock time belonged to.
  starts_at_utc   timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
  school_timezone  text NOT NULL,
  candidate_timezone text NOT NULL,
  meeting_url     text,
  google_calendar_event_id text,
  interviewer_ids text[] NOT NULL DEFAULT '{}',
  structured_feedback jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER interviews_updated_at BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ON interviews (school_id, starts_at_utc);
CREATE INDEX ON interviews (application_id);
-- Feeds the "feedback never submitted" tile (int_0005 in the mock).
CREATE INDEX ON interviews (school_id, starts_at_utc)
  WHERE status = 'completed' AND structured_feedback IS NULL;

COMMIT;
