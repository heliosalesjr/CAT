-- 0016 — proving you work at the school you picked
--
-- Decided 2026-10-21 (DECISIONS.md, decision 8). A school user signs up
-- self-serve, but **picking** a school from a list is a claim, not proof, and
-- the claim is expensive: the `hr` template carries view_documents, so an
-- unchecked claim against a real school reaches the passports and transcripts
-- of every candidate who applied there and got to screening.
--
-- The gate the founders asked for is NOT on posting a job. It is on joining a
-- school, in three layers:
--
--   1. The email comes FIRST, and its domain finds the school. A magic link
--      proves control of the address; the address's domain matching a VERIFIED
--      domain of that school proves the affiliation, with no human in the
--      loop. This is the common case and it costs nothing.
--   2. Anything else — unknown domain, a school nobody has registered yet —
--      is pending until a human confirms, and after that the verified user
--      invites colleagues directly.
--   3. A school user who is not verified has NO permissions at all, whatever
--      their role says. One line in school_user_effective_permissions, and
--      every caller inherits it: school_user_has(), may_read_document(), the
--      messaging gate. That is the whole point of having one resolution point.
--
-- Layer 3 is the one that matters. If 1 and 2 are ever bypassed, the damage
-- stops at reading job adverts.

BEGIN;

-- The form asks for these when somebody registers a school nobody has yet.
ALTER TABLE schools
  ADD COLUMN phone        text,
  ADD COLUMN address_line text,
  ADD COLUMN postal_code  text;

ALTER TABLE schools
  ALTER COLUMN id SET DEFAULT 'sch_' || replace(gen_random_uuid()::text, '-', '');

-- ---------------------------------------------------------------------------
-- Domains
-- ---------------------------------------------------------------------------

-- A table and not an array on `schools`, for three reasons: the lookup runs
-- the other way (domain → school, which wants an index), one school can hold
-- several domains, and each domain carries its own proof — a domain typed in
-- by whoever registered the school is a CLAIM until somebody confirms it.
CREATE TABLE school_email_domains (
  school_id      text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  domain         text NOT NULL CHECK (domain = lower(domain) AND domain LIKE '%.%'
                                      AND domain NOT LIKE '%@%'),
  verified_at    timestamptz,
  verified_by_id text REFERENCES platform_users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, domain),
  CONSTRAINT verified_domains_say_who CHECK (verified_at IS NULL OR verified_by_id IS NOT NULL)
);

-- One domain may belong to more than one school: international groups run
-- a dozen campuses off one address space. So this is NOT unique on domain —
-- the lookup returns a short list and the person picks their campus.
CREATE INDEX ON school_email_domains (domain) WHERE verified_at IS NOT NULL;

-- The hole the email-first idea opens: if gmail.com were ever attached to a
-- school, every Gmail address on earth would verify into it. This closes it in
-- the schema, not in the form, because the form is not the only thing that
-- will ever write here.
CREATE TABLE public_email_domains (
  domain text PRIMARY KEY CHECK (domain = lower(domain)),
  note   text
);

INSERT INTO public_email_domains (domain) VALUES
  ('gmail.com'),('googlemail.com'),('outlook.com'),('outlook.co.uk'),('outlook.es'),
  ('outlook.fr'),('outlook.de'),('hotmail.com'),('hotmail.co.uk'),('hotmail.fr'),
  ('hotmail.es'),('hotmail.it'),('hotmail.de'),('live.com'),('live.co.uk'),('msn.com'),
  ('yahoo.com'),('yahoo.co.uk'),('yahoo.co.jp'),('yahoo.es'),('ymail.com'),
  ('rocketmail.com'),('icloud.com'),('me.com'),('mac.com'),('aol.com'),('aim.com'),
  ('proton.me'),('protonmail.com'),('pm.me'),('tutanota.com'),('tuta.io'),
  ('gmx.com'),('gmx.de'),('web.de'),('mail.com'),('zoho.com'),('fastmail.com'),
  ('hey.com'),('duck.com'),('yandex.com'),('mail.ru'),('qq.com'),('163.com'),
  ('126.com'),('sina.com'),('naver.com'),('hanmail.net'),('daum.net'),('nate.com'),
  ('uol.com.br'),('bol.com.br'),('terra.com.br'),('libero.it'),('free.fr'),
  ('orange.fr'),('laposte.net'),('btinternet.com'),('sky.com'),('comcast.net'),
  ('verizon.net'),('att.net'),('sbcglobal.net'),('cox.net'),('charter.net'),
  ('earthlink.net'),('rediffmail.com');

