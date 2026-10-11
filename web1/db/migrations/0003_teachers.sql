-- 0003 — teachers

BEGIN;

CREATE TABLE teachers (
  id                     text PRIMARY KEY,
  first_name             text NOT NULL,
  last_name              text NOT NULL,
  headline               text,
  avatar_url             text,
  intro_video_url        text,
  linkedin_url           text,
  current_school         text,
  current_city           text,
  current_country        text,
  timezone               text NOT NULL,
  nationality            text,
  nationalities          text[] NOT NULL DEFAULT '{}',
  languages              text[] NOT NULL DEFAULT '{}',
  subjects               text[] NOT NULL DEFAULT '{}',
  grade_levels           text[] NOT NULL DEFAULT '{}',
  curriculum_experience  curriculum[] NOT NULL DEFAULT '{}',
  regions_worked         text[] NOT NULL DEFAULT '{}',
  preferred_regions      text[] NOT NULL DEFAULT '{}',
  highest_degree         highest_degree,
  degree_field           text,
  years_experience       int NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
  years_in_subject       int CHECK (years_in_subject >= 0),
  leadership_years       int NOT NULL DEFAULT 0 CHECK (leadership_years >= 0),
  first_time_international boolean NOT NULL DEFAULT false,
  coaching_capable       boolean NOT NULL DEFAULT false,
  coaching_activities    text[] NOT NULL DEFAULT '{}',
  dependents             int NOT NULL DEFAULT 0 CHECK (dependents >= 0),
  partner_teacher_id     text REFERENCES teachers(id),   -- teaching couples
  available_from         date,
  salary_expectation_min_usd int,
  salary_expectation_max_usd int,
  profile_completeness   int NOT NULL DEFAULT 0 CHECK (profile_completeness BETWEEN 0 AND 100),
  profile_visibility     text NOT NULL DEFAULT 'public',
  premium_member         boolean NOT NULL DEFAULT false,
  -- Denormalised counters the dashboards read. Kept in step by triggers in
  -- 0007 rather than recomputed per request.
  documents_total        int NOT NULL DEFAULT 0,
  documents_verified     int NOT NULL DEFAULT 0,
  verified_supervisor_references int NOT NULL DEFAULT 0,
  last_active_at         timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz,
  CHECK (salary_expectation_max_usd IS NULL
         OR salary_expectation_min_usd IS NULL
         OR salary_expectation_max_usd >= salary_expectation_min_usd)
);

CREATE TRIGGER teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ON teachers (profile_completeness) WHERE deleted_at IS NULL;
CREATE INDEX ON teachers USING gin (subjects);
CREATE INDEX ON teachers USING gin (curriculum_experience);
CREATE INDEX ON teachers USING gin (preferred_regions);
CREATE INDEX ON teachers (years_experience) WHERE deleted_at IS NULL;

-- Rule 6 lives here: the eligibility threshold is one number, named once.
CREATE FUNCTION rankable_threshold() RETURNS int
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT 70 $$;

COMMIT;
