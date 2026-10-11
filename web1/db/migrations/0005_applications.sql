-- 0005 — applications, the mandatory pipeline, and ranking invariants

BEGIN;

CREATE TABLE applications (
  id                 text PRIMARY KEY,
  teacher_id         text NOT NULL REFERENCES teachers(id)     ON DELETE CASCADE,
  job_posting_id     text NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  -- Denormalised from the posting so every access predicate in 0006/0007 can
  -- answer "which school is this?" without a join. Enforced by trigger below.
  school_id          text NOT NULL REFERENCES schools(id)      ON DELETE CASCADE,

  stage              application_stage NOT NULL DEFAULT 'applied',
  stage_changed_at   timestamptz NOT NULL DEFAULT now(),
  applied_at         timestamptz NOT NULL DEFAULT now(),

  cover_letter_submitted boolean NOT NULL DEFAULT false,
  screening_answers  jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Rule 3: shortlists are invisible to candidates. Enforced in the API layer
  -- and by never exposing these two columns on a teacher-facing serializer.
  shortlisted        boolean NOT NULL DEFAULT false,
  shortlisted_by_id  text REFERENCES school_users(id),
  internal_notes     text,

  school_owes_response boolean NOT NULL DEFAULT false,
  feedback_sent_at   timestamptz,
  rejection_reason   text,
  withdrawn_reason   text,

  -- Ranking. A score and a note for ALL catalog criteria, so reordering and
  -- swapping recompute client-side with no server round trip.
  criterion_scores   jsonb NOT NULL DEFAULT '{}'::jsonb,
  criterion_notes    jsonb NOT NULL DEFAULT '{}'::jsonb,
  rankable           boolean NOT NULL DEFAULT true,
  not_rankable_reason text,
  ai_rank_score      int CHECK (ai_rank_score BETWEEN 0 AND 100),

  -- Gate timestamps. Events, not derived booleans: once opened they stay
  -- open, so a later rejection never retroactively invalidates a stored
  -- message or a logged document read. See 0006 and 0007.
  messaging_unlocked_at timestamptz,
  docs_unlocked_at      timestamptz,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (teacher_id, job_posting_id),

  -- Rule 6: below the threshold there is no score at all, and never a zero.
  CONSTRAINT rankable_has_score CHECK (
    (rankable IS TRUE  AND ai_rank_score IS NOT NULL AND not_rankable_reason IS NULL) OR
    (rankable IS FALSE AND ai_rank_score IS NULL     AND not_rankable_reason IS NOT NULL)
  ),
  CONSTRAINT terminal_stage_has_reason CHECK (
    (stage <> 'rejected'  OR rejection_reason IS NOT NULL) AND
    (stage <> 'withdrawn' OR withdrawn_reason IS NOT NULL)
  )
);

CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ON applications (job_posting_id, stage);
CREATE INDEX ON applications (school_id, stage) WHERE stage NOT IN ('rejected','withdrawn');
CREATE INDEX ON applications (teacher_id);
CREATE INDEX ON applications (school_id) WHERE school_owes_response IS TRUE;
CREATE INDEX ON applications (job_posting_id, ai_rank_score DESC NULLS LAST) WHERE rankable IS TRUE;

-- Rule 5: the pipeline is the source of truth, so every move is recorded.
CREATE TABLE application_stage_history (
  id             bigserial PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  stage          application_stage NOT NULL,
  at             timestamptz NOT NULL DEFAULT now(),
  changed_by_id  text REFERENCES school_users(id),
  note           text
);

CREATE INDEX ON application_stage_history (application_id, at);

-- Legal transitions. Anything not listed here is refused, which is what
-- "stage transitions are mandatory" has to mean at the data layer.
CREATE FUNCTION stage_transition_allowed(from_s application_stage, to_s application_stage)
  RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN from_s = to_s THEN true
    WHEN stage_is_terminal(from_s) THEN false          -- terminal is terminal
    WHEN to_s IN ('rejected','withdrawn') THEN true    -- may leave at any point
    ELSE stage_rank(to_s) = stage_rank(from_s) + 1     -- otherwise one step forward
  END $$;

CREATE FUNCTION applications_pipeline() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE posting job_postings%ROWTYPE;
BEGIN
  SELECT * INTO posting FROM job_postings WHERE id = NEW.job_posting_id;

  IF NEW.school_id IS DISTINCT FROM posting.school_id THEN
    NEW.school_id := posting.school_id;                -- never trust the caller
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF NOT stage_transition_allowed(OLD.stage, NEW.stage) THEN
      RAISE EXCEPTION 'application %: illegal stage transition % -> %',
        NEW.id, OLD.stage, NEW.stage;
    END IF;
    NEW.stage_changed_at := now();
  END IF;

  -- Gates latch open the first time the application reaches the stage that
  -- opens them, and are never cleared.
  IF NEW.docs_unlocked_at IS NULL AND stage_rank(NEW.stage) >= stage_rank('screening') THEN
    NEW.docs_unlocked_at := now();
  END IF;
  IF NEW.messaging_unlocked_at IS NULL
     AND stage_rank(NEW.stage) >= stage_rank(messaging_min_stage_for(posting.school_id)) THEN
    NEW.messaging_unlocked_at := now();
  END IF;

  RETURN NEW;
END $$;

CREATE FUNCTION applications_record_stage() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO application_stage_history (application_id, stage, at)
    VALUES (NEW.id, NEW.stage, NEW.stage_changed_at);
  END IF;

  UPDATE job_postings p
     SET application_count = (SELECT count(*) FROM applications a WHERE a.job_posting_id = p.id),
         hired_count       = (SELECT count(*) FROM applications a
                              WHERE a.job_posting_id = p.id AND a.stage = 'hired')
   WHERE p.id = NEW.job_posting_id;

  RETURN NULL;
END $$;

COMMIT;
