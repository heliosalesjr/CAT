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

-- =============================================== 7 · identity (0015)
-- One person is one actor: the same identity cannot hold both roles, and
-- neither can the same email.
INSERT INTO users (id, email) VALUES ('usr_identity_a', 'both@example.test');
UPDATE candidates SET auth_user_id = 'usr_identity_a' WHERE id = 'tch_0001';
SELECT check_assert((SELECT actor_type FROM actor_for_identity
                     WHERE auth_user_id = 'usr_identity_a') = 'candidate',
  '7 · an identity resolves to exactly one actor');
SELECT check_refuses($$UPDATE school_users SET auth_user_id = 'usr_identity_a'
    WHERE id = 'usr_his_coord'$$,
  '7 · the same identity cannot also act for a school');
SELECT check_refuses($$UPDATE candidates SET email = 'm.szarowicz@example-his.edu'
    WHERE id = 'tch_0002'$$,
  '7 · a school user''s email cannot be reused for a candidate account');
SELECT check_assert((SELECT count(*) FROM candidates WHERE id LIKE 'cnd_%') = 0
                AND (SELECT id FROM candidates
                     WHERE id = (SELECT id FROM candidates ORDER BY created_at DESC LIMIT 0)
                     LIMIT 1) IS NULL,
  '7 · the bundle keeps its own ids; new rows get a generated one');

-- ====================================== 8 · school affiliation (0016)
-- Step one of the signup form: the work email finds the school.
SELECT check_assert((SELECT school_id FROM schools_for_email('new.hire@example-his.edu'))
                    = 'sch_hangang',
  '8 · a work email selects its school with no human in the loop');
SELECT check_assert(NOT EXISTS (SELECT 1 FROM schools_for_email('someone@gmail.com')),
  '8 · a public address selects nothing');
SELECT check_assert(email_proves_affiliation('new.hire@example-his.edu', 'sch_hangang')
                AND NOT email_proves_affiliation('new.hire@example-his.edu', 'sch_accra'),
  '8 · and proves affiliation to that school only');
SELECT check_refuses($$INSERT INTO school_email_domains (school_id, domain, verified_at, verified_by_id)
    VALUES ('sch_accra', 'gmail.com', now(), 'plt_seed')$$,
  '8 · a public provider cannot stand for a school');

-- Layer 3: pending means nothing, whatever the role says.
INSERT INTO school_users (id, school_id, role, first_name, email)
  VALUES ('usr_pending', 'sch_hangang', 'hr', 'Unproved', 'claim@example-his.edu');
SELECT check_assert((SELECT count(*) FROM school_user_effective_permissions
                     WHERE school_user_id = 'usr_pending') = 0,
  '8 · an unverified school user resolves to zero permissions');
SELECT check_assert(NOT school_user_has('usr_pending', 'view_documents'),
  '8 · ... so the hr template gives them nothing');
SELECT check_assert(NOT may_read_document('usr_pending',
                     (SELECT id FROM documents WHERE status <> 'missing' ORDER BY id LIMIT 1)),
  '8 · ... and they cannot reach a candidate''s documents');
SELECT check_refuses($$SELECT school_invite_issue('sch_hangang', 'x@example-his.edu',
    'coordinator', 'usr_pending', repeat('1', 64))$$,
  '8 · ... and cannot invite anybody either');

-- Invites: the same credential discipline as the referee link.
SELECT check_refuses($$SELECT school_invite_issue('sch_hangang', 'x@example-his.edu',
    'coordinator', 'usr_his_coord', repeat('2', 64))$$,
  '8 · a coordinator without manage_users cannot invite');
SELECT school_invite_issue('sch_hangang', 'newcoord@example-his.edu',
                           'coordinator', 'usr_his_hr', repeat('3', 64));
-- A reminder issues a replacement and the first link stops working, the same
-- discipline the referee link follows in 0013.
SELECT school_invite_issue('sch_hangang', 'newcoord@example-his.edu',
                           'coordinator', 'usr_his_hr', repeat('4', 64));
SELECT check_assert((SELECT revoked_at IS NOT NULL AND revoked_reason IS NOT NULL
                     FROM school_user_invites WHERE token_sha256 = repeat('3', 64)),
  '8 · re-inviting revokes the previous invite and says why');
INSERT INTO users (id, email) VALUES ('usr_invitee', 'newcoord@example-his.edu');
SELECT check_refuses($$SELECT school_invite_accept(repeat('3', 64), 'usr_invitee')$$,
  '8 · the superseded invite no longer opens');
