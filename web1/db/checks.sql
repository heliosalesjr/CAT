-- Behavioural checks for the six actor decisions in DECISIONS.md.
--
-- Run with `npm run db:check` against a SEEDED scratch database. Every
-- statement here runs inside one transaction that the runner rolls back, so
-- the rows it writes never survive — but it is still a development tool and
-- has no business pointing at anything with real people in it.
--
-- Two helpers: check_assert() states what must be true, check_refuses() states
-- what the database must REFUSE. The second one matters more. Most of this
-- schema's value is in what it will not store, and a test suite that only
-- checks the happy path would pass against a schema with every constraint
-- dropped.

CREATE OR REPLACE FUNCTION check_assert(ok boolean, what text) RETURNS void
  LANGUAGE plpgsql AS $$
BEGIN
  IF ok THEN RAISE NOTICE 'ok    %', what;
  ELSE RAISE EXCEPTION 'FAIL  %', what; END IF;
END $$;

CREATE OR REPLACE FUNCTION check_refuses(sql text, what text) RETURNS void
  LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RAISE EXCEPTION 'FAIL  % -- it was ALLOWED', what;
EXCEPTION
  WHEN raise_exception OR check_violation OR unique_violation
    OR not_null_violation OR foreign_key_violation THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'ok    % -- %', what, left(SQLERRM, 64);
END $$;

-- ===================================================== 1 · permissions
-- The two principals the whole decision rests on.
SELECT check_assert(school_user_has('usr_his_head', 'view_salary'),
  '1 · usr_his_head holds view_salary from the principal template');
SELECT check_assert(NOT school_user_has('usr_cai_principal', 'view_salary'),
  '1 · usr_cai_principal has it revoked per-person, same role');
SELECT check_assert((SELECT count(*) FROM school_user_effective_permissions
                     WHERE school_user_id = 'usr_his_coord') = 2,
  '1 · the coordinator template grants exactly two');

-- ====================================================== 2 · one school
SELECT check_assert((SELECT max(n) FROM (SELECT count(DISTINCT school_id) AS n
                                         FROM school_users GROUP BY id) c) = 1,
  '2 · no user belongs to more than one school');

-- =================================================== 3 · role families
SELECT check_assert(candidate_seeks('tch_0001', 'teacher'),
  '3 · a chemistry teacher seeks a teaching post');
SELECT check_assert((SELECT count(*) FROM (SELECT candidate_id
                                           FROM candidate_role_families
                                           GROUP BY candidate_id
                                           HAVING count(*) > 1) m) > 0,
  '3 · some candidates want more than one kind of post');
SELECT check_assert(
  (SELECT role_families FROM candidates_with_role_families WHERE id = 'tch_0001')
    @> ARRAY['teacher']::role_family[],
  '3 · the flattened view agrees with the table');

-- An undeclared candidate is unfiltered, not excluded: 136 profiles predate
-- the question and dropping them would look exactly like a matching bug.
INSERT INTO candidates (id, first_name, last_name, timezone)
  VALUES ('tch_check_new', 'Undeclared', 'Profile', 'UTC');
SELECT check_assert(candidate_seeks_posting('tch_check_new', 'job_his_counsel'),
  '3 · a candidate who has declared nothing matches anything');
SELECT check_assert(NOT candidate_seeks_posting('tch_0001', 'job_his_counsel'),
  '3 · a declared teacher does not match the counsellor posting');
SELECT check_assert(candidate_seeks_posting('tch_0001', 'job_his_chem'),
  '3 · ... and does match the chemistry posting');

-- =================================================== 4 · never taught
SELECT check_assert((SELECT count(*) FROM candidates
                     WHERE specialisms @> ARRAY['Counseling']) > 0,
  '4 · the bundle''s counsellors carry a specialism');
-- The librarian the schema could not describe before this decision.
INSERT INTO candidates (id, first_name, last_name, timezone, subjects, specialisms)
  VALUES ('tch_check_lib', 'Never', 'Taught', 'UTC', '{}', '{Library & Media}');
INSERT INTO candidate_role_families (candidate_id, role_family)
  VALUES ('tch_check_lib', 'support_staff');
SELECT check_assert((SELECT subjects = '{}' AND specialisms <> '{}'
                     FROM candidates WHERE id = 'tch_check_lib'),
  '4 · a profile with no taught subject at all is storable');