CREATE FUNCTION email_domain(p_email text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT NULLIF(lower(split_part(btrim(p_email), '@', 2)), '') $$;

CREATE FUNCTION is_public_email_domain(p_email text) RETURNS boolean
  LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public_email_domains
                 WHERE domain = email_domain(p_email)) $$;

CREATE FUNCTION school_email_domains_refuse_public() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public_email_domains WHERE domain = NEW.domain) THEN
    RAISE EXCEPTION
      '% is a public email provider and cannot stand for a school', NEW.domain;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER school_email_domains_refuse_public
  BEFORE INSERT OR UPDATE OF domain ON school_email_domains
  FOR EACH ROW EXECUTE FUNCTION school_email_domains_refuse_public();

-- Step one of the signup form, as one query: the work email arrives, and this
-- says which school it belongs to. No rows → the person searches by name or
-- registers a new school. One row → preselected. Several → a group, and they
-- pick the campus.
CREATE FUNCTION schools_for_email(p_email text)
  RETURNS TABLE (school_id text, school_name text, verification_status text)
  LANGUAGE sql STABLE AS $$
  SELECT s.id, s.name, s.verification_status
  FROM   school_email_domains d
  JOIN   schools s ON s.id = d.school_id AND s.deleted_at IS NULL
  WHERE  d.verified_at IS NOT NULL
    AND  d.domain = email_domain(p_email)
    AND  NOT is_public_email_domain(p_email)
  ORDER  BY s.name $$;

-- Whether this address, on its own, is enough to let somebody in.
CREATE FUNCTION email_proves_affiliation(p_email text, p_school_id text)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM schools_for_email(p_email) s
                 WHERE s.school_id = p_school_id) $$;

-- ---------------------------------------------------------------------------
-- A school user is pending until proved
-- ---------------------------------------------------------------------------

ALTER TABLE school_users
  ADD COLUMN verified_at         timestamptz,
  ADD COLUMN verification_method text CHECK (verification_method IN
                                     ('email_domain', 'invite', 'manual')),
  ADD COLUMN verified_by_id      text REFERENCES platform_users(id),
  ADD COLUMN invited_by_id       text REFERENCES school_users(id);

ALTER TABLE school_users
  ADD CONSTRAINT verified_users_say_how CHECK (
    (verified_at IS NULL     AND verification_method IS NULL) OR
    (verified_at IS NOT NULL AND verification_method IS NOT NULL));

CREATE INDEX ON school_users (school_id) WHERE verified_at IS NULL AND deleted_at IS NULL;

-- Layer 3. Same columns as 0002, one more condition: an unverified user
-- resolves to zero permissions, so school_user_has() and everything built on
-- it — may_read_document(), the messaging gate — refuse without being told.
CREATE OR REPLACE VIEW school_user_effective_permissions AS
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
WHERE  u.deleted_at IS NULL
  AND  u.verified_at IS NOT NULL;

ALTER TABLE school_users
  ALTER COLUMN id SET DEFAULT 'usr_' || replace(gen_random_uuid()::text, '-', '');

-- ---------------------------------------------------------------------------
-- Invites — the same credential discipline as the referee link in 0013
-- ---------------------------------------------------------------------------

