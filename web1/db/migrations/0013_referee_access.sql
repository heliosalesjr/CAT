-- 0013 — how a referee answers
--
-- Settles the fifth actor decision (db/DECISIONS.md, 2026-10-12) and closes
-- the "reference authenticity" open question in CLAUDE.md:
--
--   5. How does a referee answer?
--      A ONE-TIME LINK BY EMAIL, NO ACCOUNT. Referees are one-shot visitors —
--      0008 already stored twelve of them with a name, an email and a status
--      and no way in, one of which has been waiting 21 days. An account
--      nobody signs up for would leave the status at 'unverified' forever.
--
-- The link IS a credential, so it is treated as one:
--   * only a sha256 hex digest is stored — `token_sha256` will not accept
--     anything else, so a raw token cannot be written here by accident;
--   * every token expires (14 days by default);
--   * every token is single-use, enforced by reference_answer();
--   * issuing a replacement revokes the live one, so "resend" cannot quietly
--     leave two working links behind;
--   * revoking is a column, not a delete, so a revoked link stays auditable.
--
-- Phase 1 verifies nothing (CLAUDE.md: references are stored unverified), so
-- a link can produce 'unverified' or 'declined' and never 'verified'. That
-- boundary is enforced below rather than documented.

BEGIN;

CREATE TABLE reference_access_tokens (
  id             bigserial PRIMARY KEY,
  reference_id   text NOT NULL REFERENCES references_(id) ON DELETE CASCADE,
  -- sha256 of the token the referee was emailed. The token itself exists in
  -- the outbound email and nowhere else.
  token_sha256   text NOT NULL UNIQUE CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  sent_to_email  text NOT NULL,
  expires_at     timestamptz NOT NULL,
  first_opened_at timestamptz,
  used_at        timestamptz,
  revoked_at     timestamptz,
  revoked_reason text,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT token_expires_after_it_is_issued CHECK (expires_at > created_at),
  CONSTRAINT revoked_tokens_say_why CHECK (revoked_at IS NULL OR revoked_reason IS NOT NULL),
  CONSTRAINT a_used_token_was_opened CHECK (used_at IS NULL OR first_opened_at IS NOT NULL)
);

-- At most one live link per reference. A reminder goes through
-- reference_token_issue(), which revokes the previous one first.
CREATE UNIQUE INDEX one_live_token_per_reference
  ON reference_access_tokens (reference_id)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX ON reference_access_tokens (expires_at)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE FUNCTION reference_token_ttl() RETURNS interval
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT interval '14 days' $$;

-- Issue (or re-issue) the link for a reference. The caller generates the
-- token, hashes it, and never sends the plaintext here.
CREATE FUNCTION reference_token_issue(
    p_reference_id  text,
    p_token_sha256  text,
    p_ttl           interval DEFAULT NULL)
  RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_email text;
        v_id    bigint;
BEGIN
  SELECT referee_email INTO v_email FROM references_ WHERE id = p_reference_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'no such reference: %', p_reference_id;
  END IF;

  UPDATE reference_access_tokens
     SET revoked_at = now(),
         revoked_reason = COALESCE(revoked_reason, 'superseded by a new link')
   WHERE reference_id = p_reference_id
     AND used_at IS NULL AND revoked_at IS NULL;

  INSERT INTO reference_access_tokens (reference_id, token_sha256, sent_to_email, expires_at)
  VALUES (p_reference_id, p_token_sha256, v_email,
          now() + COALESCE(p_ttl, reference_token_ttl()))
  RETURNING id INTO v_id;

  UPDATE references_
     SET status = 'requested', requested_at = now()
   WHERE id = p_reference_id AND responded_at IS NULL;

  RETURN v_id;
END $$;

-- Opening the link. Does not consume it — a referee who reads the form and
-- comes back tomorrow has not answered.
CREATE FUNCTION reference_token_resolve(p_token_sha256 text)
  RETURNS text LANGUAGE plpgsql AS $$
DECLARE t reference_access_tokens;
BEGIN
  SELECT * INTO t FROM reference_access_tokens WHERE token_sha256 = p_token_sha256;

  IF t.id IS NULL           THEN RAISE EXCEPTION 'reference link is not valid'; END IF;
  IF t.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'reference link was revoked'; END IF;
  IF t.used_at IS NOT NULL  THEN RAISE EXCEPTION 'reference link was already used'; END IF;
  IF t.expires_at <= now()  THEN RAISE EXCEPTION 'reference link has expired'; END IF;

  UPDATE reference_access_tokens
     SET first_opened_at = COALESCE(first_opened_at, now())
   WHERE id = t.id;

  RETURN t.reference_id;
END $$;

-- The answer. One call: it consumes the token, writes the response and
-- records who acted, so an answered reference cannot be left at 'requested'.
CREATE FUNCTION reference_answer(
    p_token_sha256   text,
    p_status         reference_status,
    p_overall_rating int  DEFAULT NULL,
    p_note           text DEFAULT NULL,
    p_ip             inet DEFAULT NULL)
  RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_reference_id text;
BEGIN
  -- Phase 1 stores; it does not verify. A link can never mint 'verified'.
  IF p_status NOT IN ('unverified', 'declined') THEN
    RAISE EXCEPTION 'a reference link may record unverified or declined, not %', p_status;
  END IF;

  v_reference_id := reference_token_resolve(p_token_sha256);

  UPDATE reference_access_tokens
     SET used_at = now()
   WHERE token_sha256 = p_token_sha256;

  UPDATE references_
     SET status              = p_status,
         overall_rating      = CASE WHEN p_status = 'declined' THEN NULL ELSE p_overall_rating END,
         note                = COALESCE(p_note, note),
         responded_at        = now(),
         verification_method = 'one_time_link'
   WHERE id = v_reference_id;

  -- actor_id is the reference, not the referee: there is no referee entity,
  -- which is the point of the decision.
  INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, after, ip)
  VALUES ('referee', v_reference_id,
          CASE WHEN p_status = 'declined' THEN 'reference.declined' ELSE 'reference.answered' END,
          'reference', v_reference_id,
          jsonb_build_object('status', p_status, 'overall_rating', p_overall_rating), p_ip);

  RETURN v_reference_id;
END $$;

-- A reference whose only link has expired is 'expired', not still waiting.
-- Meant for a Cloud Tasks sweep; returns how many it moved.
CREATE FUNCTION expire_reference_requests() RETURNS int
  LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  WITH stale AS (
    SELECT r.id
    FROM   references_ r
    WHERE  r.status = 'requested'
      AND  r.responded_at IS NULL
      AND  EXISTS (SELECT 1 FROM reference_access_tokens t
                   WHERE t.reference_id = r.id AND t.used_at IS NULL)
      AND  NOT EXISTS (SELECT 1 FROM reference_access_tokens t
                       WHERE t.reference_id = r.id
                         AND t.used_at IS NULL AND t.revoked_at IS NULL
                         AND t.expires_at > now())
  )
  UPDATE references_ r SET status = 'expired'
    FROM stale WHERE r.id = stale.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- 'referee' is a fourth kind of actor: no account, no row of their own, and
-- still able to change a candidate's record.
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_type_check;
ALTER TABLE audit_log ADD  CONSTRAINT audit_log_actor_type_check
  CHECK (actor_type IN ('candidate', 'school_user', 'system', 'referee'));

COMMIT;
