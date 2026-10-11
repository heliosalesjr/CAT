-- 0009 — plans and subscriptions

BEGIN;

CREATE TABLE plans (
  id                        text PRIMARY KEY,
  name                      text NOT NULL,
  price_usd_monthly         numeric(10,2) NOT NULL DEFAULT 0,
  stripe_price_id           text,
  job_posting_limit         int,       -- NULL = unlimited
  application_limit_per_cycle int,
  seats                     int,
  -- The plan is the CEILING. A posting may switch ranking off; it can never
  -- switch it on when the plan withholds it. Enforced below.
  ai_ranking_enabled        boolean NOT NULL DEFAULT false,
  custom_ranking_criteria   boolean NOT NULL DEFAULT false,
  candidate_search_enabled  boolean NOT NULL DEFAULT false,
  profile_boost             boolean NOT NULL DEFAULT false,
  sort_order                int NOT NULL DEFAULT 0
);

ALTER TABLE schools
  ADD CONSTRAINT schools_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES plans(id);

CREATE TABLE subscriptions (
  id                     text PRIMARY KEY,
  -- Only 'school' appears in the mock, but 22 candidates carry
  -- premiumMember = true with no subscription row. Left polymorphic so
  -- candidate premium has somewhere to land without a migration.
  owner_type             text NOT NULL CHECK (owner_type IN ('school','candidate')),
  owner_id               text NOT NULL,
  plan_id                text NOT NULL REFERENCES plans(id),
  status                 text NOT NULL,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  job_postings_used      int NOT NULL DEFAULT 0,
  seats_used             int NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_type, owner_id)
);

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE FUNCTION job_postings_enforce_plan() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE plan_allows boolean;
BEGIN
  SELECT p.ai_ranking_enabled INTO plan_allows
  FROM   schools s JOIN plans p ON p.id = s.plan_id
  WHERE  s.id = NEW.school_id;

  IF NEW.ai_ranking_enabled AND plan_allows IS NOT TRUE THEN
    RAISE EXCEPTION
      'job_posting %: the school''s plan does not include AI ranking', NEW.id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER job_postings_enforce_plan
  BEFORE INSERT OR UPDATE OF ai_ranking_enabled, school_id ON job_postings
  FOR EACH ROW EXECUTE FUNCTION job_postings_enforce_plan();

COMMIT;