CREATE TABLE school_user_invites (
  id             bigserial PRIMARY KEY,
  school_id      text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email          text NOT NULL,
  role           school_user_role NOT NULL REFERENCES roles(code),
  token_sha256   text NOT NULL UNIQUE CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  invited_by_id  text NOT NULL REFERENCES school_users(id),
  expires_at     timestamptz NOT NULL,
  accepted_at    timestamptz,
  accepted_school_user_id text REFERENCES school_users(id),
  revoked_at     timestamptz,
  revoked_reason text,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT invite_expires_after_it_is_issued CHECK (expires_at > created_at),
  CONSTRAINT revoked_invites_say_why CHECK (revoked_at IS NULL OR revoked_reason IS NOT NULL),
  CONSTRAINT accepted_invites_name_the_user CHECK (
    (accepted_at IS NULL     AND accepted_school_user_id IS NULL) OR
    (accepted_at IS NOT NULL AND accepted_school_user_id IS NOT NULL))
);

CREATE UNIQUE INDEX one_live_invite_per_email_per_school
  ON school_user_invites (school_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX ON school_user_invites (expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE FUNCTION invite_ttl() RETURNS interval
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT interval '14 days' $$;

-- Who may invite is not the form's business: manage_users, resolved through
-- the same view as everything else, which means an unverified user cannot
-- invite anybody either.
CREATE FUNCTION school_invite_issue(
    p_school_id     text,
    p_email         text,
    p_role          school_user_role,
    p_invited_by_id text,
    p_token_sha256  text,
    p_ttl           interval DEFAULT NULL)
  RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_id bigint;
BEGIN
  IF NOT school_user_has(p_invited_by_id, 'manage_users') THEN
    RAISE EXCEPTION 'user % may not invite colleagues', p_invited_by_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM school_users
                 WHERE id = p_invited_by_id AND school_id = p_school_id
                   AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'user % does not belong to school %', p_invited_by_id, p_school_id;
  END IF;

  IF EXISTS (SELECT 1 FROM school_users
             WHERE lower(email) = lower(p_email) AND deleted_at IS NULL) THEN
    RAISE EXCEPTION '% already has a school account', p_email;
  END IF;

  UPDATE school_user_invites
     SET revoked_at = now(),
         revoked_reason = COALESCE(revoked_reason, 'superseded by a new invite')
   WHERE school_id = p_school_id AND lower(email) = lower(p_email)
     AND accepted_at IS NULL AND revoked_at IS NULL;

  INSERT INTO school_user_invites
      (school_id, email, role, token_sha256, invited_by_id, expires_at)
  VALUES (p_school_id, p_email, p_role, p_token_sha256, p_invited_by_id,
          now() + COALESCE(p_ttl, invite_ttl()))
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- Accepting creates the school user already verified: the invite came from
-- somebody the school had already proved, which is layer 2.
CREATE FUNCTION school_invite_accept(
    p_token_sha256 text,
    p_auth_user_id text,
    p_first_name   text DEFAULT NULL,
    p_last_name    text DEFAULT NULL,
    p_title        text DEFAULT NULL)
  RETURNS text LANGUAGE plpgsql AS $$
DECLARE inv school_user_invites;
        v_user_id text;
BEGIN
  SELECT * INTO inv FROM school_user_invites WHERE token_sha256 = p_token_sha256;

  IF inv.id IS NULL            THEN RAISE EXCEPTION 'invite is not valid'; END IF;
  IF inv.revoked_at IS NOT NULL  THEN RAISE EXCEPTION 'invite was revoked'; END IF;
  IF inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invite was already accepted'; END IF;
  IF inv.expires_at <= now()   THEN RAISE EXCEPTION 'invite has expired'; END IF;

  INSERT INTO school_users
      (school_id, role, first_name, last_name, email, title,
       auth_user_id, verified_at, verification_method, invited_by_id)
  VALUES (inv.school_id, inv.role, p_first_name, p_last_name, inv.email, p_title,
          p_auth_user_id, now(), 'invite', inv.invited_by_id)
  RETURNING id INTO v_user_id;

  UPDATE school_user_invites
     SET accepted_at = now(), accepted_school_user_id = v_user_id
   WHERE id = inv.id;

  INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, school_id, after)
  VALUES ('school_user', v_user_id, 'school_user.joined_by_invite', 'school_user',
          v_user_id, inv.school_id,
          jsonb_build_object('role', inv.role, 'invited_by', inv.invited_by_id));

  RETURN v_user_id;
END $$;

COMMIT;