SELECT check_assert(candidate_seeks_posting('tch_check_lib', 'job_his_counsel'),
  '4 · ... and matches a student-support posting');
SELECT check_assert(NOT candidate_seeks_posting('tch_check_lib', 'job_his_chem'),
  '4 · ... and is kept out of the chemistry shortlist');

-- =================================================== 5 · referee link
-- ref_0003 is the one that has been waiting 21 days in the bundle.
SELECT reference_token_issue('ref_0003', repeat('a', 64));
SELECT check_assert((SELECT status = 'requested' FROM references_ WHERE id = 'ref_0003'),
  '5 · issuing a link puts the reference back in requested');
SELECT check_refuses($$INSERT INTO reference_access_tokens
    (reference_id, token_sha256, sent_to_email, expires_at)
    VALUES ('ref_0003', 'NOT-A-DIGEST', 'x@y.z', now() + interval '1 day')$$,
  '5 · the column refuses anything that is not a sha256 digest');
SELECT check_refuses($$INSERT INTO reference_access_tokens
    (reference_id, token_sha256, sent_to_email, expires_at)
    VALUES ('ref_0003', repeat('b', 64), 'x@y.z', now() + interval '1 day')$$,
  '5 · a second live link for the same reference is refused');

-- A reminder issues a replacement, and the first one stops working.
SELECT reference_token_issue('ref_0003', repeat('c', 64));
SELECT check_assert((SELECT revoked_at IS NOT NULL AND revoked_reason IS NOT NULL
                     FROM reference_access_tokens WHERE token_sha256 = repeat('a', 64)),
  '5 · re-issuing revokes the previous link and says why');
SELECT check_refuses($$SELECT reference_token_resolve(repeat('a', 64))$$,
  '5 · the revoked link no longer opens');
SELECT check_refuses($$SELECT reference_token_resolve(repeat('f', 64))$$,
  '5 · an unknown link does not open');

-- Opening the form is not answering it.
SELECT check_assert(reference_token_resolve(repeat('c', 64)) = 'ref_0003',
  '5 · the live link opens and returns its reference');
SELECT check_assert((SELECT first_opened_at IS NOT NULL AND used_at IS NULL
                     FROM reference_access_tokens WHERE token_sha256 = repeat('c', 64)),
  '5 · opening records the visit and consumes nothing');
SELECT check_refuses($$SELECT reference_answer(repeat('c', 64), 'verified')$$,
  '5 · a link can never mint a verified reference in phase 1');
SELECT check_assert(
  reference_answer(repeat('c', 64), 'unverified', 5, 'Excellent colleague.') = 'ref_0003',
  '5 · answering records the response');
SELECT check_assert((SELECT status = 'unverified' AND overall_rating = 5
                     AND responded_at IS NOT NULL AND verification_method = 'one_time_link'
                     FROM references_ WHERE id = 'ref_0003'),
  '5 · ... on the reference itself, with the method named');
SELECT check_assert((SELECT count(*) FROM audit_log
                     WHERE actor_type = 'referee' AND entity_id = 'ref_0003') = 1,
  '5 · ... and in the audit log, as a referee');
SELECT check_refuses(
  $$SELECT reference_answer(repeat('c', 64), 'unverified', 1, 'Changed my mind.')$$,
  '5 · the link is single-use');

-- Expiry. A link cannot be issued already expired, so an aged one is written
-- directly, as if it had been emailed 20 days ago.
SELECT check_refuses(
  $$SELECT reference_token_issue('ref_0004', repeat('d', 64), interval '-1 second')$$,
  '5 · a link cannot be issued already expired');
INSERT INTO reference_access_tokens
    (reference_id, token_sha256, sent_to_email, created_at, expires_at)
  VALUES ('ref_0004', repeat('d', 64), 'referee@example.test',
          now() - interval '20 days', now() - interval '6 days');
SELECT check_refuses($$SELECT reference_token_resolve(repeat('d', 64))$$,
  '5 · an expired link does not open');
UPDATE references_ SET status = 'requested', responded_at = NULL WHERE id = 'ref_0004';
SELECT check_assert(expire_reference_requests() = 1,
  '5 · the sweep moves a reference whose only link expired');
