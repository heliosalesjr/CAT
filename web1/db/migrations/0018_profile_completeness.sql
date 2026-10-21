-- 0018 — how complete a profile is, and why
--
-- Decided 2026-10-21 (DECISIONS.md, decision 11). Rule 6 says nobody below
-- 70% completeness is ranked, and that number had nowhere to come from: the
-- bundle carried it pre-computed and the profile form approximated it in the
-- browser by counting filled fields per section.
--
-- COMPLETENESS IS THE FORM, NOT THE PAPERWORK. Two measures were being
-- conflated. How much of your profile you have filled in is one thing; whether
-- your documents and references are in order is another, it already has its
-- own panel on the dashboard, and documents are already gated to screening by
-- `docs_unlocked_at` in 0007. A fully typed profile from somebody who has not
-- uploaded a passport is not half empty — a school can read it and decide. So
-- completeness scores the form, and `candidate_readiness()` at the bottom of
-- this file scores the evidence, separately and on purpose.
--
-- Getting that wrong is measurable, which is the point of the bands view
-- below. A first version scored typed fields only and left all 136 bundle
-- candidates above the line; a second put half the weight on verified
-- documents and references and left 3 of 136 above it. The second looked like
-- a weighting problem and was not: 129 candidates in the bundle CLAIM a
-- verified document and 5 have one, 103 claim a verified supervisor reference
-- and 5 have one. Those counters are decorative numbers with no rows behind
-- them, and the triggers in 0007 and 0008 compute the truth instead.
--
-- Weights are justified against `criteria_catalog.measured_from`, which names,
-- criterion by criterion, the candidate fields the ranking reads. (Prose, so
-- a reference here, not a parsed source.) `reads_into` records which criterion
-- each weight serves, so a weight can be argued with rather than guessed at.
--
-- The THRESHOLD is not in this file and is not stored. It stays
-- `rankable_threshold()` from 0003: one function, one number, and moving 70
-- to 60 is that line with no migration and no backfill. Changing it is a
-- product decision with the co-founder, per CLAUDE.md; making it cheap to
-- change is this file's job.

BEGIN;

CREATE FUNCTION candidate_completeness_breakdown(c candidates)
  RETURNS TABLE (field text, weight int, present boolean, reads_into text)
  LANGUAGE sql STABLE AS $$
  -- Weights sum to 100. db:check asserts that, because a typo here would
  -- quietly cap everybody below the threshold.
  SELECT * FROM (VALUES
    ('subjects_or_specialisms', 13,
      (c.subjects <> '{}' OR c.specialisms <> '{}'), 'subject_specialization'),
    ('curriculum_experience',    9, c.curriculum_experience <> '{}', 'curriculum_match'),
    ('role_family',              8,
      EXISTS (SELECT 1 FROM candidate_role_families f WHERE f.candidate_id = c.id),
                                                                    'what gets matched at all'),
    ('highest_degree',           7, c.highest_degree IS NOT NULL,    'advanced_degree'),
    ('available_from',           7, c.available_from IS NOT NULL,    'availability'),
    ('grade_levels',             5, c.grade_levels <> '{}',          'subject_specialization'),
    ('years_experience',         5, c.years_experience > 0,          'years_experience'),
    ('preferred_regions',        5, c.preferred_regions <> '{}',     'regional_experience'),
    ('regions_worked',           5, c.regions_worked <> '{}',        'regional_experience'),
    ('nationality',              5, c.nationality IS NOT NULL,       'local_hire, work permits'),
    ('headline',                 5, btrim(COALESCE(c.headline, '')) <> '',
                                                                    'what a shortlist shows'),
    ('photo',                    5, c.avatar_url IS NOT NULL,        'what a shortlist shows'),
    ('years_in_subject',         4, c.years_in_subject IS NOT NULL,  'years_experience'),
    ('salary_expectation',       4,
      (c.salary_expectation_min_usd IS NOT NULL AND c.salary_expectation_max_usd IS NOT NULL),
                                                                    'which roles reach them'),
    ('intro_video',              4, c.intro_video_url IS NOT NULL,   'what a shortlist shows'),
    ('degree_field',             3, btrim(COALESCE(c.degree_field, '')) <> '',
                                                                    'advanced_degree'),
    ('languages',                3, c.languages <> '{}',             'who a school can hire'),
    ('coaching',                 3,
      (c.coaching_capable OR c.coaching_activities <> '{}'),         'extracurricular')
  ) AS t(field, weight, present, reads_into) $$;

