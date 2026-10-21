-- 0017 — one vocabulary for what a person does
--
-- Decided 2026-10-21 (DECISIONS.md, decision 10). `subjects` and
-- `specialisms` are text arrays, and a free-text tag input produces "Maths",
-- "Mathematics" and "Math" inside a week. Matching compares those arrays
-- literally, so the ranking degrades with no error anywhere: a Mathematics
-- posting simply stops seeing a Maths teacher.
--
-- The name. This table is NOT `subject_catalog`, because a third of what it
-- holds is not a subject — counselling and learning support are already in
-- the bundle, and decision 4 exists so that a librarian or a nurse can be
-- described at all. Calling the table after its majority is the same small
-- lie as calling the person a Teacher, which this schema already paid to
-- rename. `kind` says which column a row belongs in.
--
-- Seeded here rather than in seed.mjs, next to `roles` and `role_permissions`
-- in 0002: a controlled vocabulary is configuration, not sample data, and the
-- validation triggers below need it populated before the first candidate
-- lands. The 26 subjects are every distinct value in the bundle (candidates
-- and postings, which share them). The four non-teaching rows nobody has used
-- yet are decision 4 made concrete.

BEGIN;

CREATE TYPE practice_kind AS ENUM ('subject', 'specialism');

CREATE TABLE practice_catalog (
  id         text PRIMARY KEY,          -- the stored value, as written in the arrays
  kind       practice_kind NOT NULL,
  label      text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX ON practice_catalog (kind) WHERE active;

-- id = label here because the arrays already store the human-readable string
-- and rewriting 136 profiles to slugs buys nothing today. A rename later is
-- an UPDATE in one place plus one array rewrite, not a model change.
INSERT INTO practice_catalog (id, kind, label, sort_order) VALUES
  ('Biology',                'subject', 'Biology',                 10),
  ('Chemistry',              'subject', 'Chemistry',               20),
  ('Computer Science',       'subject', 'Computer Science',        30),
  ('Design Technology',      'subject', 'Design Technology',       40),
  ('Drama',                  'subject', 'Drama',                   50),
  ('Early Years',            'subject', 'Early Years',             60),
  ('Economics',              'subject', 'Economics',               70),
  ('Elementary Generalist',  'subject', 'Elementary Generalist',   80),
  ('English',                'subject', 'English',                 90),
  ('English Literature',     'subject', 'English Literature',     100),
  ('Environmental Systems',  'subject', 'Environmental Systems',  110),
  ('French',                 'subject', 'French',                 120),
  ('General Science',        'subject', 'General Science',        130),
  ('Geography',              'subject', 'Geography',              140),
  ('Health',                 'subject', 'Health',                 150),
  ('History',                'subject', 'History',                160),
  ('Individuals & Societies','subject', 'Individuals & Societies',170),
  ('Mathematics',            'subject', 'Mathematics',            180),
  ('Music',                  'subject', 'Music',                  190),
  ('Physical Education',     'subject', 'Physical Education',     200),
  ('Physics',                'subject', 'Physics',                210),
  ('Spanish',                'subject', 'Spanish',                220),
  ('Spanish Literature',     'subject', 'Spanish Literature',     230),
  ('Visual Arts',            'subject', 'Visual Arts',            240),
  -- In the bundle as subjects, but they are practices, not taught courses.
  -- 0012's seed already reads them this way.
  ('Counseling',             'specialism', 'Counselling',          10),
  ('Learning Support',       'specialism', 'Learning Support',     20),
  -- Decision 4's whole point: people the schema could not describe before.
  ('Library & Media',        'specialism', 'Library & Media',      30),
  ('School Nursing',         'specialism', 'School Nursing',       40),
  ('Admissions',             'specialism', 'Admissions',           50),
  ('IT & Systems',           'specialism', 'IT & Systems',         60);

-- An array cannot carry a foreign key, so it is validated on write — the same
-- answer 0004 gave for `ranking_criteria`, for the same reason.
CREATE FUNCTION validate_practice_arrays() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE unknown text;
BEGIN
  SELECT string_agg(v, ', ') INTO unknown
  FROM   unnest(NEW.subjects) AS v
  WHERE  NOT EXISTS (SELECT 1 FROM practice_catalog c
                     WHERE c.id = v AND c.kind = 'subject');
  IF unknown IS NOT NULL THEN
    RAISE EXCEPTION '%(%): not subjects in the catalog: %',
      TG_TABLE_NAME, NEW.id, unknown;
  END IF;

  SELECT string_agg(v, ', ') INTO unknown
  FROM   unnest(NEW.specialisms) AS v
  WHERE  NOT EXISTS (SELECT 1 FROM practice_catalog c
                     WHERE c.id = v AND c.kind = 'specialism');
  IF unknown IS NOT NULL THEN
    RAISE EXCEPTION '%(%): not specialisms in the catalog: %',
      TG_TABLE_NAME, NEW.id, unknown;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER candidates_validate_practice
  BEFORE INSERT OR UPDATE OF subjects, specialisms ON candidates
  FOR EACH ROW EXECUTE FUNCTION validate_practice_arrays();

CREATE TRIGGER job_postings_validate_practice
  BEFORE INSERT OR UPDATE OF subjects, specialisms ON job_postings
  FOR EACH ROW EXECUTE FUNCTION validate_practice_arrays();

-- `active` is for retiring a value without breaking the rows that hold it:
-- the picker reads this, the validation above does not.
CREATE VIEW practice_options AS
SELECT id, kind, label FROM practice_catalog WHERE active
ORDER BY kind, sort_order;

COMMIT;