SELECT check_assert(school_invite_accept(repeat('4', 64), 'usr_invitee', 'New', 'Coord')
                    IS NOT NULL,
  '8 · accepting the live invite creates the school user');
SELECT check_assert((SELECT verified_at IS NOT NULL AND verification_method = 'invite'
                     FROM school_users WHERE auth_user_id = 'usr_invitee'),
  '8 · ... already verified, because a verified colleague vouched');
SELECT check_assert(school_user_has(
                     (SELECT id FROM school_users WHERE auth_user_id = 'usr_invitee'),
                     'move_stage'),
  '8 · ... and their role template now resolves');
SELECT check_refuses($$SELECT school_invite_accept(repeat('4', 64), 'usr_invitee')$$,
  '8 · an invite is single-use');

-- ======================================= 9 · practice catalog (0017)
SELECT check_refuses($$UPDATE candidates SET subjects = ARRAY['Maths'] WHERE id = 'tch_0001'$$,
  '9 · "Maths" is not a subject anybody can store');
SELECT check_refuses($$UPDATE candidates SET subjects = ARRAY['Counseling'] WHERE id = 'tch_0001'$$,
  '9 · a practice cannot be filed as a taught subject');
SELECT check_assert((SELECT count(*) FROM practice_options WHERE kind = 'specialism') >= 6,
  '9 · the specialisms decision 4 opened are in the picker');

-- ================================== 10 · profile completeness (0018)
SELECT check_assert((SELECT sum(weight) FROM candidates c, candidate_completeness_breakdown(c)
                     WHERE c.id = 'tch_0001') = 100,
  '10 · the weights sum to 100');
INSERT INTO candidates (id, first_name, last_name, timezone)
  VALUES ('tch_check_bare', 'Just', 'Signed-up', 'UTC');
SELECT check_assert((SELECT profile_completeness < rankable_threshold()
                     FROM candidates WHERE id = 'tch_check_bare'),
  '10 · a profile with only step one is not rankable');
SELECT check_assert(NOT candidate_is_rankable('tch_check_bare'),
  '10 · ... and rule 6 says so through one function');
UPDATE candidates SET headline = 'x', nationality = 'United States',
       subjects = ARRAY['Mathematics'], curriculum_experience = ARRAY['IB_DP']::curriculum[]
  WHERE id = 'tch_check_bare';
SELECT check_assert((SELECT profile_completeness FROM candidates WHERE id = 'tch_check_bare') > 0,
  '10 · filling the form moves the number without anybody writing it');
-- The dial: replacing the threshold inside this transaction changes every
-- answer at once, which is what "easy to change" has to mean.
CREATE OR REPLACE FUNCTION rankable_threshold() RETURNS int
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT 99 $$;
SELECT check_assert((SELECT count(*) FROM candidates WHERE profile_completeness >= 99)
                    = (SELECT sum(rankable) FROM candidate_completeness_bands),
  '10 · moving the threshold moves the rankable set, with nothing to backfill');

-- ============================================ 12 · the staff actions (0020)
-- Three things a founder does by hand, and what each one refuses.

INSERT INTO platform_users (id, email, first_name, role)
  VALUES ('plt_check_staff', 'queue.staff@example.test', 'Queue', 'owner');
INSERT INTO platform_users (id, email, first_name, role, deleted_at)
  VALUES ('plt_check_gone', 'left@example.test', 'Gone', 'staff', now());

-- A school nobody has verified, registered the way the form registers one.
INSERT INTO schools (id, name, country, timezone, phone, address_line)
  VALUES ('sch_check_new', 'Check International', 'Testland', 'UTC',
          '+1 555 0199', '9 Test Street');
INSERT INTO school_email_domains (school_id, domain)
  VALUES ('sch_check_new', 'check-international.test');
INSERT INTO school_users (id, school_id, role, first_name, email)
  VALUES ('usr_check_new', 'sch_check_new', 'hr', 'Unconfirmed',
          'head@check-international.test');

SELECT check_assert((SELECT count(*) FROM platform_pending_schools
                     WHERE school_id = 'sch_check_new') = 1,
  '12 · a self-registered school lands in the queue');
SELECT check_assert((SELECT domains_claimed FROM platform_pending_schools
                     WHERE school_id = 'sch_check_new')
                    @> ARRAY['check-international.test'],
  '12 · ... carrying the domain it claims, so one screen is enough to judge it');