CREATE FUNCTION candidate_completeness(c candidates) RETURNS int
  LANGUAGE sql STABLE AS $$
  SELECT COALESCE(sum(weight), 0)::int
  FROM   candidate_completeness_breakdown(c) WHERE present $$;

-- The form's version: by id, for the screen that says "a photograph is the
-- gap". Same rows, so it cannot say something the ranking disagrees with.
CREATE FUNCTION candidate_completeness_breakdown(p_candidate_id text)
  RETURNS TABLE (field text, weight int, present boolean, reads_into text)
  LANGUAGE sql STABLE AS $$
  SELECT b.* FROM candidates c, candidate_completeness_breakdown(c) b
  WHERE  c.id = p_candidate_id $$;

-- BEFORE, so it writes NEW in place and cannot recurse.
CREATE FUNCTION candidates_set_completeness() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.profile_completeness := candidate_completeness(NEW);
  RETURN NEW;
END $$;

CREATE TRIGGER candidates_set_completeness
  BEFORE INSERT OR UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION candidates_set_completeness();

-- Declaring what kind of post you want is worth 8 points and lives in another
-- table, so that table has to nudge the candidate's row. A plain UPDATE: the
-- BEFORE trigger above does the arithmetic.
CREATE FUNCTION candidate_role_families_touch_completeness() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE t text := COALESCE(NEW.candidate_id, OLD.candidate_id);
BEGIN
  UPDATE candidates SET updated_at = updated_at WHERE id = t;
  RETURN NULL;
END $$;

CREATE TRIGGER candidate_role_families_touch_completeness
  AFTER INSERT OR DELETE ON candidate_role_families
  FOR EACH ROW EXECUTE FUNCTION candidate_role_families_touch_completeness();

-- Rule 6 in one place, for the queries that rank. Never stored: it compares a
-- stored number against a function, so moving the threshold moves every answer
-- at once with nothing to backfill.
CREATE FUNCTION candidate_is_rankable(p_candidate_id text) RETURNS boolean
  LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM candidates
                 WHERE id = p_candidate_id
                   AND deleted_at IS NULL
                   AND profile_completeness >= rankable_threshold()) $$;

-- ---------------------------------------------------------------------------
-- Readiness — the other half, kept apart
-- ---------------------------------------------------------------------------

-- How much proof the platform asks for, as dials: a school wanting three
-- referees is one line here, not a migration.
CREATE FUNCTION documents_expected()  RETURNS int
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT 6 $$;
CREATE FUNCTION references_expected() RETURNS int
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT 2 $$;

-- Whether the paperwork is in order, 0-100, computed from the rows that
-- actually exist rather than from a counter somebody typed. It feeds the
-- Readiness panel and the chasing emails. It is deliberately NOT part of
-- completeness and deliberately NOT a gate on ranking: a school decides from
-- the profile and asks for documents at screening, which 0007 already
-- enforces.
CREATE FUNCTION candidate_readiness(p_candidate_id text) RETURNS int
  LANGUAGE sql STABLE AS $$
  SELECT round(
           50.0 * LEAST(c.documents_verified, documents_expected()) / documents_expected() +
           50.0 * LEAST(c.verified_supervisor_references, references_expected())
                / references_expected())::int
  FROM   candidates c WHERE c.id = p_candidate_id $$;

-- What the threshold costs, at a glance, before anybody moves it. Run it after
-- a weight change: this view is how the two numbers above were caught.
CREATE VIEW candidate_completeness_bands AS
SELECT (profile_completeness / 10) * 10 AS band,
       count(*)                        AS candidates,
       count(*) FILTER (WHERE profile_completeness >= rankable_threshold()) AS rankable
FROM   candidates
WHERE  deleted_at IS NULL
GROUP  BY 1
ORDER  BY 1;

COMMIT;
