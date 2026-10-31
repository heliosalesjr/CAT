-- 0022 — applying to a role, and moving somebody through
--
-- Everything the pipeline needs already existed in 0005: one application per
-- candidate per posting, transitions that go one step forward or straight to
-- rejected, gates that latch open and never close. What was missing was the
-- way in and the way along — and one decision nobody could avoid any longer.
--
-- THE DECISION. `rankable_has_score` says an application either carries a
-- score or carries a reason it has none. A new application has neither: the
-- AI has not run, and will not run inside the request that creates it —
-- CLAUDE.md puts ranking behind async jobs, and a candidate should not wait
-- on a model to find out their application was received.
--
-- So an application is born NOT rankable, with a reason, and the ranking job
-- flips it later. Two reasons, and the difference matters to the person
-- reading it:
--
--   profile_incomplete   Rule 6. Below the threshold they are held out of the
--                        ordering entirely, and they can fix it.
--   awaiting_ranking     We have not scored it yet. They can do nothing, and
--                        should be told so rather than left to guess.
--
-- Collapsing the two into one would mean telling somebody to fix a profile
-- that is already fine.

BEGIN;

ALTER TABLE applications
  ALTER COLUMN id SET DEFAULT 'app_' || replace(gen_random_uuid()::text, '-', ''),
  -- Rule 5 says the pipeline is the source of truth. It was recording every
  -- move and not who made it: `application_stage_history.changed_by_id`
  -- existed and the trigger never filled it, because a trigger cannot know
  -- the actor. The mover writes it here and the trigger copies it across.
  ADD COLUMN last_moved_by_id text REFERENCES school_users(id);

ALTER TABLE applications
  ADD CONSTRAINT not_rankable_reason_is_one_of CHECK (
    not_rankable_reason IS NULL
    OR not_rankable_reason IN ('profile_incomplete', 'awaiting_ranking'));

CREATE OR REPLACE FUNCTION applications_record_stage() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO application_stage_history (application_id, stage, at, changed_by_id)
    VALUES (NEW.id, NEW.stage, NEW.stage_changed_at, NEW.last_moved_by_id);
  END IF;

  UPDATE job_postings p
     SET application_count = (SELECT count(*) FROM applications a WHERE a.job_posting_id = p.id),
         hired_count       = (SELECT count(*) FROM applications a
                              WHERE a.job_posting_id = p.id AND a.stage = 'hired')
   WHERE p.id = NEW.job_posting_id;

  RETURN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Can this person apply at all?
-- ---------------------------------------------------------------------------

/**
 * Work-permit exclusions, read the way a work permit actually works.
 *
 * A posting may exclude nationalities because the school cannot get a visa
 * for them. Somebody holding two passports is excluded only if BOTH are — one
 * usable nationality is enough to be hirable, and treating a second passport
 * as irrelevant would turn a permit rule into a nationality bar.
 *
 * Returns true when the candidate is blocked.
 */
CREATE FUNCTION posting_excludes_candidate(p_posting_id text, p_candidate_id text)
  RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE excluded text[];
        held     text[];
BEGIN
  SELECT excluded_nationalities INTO excluded FROM job_postings WHERE id = p_posting_id;
  IF excluded IS NULL OR excluded = '{}' THEN RETURN false; END IF;

  SELECT CASE WHEN c.nationalities <> '{}'     THEN c.nationalities
              WHEN c.nationality IS NOT NULL   THEN ARRAY[c.nationality]
              ELSE '{}'::text[] END
    INTO held
  FROM   candidates c WHERE c.id = p_candidate_id;

  -- A profile that has not said yet is not blocked. Treating silence as a
  -- disqualifying answer would punish an unfinished field.
  IF held IS NULL OR held = '{}' THEN RETURN false; END IF;

  RETURN NOT EXISTS (SELECT 1 FROM unnest(held) h WHERE NOT (h = ANY (excluded)));
END $$;

/**
 * Why this candidate cannot apply, or NULL when they can.
 *
 * A sentence rather than a boolean, because the product's whole position is
 * that people are told. The landing page says zero silence; refusing an
 * application without saying why is the smallest version of the thing this
 * platform exists to replace.
 */
CREATE FUNCTION why_cannot_apply(p_candidate_id text, p_posting_id text)
  RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE p job_postings%ROWTYPE;
BEGIN
  SELECT * INTO p FROM job_postings WHERE id = p_posting_id AND deleted_at IS NULL;
  IF p.id IS NULL THEN RETURN 'That role is no longer listed.'; END IF;
  IF p.status <> 'posted' THEN RETURN 'That role is not open for applications.'; END IF;

  IF EXISTS (SELECT 1 FROM applications
             WHERE candidate_id = p_candidate_id AND job_posting_id = p_posting_id) THEN
    RETURN 'You have already applied to this role.';
  END IF;

  IF p.apply_by_date IS NOT NULL AND p.apply_by_date < CURRENT_DATE THEN
    RETURN 'Applications for this role closed on ' || to_char(p.apply_by_date, 'DD Mon YYYY') || '.';
  END IF;

  IF posting_excludes_candidate(p_posting_id, p_candidate_id) THEN
    RETURN 'This school cannot sponsor a work permit for your nationality, '
        || 'so it has excluded it from this role. Nothing about your profile is at fault.';
  END IF;

  RETURN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Applying
-- ---------------------------------------------------------------------------

CREATE FUNCTION apply_to_posting(
    p_candidate_id text,
    p_posting_id   text,
    p_cover_letter boolean DEFAULT false,
    p_answers      jsonb   DEFAULT '[]'::jsonb)
  RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_why text;
        v_id  text;
        v_rankable_reason text;