SELECT check_assert((SELECT registered_by_email FROM platform_pending_schools
                     WHERE school_id = 'sch_check_new') = 'head@check-international.test',
  '12 · ... and who registered it');

-- Removed staff cannot act, however the request reaches the function.
SELECT check_refuses($$SELECT platform_verify_school('plt_check_gone', 'sch_check_new')$$,
  '12 · a founder who was removed cannot verify a school');
SELECT check_refuses($$SELECT platform_confirm_school_user('plt_check_gone', 'usr_check_new')$$,
  '12 · ... nor confirm a person');
SELECT check_refuses(
  $$SELECT platform_prove_domain('plt_check_gone', 'sch_check_new', 'check-international.test')$$,
  '12 · ... nor prove a domain');

-- Verifying.
SELECT check_assert(platform_verify_school('plt_check_staff', 'sch_check_new')
                    = 'sch_check_new',
  '12 · staff verify the school');
SELECT check_assert((SELECT verification_status = 'verified' AND verified_at IS NOT NULL
                     FROM schools WHERE id = 'sch_check_new'),
  '12 · ... and it reads back verified');
SELECT check_assert((SELECT count(*) FROM audit_log
                     WHERE action = 'school.verified' AND entity_id = 'sch_check_new'
                       AND actor_type = 'platform_user') = 1,
  '12 · ... with the founder named in the append-only log');
SELECT check_refuses($$SELECT platform_verify_school('plt_check_staff', 'sch_check_new')$$,
  '12 · verifying twice is refused rather than silently repeated');
SELECT check_refuses($$SELECT platform_verify_school('plt_check_staff', 'sch_nope')$$,
  '12 · a school that does not exist is refused');

-- Confirming a person is what turns the role template on.
SELECT check_assert((SELECT count(*) FROM school_user_effective_permissions
                     WHERE school_user_id = 'usr_check_new') = 0,
  '12 · an unconfirmed hr user still holds nothing, verified school or not');
SELECT check_assert(platform_confirm_school_user('plt_check_staff', 'usr_check_new')
                    = 'usr_check_new',
  '12 · staff confirm the person');
SELECT check_assert(school_user_has('usr_check_new', 'view_documents'),
  '12 · ... and only now does hr mean hr');
SELECT check_assert((SELECT verification_method = 'manual' AND verified_by_id = 'plt_check_staff'
                     FROM school_users WHERE id = 'usr_check_new'),
  '12 · ... recorded as a human decision, not as a domain match');
SELECT check_refuses($$SELECT platform_confirm_school_user('plt_check_staff', 'usr_check_new')$$,
  '12 · confirming an already-confirmed person is refused');

-- Proving a domain, the one that keeps acting.
SELECT check_assert(NOT EXISTS (SELECT 1 FROM schools_for_email('new@check-international.test')),
  '12 · an unproved domain lets nobody in');
SELECT check_assert(platform_prove_domain('plt_check_staff', 'sch_check_new',
                                          'CHECK-INTERNATIONAL.TEST')
                    = 'check-international.test',
  '12 · staff prove the domain, case and spacing forgiven');
SELECT check_assert((SELECT school_id FROM schools_for_email('new@check-international.test'))
                    = 'sch_check_new',
  '12 · ... and from now on that address selects this school on its own');
SELECT check_refuses(
  $$SELECT platform_prove_domain('plt_check_staff', 'sch_check_new', 'check-international.test')$$,
  '12 · proving the same domain twice is refused');
SELECT check_refuses($$SELECT platform_prove_domain('plt_check_staff', 'sch_check_new', 'gmail.com')$$,
  '12 · a public provider cannot be proved for a school, even by staff');

-- The undo needs a reason, because the log is the only record of why.
SELECT check_refuses($$SELECT platform_unverify_school('plt_check_staff', 'sch_check_new', '  ')$$,
  '12 · un-verifying without a reason is refused');
SELECT check_assert(platform_unverify_school('plt_check_staff', 'sch_check_new',
                                             'phone number was a mobile') = 0,
  '12 · with a reason it goes back to pending, parking 0 live postings');
SELECT check_assert((SELECT count(*) FROM platform_pending_schools
                     WHERE school_id = 'sch_check_new') = 1,
  '12 · ... and reappears in the queue');

-- ============================================= 13 · posting a role (0021)

