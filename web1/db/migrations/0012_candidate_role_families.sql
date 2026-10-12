-- 0012 — what kind of post a candidate wants, and people who never taught
--
-- Settles two of the six actor decisions (db/DECISIONS.md, 2026-10-12):
--
--   3. Does a candidate say what kind of post they want?
--      YES, AND A CANDIDATE MAY WANT MORE THAN ONE. `role_family` landed on
--      job_postings in 0004 but nowhere on the person, so matching compared a
--      counsellor against a teaching profile and had no idea. One family per
--      candidate was rejected because most international-school leaders still
--      teach: a head of science who would take a DP Chemistry post is the
--      normal case, not the exception. Hence a join table, not a column.
--
--   4. Can someone who has never taught have a profile?
--      YES. `subjects` stays NOT NULL DEFAULT '{}' — an empty array already
--      said "none", so nothing had to become nullable — and `specialisms`
--      carries the practice of someone whose work is not a taught subject:
--      a counsellor, a librarian, a nurse, an admissions officer.
--
-- No constraint here requires a candidate to be coherent (a 'teacher' family
-- with no subjects, say). Profiles are filled in gradually and rule 6 already
-- treats an incomplete one as unrankable rather than invalid; a CHECK would
-- refuse to store a profile the product is designed to accept half-finished.
-- Coherence is scored in profile_completeness, not enforced in the DDL.

BEGIN;

-- Membership only. No priority column: nothing in the product ranks a
-- candidate's own preferences against each other, and an unused ordering
-- would start drifting the day someone wrote to it.
CREATE TABLE candidate_role_families (
  candidate_id text        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  role_family  role_family NOT NULL,
  declared_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, role_family)
);

-- The lookup every matching query makes: all candidates seeking this family.
CREATE INDEX ON candidate_role_families (role_family, candidate_id);

-- Practice that is not a taught subject. Same vocabulary on both sides, so
-- a posting and a profile can be compared directly — which is the whole
-- reason the counsellor posting could not be matched before.
ALTER TABLE candidates    ADD COLUMN specialisms text[] NOT NULL DEFAULT '{}';
ALTER TABLE job_postings  ADD COLUMN specialisms text[] NOT NULL DEFAULT '{}';

CREATE INDEX ON candidates   USING gin (specialisms);
CREATE INDEX ON job_postings USING gin (specialisms);

-- Resolve through these two rather than joining the table by hand, the same
-- way permissions go through school_user_has().
CREATE FUNCTION candidate_seeks(p_candidate_id text, p_role_family role_family)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM candidate_role_families
                 WHERE candidate_id = p_candidate_id
                   AND role_family  = p_role_family) $$;

-- A candidate who has declared nothing is not excluded: there are 136
-- profiles that predate the question, and silently dropping them from every
-- result would look exactly like a matching bug. Undeclared means unfiltered,
-- and the UI asks.
CREATE FUNCTION candidate_seeks_posting(p_candidate_id text, p_posting_id text)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT NOT EXISTS (SELECT 1 FROM candidate_role_families
                     WHERE candidate_id = p_candidate_id)
      OR EXISTS (SELECT 1
                 FROM   candidate_role_families f
                 JOIN   job_postings j ON j.id = p_posting_id
                 WHERE  f.candidate_id = p_candidate_id
                   AND  f.role_family  = j.role_family) $$;

-- Flattened for the TypeScript layer, which wants one row per candidate.
CREATE VIEW candidates_with_role_families AS
SELECT c.*,
       COALESCE((SELECT array_agg(f.role_family ORDER BY f.role_family)
                 FROM   candidate_role_families f
                 WHERE  f.candidate_id = c.id), '{}'::role_family[]) AS role_families
FROM   candidates c;

COMMIT;
