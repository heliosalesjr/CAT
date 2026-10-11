-- 0002 — RBAC
--
-- The mock has two `principal` users with DIFFERENT permission sets:
--   usr_his_head      6 perms, includes view_salary
--   usr_cai_principal 5 perms, no view_salary
-- So permissions cannot be a pure function of the role. The role supplies a
-- template; a per-user grant table adds or removes from it. That is also what
-- the `manage_users` permission implies as a feature: somebody administers
-- these per person.

BEGIN;

CREATE TABLE roles (
  code        school_user_role PRIMARY KEY,
  label       text NOT NULL,
  description text
);

CREATE TABLE role_permissions (
  role_code  school_user_role NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  permission permission       NOT NULL,
  PRIMARY KEY (role_code, permission)
);

CREATE TABLE schools (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  short_name          text,
  city                text,
  country             text,
  country_code        text,
  region              text,
  timezone            text NOT NULL,
  website             text,
  description         text,
  founded_year        int,
  student_count       int,
  curricula           curriculum[] NOT NULL DEFAULT '{}',
  divisions           division[]   NOT NULL DEFAULT '{}',
  benefits_summary    text,
  logo_url            text,
  hero_image_url      text,
  -- Rule 4: ratings flow one way. These are the school's rating BY candidates.
  -- There is deliberately no candidate-rating column anywhere in this schema.
  candidate_rating      numeric(2,1) CHECK (candidate_rating BETWEEN 0 AND 5),
  rating_count        int NOT NULL DEFAULT 0,
  average_response_days numeric(5,1),
  verification_status text NOT NULL DEFAULT 'pending',
  verified_at         timestamptz,
  plan_id             text,          -- FK added in 0009, after plans exists
  -- Messaging gate override; NULL inherits platform_settings. See 0006.
  messaging_min_stage application_stage,
  school_may_initiate boolean,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE TRIGGER schools_updated_at BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE school_users (
  id          text PRIMARY KEY,
  school_id   text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role        school_user_role NOT NULL REFERENCES roles(code),
  first_name  text,
  last_name   text,
  email       text,
  title       text,
  avatar_url  text,
  last_active_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE INDEX ON school_users (school_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ON school_users (lower(email)) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE TRIGGER school_users_updated_at BEFORE UPDATE ON school_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Per-user delta on top of the role template. granted = true adds a
-- permission the role lacks; granted = false revokes one the role carries
-- (this is the usr_cai_principal / view_salary case).
CREATE TABLE school_user_grants (
  school_user_id text       NOT NULL REFERENCES school_users(id) ON DELETE CASCADE,
  permission     permission NOT NULL,
  granted        boolean    NOT NULL,
  granted_by_id  text       REFERENCES school_users(id),
  reason         text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_user_id, permission)
);

-- The one place permission is resolved. Nothing else should union these by
-- hand; if a query needs to know, it joins this view.
CREATE VIEW school_user_effective_permissions AS
SELECT u.id AS school_user_id,
       u.school_id,
       p.permission
FROM   school_users u
JOIN   LATERAL (
         SELECT rp.permission
         FROM   role_permissions rp
         WHERE  rp.role_code = u.role
           AND  NOT EXISTS (SELECT 1 FROM school_user_grants g
                            WHERE g.school_user_id = u.id
                              AND g.permission = rp.permission
                              AND g.granted IS FALSE)
         UNION
         SELECT g.permission
         FROM   school_user_grants g
         WHERE  g.school_user_id = u.id AND g.granted IS TRUE
       ) p ON TRUE
WHERE  u.deleted_at IS NULL;

CREATE FUNCTION school_user_has(p_user_id text, p_permission permission)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM school_user_effective_permissions
                 WHERE school_user_id = p_user_id AND permission = p_permission) $$;

INSERT INTO roles (code, label, description) VALUES
  ('hr',          'HR / Recruiting', 'Full access including billing and user administration.'),
  ('principal',   'Principal / Head of School', 'Hiring decisions and ranking priorities; no billing.'),
  ('coordinator', 'Coordinator', 'Moves candidates through the pipeline and leaves feedback.');

INSERT INTO role_permissions (role_code, permission) VALUES
  ('hr','view_salary'),('hr','post_jobs'),('hr','manage_users'),('hr','view_documents'),
  ('hr','move_stage'),('hr','send_feedback'),('hr','manage_billing'),('hr','edit_ranking_criteria'),
  ('principal','view_salary'),('principal','post_jobs'),('principal','view_documents'),
  ('principal','move_stage'),('principal','send_feedback'),('principal','edit_ranking_criteria'),
  ('coordinator','move_stage'),('coordinator','send_feedback');

COMMIT;