-- sch_accra is pending in the bundle, and its two roles were parked on load.
SELECT check_assert((SELECT verification_status FROM schools WHERE id = 'sch_accra')
                    <> 'verified',
  '13 · the bundle has one school still waiting on us');
SELECT check_refuses($$UPDATE job_postings SET status = 'posted' WHERE id = 'job_aia_sci'$$,
  '13 · a pending school cannot put a role back on air');
SELECT check_assert((SELECT count(*) FROM job_postings j JOIN schools s ON s.id = j.school_id
                     WHERE j.status = 'posted' AND s.verification_status <> 'verified') = 0,
  '13 · so no live role anywhere belongs to an unverified school');

-- Drafting is still allowed while waiting.
UPDATE job_postings SET status = 'draft' WHERE id = 'job_aia_sci';
SELECT check_assert((SELECT status FROM job_postings WHERE id = 'job_aia_sci') = 'draft',
  '13 · ... but it may still write them as drafts');

-- Verify the school and the same role goes live.
INSERT INTO platform_users (id, email, first_name, role)
  VALUES ('plt_check_post', 'post.staff@example.test', 'Post', 'owner');
SELECT platform_verify_school('plt_check_post', 'sch_accra');
UPDATE job_postings SET status = 'posted' WHERE id = 'job_aia_sci';
SELECT check_assert((SELECT status FROM job_postings WHERE id = 'job_aia_sci') = 'posted',
  '13 · verifying the school is what lets the role go live');

-- And un-verifying takes them off air again, counting what it parked.
SELECT check_assert(platform_unverify_school('plt_check_post', 'sch_accra', 'spot check') = 1,
  '13 · un-verifying parks the live roles and says how many');
SELECT check_assert((SELECT status FROM job_postings WHERE id = 'job_aia_sci') = 'on_hold',
  '13 · ... as on_hold, because the school meant to be hiring');

-- The author must hold post_jobs at that school.
SELECT check_refuses($$INSERT INTO job_postings
    (school_id, created_by_id, title, ranking_criteria)
    VALUES ('sch_hangang', 'usr_his_coord', 'Posted by a coordinator',
            ARRAY['years_experience','curriculum_match','advanced_degree'])$$,
  '13 · a coordinator cannot be recorded as having posted a role');
SELECT check_refuses($$INSERT INTO job_postings
    (school_id, created_by_id, title, ranking_criteria)
    VALUES ('sch_hangang', 'usr_cai_hr', 'Posted from another school',
            ARRAY['years_experience','curriculum_match','advanced_degree'])$$,
  '13 · nor can somebody from a different school');

-- A posting with no author is allowed: an importer has no human behind it.
INSERT INTO job_postings (id, school_id, title, ranking_criteria)
  VALUES ('job_check_noauthor', 'sch_hangang', 'Imported role',
          ARRAY['years_experience','curriculum_match','advanced_degree']);
SELECT check_assert((SELECT created_by_id IS NULL FROM job_postings
                     WHERE id = 'job_check_noauthor'),
  '13 · but no author at all is fine, and honest');

-- The criteria rules from 0004 still hold on this path.
SELECT check_refuses($$INSERT INTO job_postings (school_id, title, ranking_criteria)
    VALUES ('sch_hangang', 'Too few', ARRAY['years_experience','curriculum_match'])$$,
  '13 · fewer than three criteria is refused');
SELECT check_refuses($$INSERT INTO job_postings (school_id, title, ranking_criteria)
    VALUES ('sch_hangang', 'Repeated', ARRAY['years_experience','years_experience','local_hire'])$$,
  '13 · a repeated criterion is refused, because it would double a weight');
SELECT check_refuses($$INSERT INTO job_postings (school_id, title, ranking_criteria)
    VALUES ('sch_hangang', 'Invented', ARRAY['vibes','years_experience','local_hire'])$$,
  '13 · a criterion nobody catalogued is refused');

-- Weights come from position alone, and the generated id works.
SELECT check_assert((SELECT id FROM job_postings WHERE title = 'Imported role')
                    LIKE 'job_%',
  '13 · a posting created without an id gets one');
SELECT check_assert(criterion_weight(1, 5) = 0.333 AND criterion_weight(5, 5) = 0.067,
  '13 · first of five is worth five times the last');
SELECT check_assert(criterion_weight(1, 3) = 0.500,
  '13 · and first of three is worth half of everything');