BEGIN
  v_why := why_cannot_apply(p_candidate_id, p_posting_id);
  IF v_why IS NOT NULL THEN
    RAISE EXCEPTION '%', v_why;
  END IF;

  -- Rule 6 decided here rather than by the ranking job, because it is true the
  -- moment the application exists and the candidate should see it straight
  -- away. `awaiting_ranking` is the ordinary case.
  v_rankable_reason := CASE
    WHEN candidate_is_rankable(p_candidate_id) THEN 'awaiting_ranking'
    ELSE 'profile_incomplete' END;

  INSERT INTO applications (
    candidate_id, job_posting_id, school_id, cover_letter_submitted,
    screening_answers, rankable, not_rankable_reason, school_owes_response)
  SELECT p_candidate_id, p_posting_id, p.school_id, p_cover_letter,
         COALESCE(p_answers, '[]'::jsonb), false, v_rankable_reason, true
  FROM   job_postings p WHERE p.id = p_posting_id
  RETURNING id INTO v_id;

  INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id,
                         school_id, after)
  SELECT 'candidate', p_candidate_id, 'application.created', 'application', v_id,
         a.school_id, jsonb_build_object('posting', p_posting_id,
                                         'not_rankable_reason', v_rankable_reason)
  FROM   applications a WHERE a.id = v_id;

  RETURN v_id;
END $$;

-- ---------------------------------------------------------------------------
-- Moving somebody along
-- ---------------------------------------------------------------------------

/**
 * The only way the pipeline moves.
 *
 * `move_stage` is checked here rather than in the page, and so is the school
 * the mover belongs to — a coordinator at one school must not be able to
 * reject a candidate at another. The transition rules themselves stay in
 * 0005's trigger, which refuses anything that is not one step forward or a
 * departure.
 */
CREATE FUNCTION move_application_stage(
    p_school_user_id text,
    p_application_id text,
    p_to             application_stage,
    p_reason         text DEFAULT NULL)
  RETURNS application_stage LANGUAGE plpgsql AS $$
DECLARE a applications%ROWTYPE;
BEGIN
  SELECT * INTO a FROM applications WHERE id = p_application_id;
  IF a.id IS NULL THEN
    RAISE EXCEPTION 'no such application: %', p_application_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM school_users u
                 WHERE u.id = p_school_user_id AND u.school_id = a.school_id
                   AND u.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'that application belongs to another school';
  END IF;

  IF NOT school_user_has(p_school_user_id, 'move_stage') THEN
    RAISE EXCEPTION 'you may not move candidates through the pipeline';
  END IF;

  IF p_to IN ('rejected', 'withdrawn') AND btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'ending an application needs a reason — the candidate is told it';
  END IF;

  UPDATE applications
     SET stage = p_to,
         last_moved_by_id = p_school_user_id,
         rejection_reason = CASE WHEN p_to = 'rejected'  THEN p_reason ELSE rejection_reason END,
         withdrawn_reason = CASE WHEN p_to = 'withdrawn' THEN p_reason ELSE withdrawn_reason END,
         -- The school owed a response; moving IS the response.
         school_owes_response = false
   WHERE id = p_application_id;

  INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id,
                         school_id, before, after)
  VALUES ('school_user', p_school_user_id, 'application.stage_changed', 'application',
          p_application_id, a.school_id,
          jsonb_build_object('stage', a.stage),
          jsonb_build_object('stage', p_to, 'reason', p_reason));

  RETURN p_to;
END $$;

-- ---------------------------------------------------------------------------
-- What each side reads
-- ---------------------------------------------------------------------------

-- A candidate's own applications, with enough of the role to be legible.
-- Deliberately without `shortlisted` or `internal_notes`: rule 3 says a
-- shortlist is invisible to the candidate, and a view they read is the right
-- place to make that structural rather than remembered.
CREATE VIEW candidate_applications AS
SELECT a.id              AS application_id,
       a.candidate_id,
       a.stage,
       a.stage_changed_at,
       a.applied_at,
       a.rankable,
       a.not_rankable_reason,
       a.rejection_reason,
       a.feedback_sent_at,
       a.messaging_unlocked_at IS NOT NULL AS can_message,
       p.id              AS posting_id,
       p.title,
       p.role_family,
       p.subjects,
       p.specialisms,
       p.status          AS posting_status,
       s.id              AS school_id,
       s.name            AS school_name,
       s.city,
       s.country
FROM   applications a
JOIN   job_postings p ON p.id = a.job_posting_id
JOIN   schools s      ON s.id = a.school_id;

-- The school's side of one posting: who applied, and where they are.
CREATE VIEW posting_applications AS
SELECT a.id            AS application_id,
       a.job_posting_id,
       a.school_id,
       a.stage,
       a.stage_changed_at,
       a.applied_at,
       a.shortlisted,
       a.rankable,
       a.not_rankable_reason,
       a.ai_rank_score,
       a.school_owes_response,
       c.id            AS candidate_id,
       btrim(concat_ws(' ', c.first_name, c.last_name)) AS candidate_name,
       c.headline,
       c.profile_completeness,
       c.years_experience,
       c.leadership_years,
       c.subjects,
       c.specialisms,
       c.curriculum_experience,
       c.current_country
FROM   applications a
JOIN   candidates c ON c.id = a.candidate_id
WHERE  c.deleted_at IS NULL;

COMMIT;