SELECT check_assert((SELECT status = 'expired' FROM references_ WHERE id = 'ref_0004'),
  '5 · ... to expired, rather than leaving it waiting forever');

-- ================================================== 6 · platform staff
INSERT INTO platform_users (id, email, first_name, role)
  VALUES ('plt_check_founder', 'founder@classact.example', 'Founder', 'owner');

-- Tagged $plat$ because the statements it tests are themselves $$-quoted.
DO $plat$
DECLARE v_doc text; v_candidate text;
BEGIN
  SELECT id, candidate_id INTO v_doc, v_candidate
  FROM   documents WHERE status <> 'missing' ORDER BY id LIMIT 1;

  -- 0007's three conditions, unchanged by this migration set.
  PERFORM check_assert(may_read_document('usr_his_hr', v_doc),
    '6 · a school user with view_documents and a screened application may read');
  PERFORM check_assert(NOT may_read_document('usr_his_coord', v_doc),
    '6 · a coordinator at the same school, lacking view_documents, may not');
  PERFORM check_assert(NOT may_read_document('usr_cai_principal', v_doc),
    '6 · a principal who holds view_documents but had no application may not');

  PERFORM check_assert(platform_may_read_document('plt_check_founder', v_doc),
    '6 · a founder may read anything');
  PERFORM check_assert(NOT platform_may_read_document('plt_check_nobody', v_doc),
    '6 · someone who is not platform staff may not');

  INSERT INTO document_access_log (document_id, candidate_id, platform_user_id, action)
    VALUES (v_doc, v_candidate, 'plt_check_founder', 'signed_url_issued');
  PERFORM check_assert((SELECT count(*) FROM document_access_log
                        WHERE platform_user_id = 'plt_check_founder') = 1,
    '6 · a founder''s look is logged');
  PERFORM check_assert((SELECT reader_id = 'plt_check_founder' AND reader_name = 'Founder'
                        FROM document_access_log_readable
                        WHERE reader_type = 'platform_user'),
    '6 · ... and reads back named, in the same view as a school user''s');

  PERFORM check_refuses(format($$INSERT INTO document_access_log
      (document_id, candidate_id, school_user_id, school_id, action)
      VALUES (%L, %L, 'usr_cai_principal', 'sch_andino', 'signed_url_issued')$$,
      v_doc, v_candidate),
    '6 · the log refuses to record a read the rule would have denied');
  PERFORM check_refuses(format($$INSERT INTO document_access_log
      (document_id, candidate_id, school_user_id, school_id, platform_user_id)
      VALUES (%L, %L, 'usr_his_hr', 'sch_hangang', 'plt_check_founder')$$,
      v_doc, v_candidate),
    '6 · a row cannot name two readers at once');
END $plat$;

-- The condition the founders attached to seeing everything: the log is not
-- editable by the people it is there to hold to account.
SELECT check_refuses($$UPDATE document_access_log
    SET platform_user_id = NULL, school_user_id = 'usr_his_hr', school_id = 'sch_hangang'
    WHERE platform_user_id = 'plt_check_founder'$$,
  '6 · a logged look cannot be reassigned to someone else');
SELECT check_refuses(
  $$DELETE FROM document_access_log WHERE platform_user_id = 'plt_check_founder'$$,
  '6 · a logged look cannot be deleted');
SELECT check_refuses($$UPDATE audit_log SET action = 'nothing.happened'$$,
  '6 · audit_log cannot be rewritten');
SELECT check_refuses($$DELETE FROM audit_log$$,
  '6 · audit_log cannot be emptied');

-- The single exception: the erasure flow in 0011 stamping the subject.
UPDATE document_access_log SET subject_anonymised_at = now(), ip = NULL, user_agent = NULL
  WHERE platform_user_id = 'plt_check_founder';
SELECT check_assert((SELECT subject_anonymised_at IS NOT NULL FROM document_access_log
                     WHERE platform_user_id = 'plt_check_founder'),
  '6 · ... except stamping the subject as anonymised, which is allowed');
SELECT check_refuses($$UPDATE document_access_log
    SET subject_anonymised_at = now() - interval '1 day'
    WHERE platform_user_id = 'plt_check_founder'$$,
  '6 · and that stamp cannot be moved once it is set');
