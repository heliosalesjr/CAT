-- 0004 — job postings and the ranking criteria catalog
--
-- criteriaCatalog is a TABLE, not an enum: it carries label, shortLabel,
-- description and measuredFrom, and a recruiter-facing catalog should grow
-- without a migration.

BEGIN;

CREATE TABLE criteria_catalog (
  id            text PRIMARY KEY,
  label         text NOT NULL,
  short_label   text NOT NULL,
  description   text NOT NULL,
  measured_from text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0
);

CREATE TABLE job_postings (
  id                     text PRIMARY KEY,
  school_id              text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_by_id          text REFERENCES school_users(id),
  title                  text NOT NULL,
  role_family            role_family NOT NULL DEFAULT 'teacher',
  subjects               text[] NOT NULL DEFAULT '{}',
  division               division,
  grade_levels           text[] NOT NULL DEFAULT '{}',
  curriculum_required    curriculum[] NOT NULL DEFAULT '{}',
  employment_type        employment_type NOT NULL DEFAULT 'full_time',
  academic_year          text,
  status                 job_posting_status NOT NULL DEFAULT 'draft',
  likelihood             likelihood NOT NULL DEFAULT 'definite',
  apply_by_date          date,
  start_date             date,
  contract_length_years  int CHECK (contract_length_years > 0),
  openings_available     int NOT NULL DEFAULT 1 CHECK (openings_available > 0),
  min_years_experience   int NOT NULL DEFAULT 0 CHECK (min_years_experience >= 0),
  excluded_nationalities text[] NOT NULL DEFAULT '{}',
  cover_letter_required  boolean NOT NULL DEFAULT false,
  screening_questions    jsonb NOT NULL DEFAULT '[]'::jsonb,
  salary_min_usd         int,
  salary_max_usd         int,
  housing_provided       boolean NOT NULL DEFAULT false,
  dependent_tuition_covered boolean NOT NULL DEFAULT false,

  -- Ranking. The list is ORDERED; position 1 is the top priority.
  ranking_criteria       text[] NOT NULL,
  previous_ranking_criteria text[],
  ranking_criteria_updated_at   timestamptz,
  ranking_criteria_updated_by_id text REFERENCES school_users(id),
  -- Posting-level opt-out. The plan is the ceiling (see 0009): a posting may
  -- turn ranking OFF, never on when the plan does not include it.
  ai_ranking_enabled     boolean NOT NULL DEFAULT true,

  view_count             int NOT NULL DEFAULT 0,
  application_count      int NOT NULL DEFAULT 0,
  hired_count            int NOT NULL DEFAULT 0,
  posted_at              timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz,

  CHECK (cardinality(ranking_criteria) BETWEEN 3 AND 5),
  CHECK (salary_max_usd IS NULL OR salary_min_usd IS NULL OR salary_max_usd >= salary_min_usd),
  CHECK (apply_by_date IS NULL OR start_date IS NULL OR apply_by_date <= start_date)
);

CREATE TRIGGER job_postings_updated_at BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ON job_postings (school_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ON job_postings (status, posted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX ON job_postings USING gin (subjects);

-- ranking_criteria holds catalog ids; arrays cannot carry a foreign key, so
-- validate on write. Duplicates would silently double a criterion's weight.
CREATE FUNCTION job_postings_validate_criteria() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE unknown text;
BEGIN
  IF cardinality(NEW.ranking_criteria)
     <> cardinality(ARRAY(SELECT DISTINCT unnest(NEW.ranking_criteria))) THEN
    RAISE EXCEPTION 'job_posting %: ranking_criteria contains duplicates (%)',
      NEW.id, NEW.ranking_criteria;
  END IF;

  SELECT string_agg(c, ', ') INTO unknown
  FROM   unnest(NEW.ranking_criteria) AS c
  WHERE  NOT EXISTS (SELECT 1 FROM criteria_catalog cc WHERE cc.id = c);

  IF unknown IS NOT NULL THEN
    RAISE EXCEPTION 'job_posting %: unknown ranking criteria: %', NEW.id, unknown;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER job_postings_validate_criteria
  BEFORE INSERT OR UPDATE OF ranking_criteria ON job_postings
  FOR EACH ROW EXECUTE FUNCTION job_postings_validate_criteria();

-- w(i) = (N - i + 1) / (N(N+1)/2), i 1-indexed. Matches rankingModel exactly:
-- N=5 -> .333 .267 .200 .133 .067   N=3 -> .500 .333 .167
-- `pos`, not `position`: POSITION is a reserved word in Postgres (the
-- POSITION(x IN y) function), and naming a parameter that is a syntax error.
CREATE FUNCTION criterion_weight(pos int, n int) RETURNS numeric
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT round((n - pos + 1)::numeric / (n * (n + 1) / 2.0), 3) $$;

COMMIT;
