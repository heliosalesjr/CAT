-- 0001 — enums and shared helpers
--
-- Enum values are copied verbatim from docs/mock-data.json `enums`, in the
-- same order, so the seed loads without translation.
--
-- NAMING: the mock is camelCase, these columns are snake_case. Postgres
-- folds unquoted identifiers to lower case, so camelCase columns would need
-- double quotes in every statement forever. The mapping is mechanical
-- (schoolId <-> school_id) and belongs in the TS data layer, not in the DDL.

BEGIN;

CREATE TYPE application_stage AS ENUM (
  'applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn');

CREATE TYPE job_posting_status AS ENUM ('draft','posted','on_hold','closed','archived');
CREATE TYPE likelihood        AS ENUM ('definite','probable','possible');
CREATE TYPE school_user_role  AS ENUM ('hr','principal','coordinator');
CREATE TYPE document_type     AS ENUM (
  'diploma','teaching_certificate','passport','transcript',
  'background_check','reference_letter','visa','medical');
CREATE TYPE document_status   AS ENUM (
  'missing','uploaded','under_review','verified','rejected','expired');
CREATE TYPE reference_status  AS ENUM ('requested','unverified','verified','declined','expired');
CREATE TYPE reference_relationship AS ENUM (
  'direct_supervisor','head_of_school','department_head','colleague');
CREATE TYPE interview_status  AS ENUM ('proposed','scheduled','completed','cancelled','no_show');
CREATE TYPE division          AS ENUM ('early_years','elementary','middle','high','school_wide');
CREATE TYPE curriculum        AS ENUM (
  'IB_PYP','IB_MYP','IB_DP','IB_CP','Cambridge_IGCSE','Cambridge_A_Level',
  'AP','US_Common_Core','British_National','Australian');
CREATE TYPE employment_type   AS ENUM ('full_time','part_time','fractional');
CREATE TYPE role_family       AS ENUM ('teacher','administrator','support_staff');
CREATE TYPE highest_degree    AS ENUM ('bachelors','masters','doctorate');

-- NOT an enum: criteriaCatalog carries label, description and measuredFrom,
-- and recruiters will want to add criteria without a migration. See 0004.

CREATE TYPE permission AS ENUM (
  'view_salary','post_jobs','manage_users','view_documents',
  'move_stage','send_feedback','manage_billing','edit_ranking_criteria');

-- --------------------------------------------------------------------------
-- Stage ordering.
--
-- Postgres orders enums by declaration, which would put 'rejected' and
-- 'withdrawn' ABOVE 'offer'. Any `stage >= 'screening'` test would then
-- silently include withdrawn candidates. Nothing in this schema compares
-- stages with an operator; where progress matters, ask these functions.
-- --------------------------------------------------------------------------

CREATE FUNCTION stage_rank(s application_stage) RETURNS int
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE s
    WHEN 'applied'   THEN 1
    WHEN 'screening' THEN 2
    WHEN 'interview' THEN 3
    WHEN 'offer'     THEN 4
    WHEN 'hired'     THEN 5
    ELSE 0                      -- rejected / withdrawn: off the pipeline
  END $$;

CREATE FUNCTION stage_is_terminal(s application_stage) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT s IN ('hired','rejected','withdrawn') $$;

CREATE FUNCTION set_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

COMMIT;
