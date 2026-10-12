#!/usr/bin/env node
/**
 * Loads docs/mock-data.json into the database.
 *
 * The bundle still calls the person a teacher; the schema calls them a
 * candidate, because a third of the postings are leadership or student-support
 * roles and not everyone who applies teaches. This file is the only place the
 * two vocabularies meet: it reads `teachers` and writes `candidates`, and
 * translates the few string values that name the type. The mock is untouched.
 *
 *   DATABASE_URL=postgres://... node db/seed.mjs [--reset] [--check-only]
 *
 *   --reset       truncate the seeded tables first (refuses unless
 *                 ALLOW_RESET=1, so a production URL cannot be wiped by a
 *                 stray flag)
 *   --check-only  run the pre-flight checks and exit without writing
 *
 * The whole load is one transaction: either the bundle lands intact or the
 * database is untouched.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HERE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(HERE, '..', 'docs', 'mock-data.json'), 'utf8'));

const reset = process.argv.includes('--reset');
const checkOnly = process.argv.includes('--check-only');

const CATALOG = data.criteriaCatalog.map((c) => c.id).sort();
const problems = [];   // block the load
const warnings = [];   // load anyway, but say so
const note = (m) => problems.push(m);
const warn = (m) => warnings.push(m);

// ---------------------------------------------------------------------------
// Pre-flight. Everything below is checked BEFORE a single row is written, so a
// bad bundle fails in a second with a list rather than halfway through on a
// constraint violation.
// ---------------------------------------------------------------------------

function preflight() {
  console.log('Pre-flight\n');

  // The headline check: all 155 applications carry a score AND a note for all
  // ten catalog criteria. This is what makes reorder-and-swap work entirely
  // client-side — a single gap and the recruiter's drag produces a wrong list.
  let withScores = 0, withNotes = 0;
  const missingScores = [], missingNotes = [], badRange = [], blankNotes = [];

  for (const a of data.applications) {
    const s = Object.keys(a.criterionScores ?? {}).sort();
    const n = Object.keys(a.criterionNotes ?? {}).sort();

    if (s.join() === CATALOG.join()) withScores++;
    else missingScores.push(`${a.id}: ${CATALOG.filter((c) => !s.includes(c)).join(', ') || 'extra keys'}`);

    if (n.join() === CATALOG.join()) withNotes++;
    else missingNotes.push(`${a.id}: ${CATALOG.filter((c) => !n.includes(c)).join(', ') || 'extra keys'}`);

    for (const [k, v] of Object.entries(a.criterionScores ?? {}))
      if (!Number.isInteger(v) || v < 0 || v > 100) badRange.push(`${a.id}.${k} = ${v}`);
    for (const [k, v] of Object.entries(a.criterionNotes ?? {}))
      if (typeof v !== 'string' || !v.trim()) blankNotes.push(`${a.id}.${k}`);
  }

  const total = data.applications.length;
  console.log(`  applications                 ${total}`);
  console.log(`  with all ${CATALOG.length} criterionScores  ${withScores}/${total}`);
  console.log(`  with all ${CATALOG.length} criterionNotes   ${withNotes}/${total}`);
  console.log(`  scores within 0-100          ${total * CATALOG.length - badRange.length}/${total * CATALOG.length}`);
  console.log(`  notes non-empty              ${total * CATALOG.length - blankNotes.length}/${total * CATALOG.length}`);

  for (const [label, list] of [['missing scores', missingScores], ['missing notes', missingNotes],
                               ['score out of range', badRange], ['blank note', blankNotes]])
    if (list.length) note(`${list.length} ${label}: ${list.slice(0, 5).join(' | ')}${list.length > 5 ? ' ...' : ''}`);

  // Rule 6: below the threshold there is no score, and never a zero.
  for (const a of data.applications) {
    if (a.rankable === false && a.aiRankScore !== null) note(`${a.id}: not rankable but scored ${a.aiRankScore}`);
    if (a.rankable === true && a.aiRankScore === null) note(`${a.id}: rankable but unscored`);
    if (a.rankable === false && !a.notRankableReason) note(`${a.id}: not rankable with no reason`);
  }

  // Referential integrity, since the FKs would otherwise report one row at a time.
  const ids = (k) => new Set(data[k].map((r) => r.id));
  const [T, S, J, U, P] = [ids('teachers'), ids('schools'), ids('jobPostings'), ids('schoolUsers'), ids('plans')];
  for (const a of data.applications) {
    if (!T.has(a.teacherId)) note(`${a.id}: unknown candidate ${a.teacherId}`);
    if (!J.has(a.jobPostingId)) note(`${a.id}: unknown posting ${a.jobPostingId}`);
  }
  for (const j of data.jobPostings) {
    if (!S.has(j.schoolId)) note(`${j.id}: unknown school ${j.schoolId}`);
    const unknown = j.rankingCriteria.filter((c) => !CATALOG.includes(c));
    if (unknown.length) note(`${j.id}: unknown criteria ${unknown.join(', ')}`);
    if (j.rankingCriteria.length < 3 || j.rankingCriteria.length > 5)
      note(`${j.id}: ${j.rankingCriteria.length} criteria, must be 3-5`);
    if (new Set(j.rankingCriteria).size !== j.rankingCriteria.length)
      note(`${j.id}: duplicate criteria`);
  }
  // Salary ranges, against the CHECK constraints in 0003 and 0004. 30 of the
  // 136 candidates carry min > max — generated as two independent draws from
  // the same pool rather than as an ordered pair — and the database refuses
  // every one of them. Listed rather than corrected here: the bundle is the
  // schema contract and fixing it is the generator's job, not the loader's.
  const inverted = data.teachers.filter((t) =>
    t.salaryExpectationMinUsd != null && t.salaryExpectationMaxUsd != null &&
    t.salaryExpectationMaxUsd < t.salaryExpectationMinUsd);
  if (inverted.length)
    note(`${inverted.length} candidate(s) expect a salary range that runs backwards ` +
         `(min > max), which 0003 refuses: ` +
         inverted.slice(0, 5).map((t) => `${t.id} ${t.salaryExpectationMinUsd}>${t.salaryExpectationMaxUsd}`).join(', ') +
         (inverted.length > 5 ? `, +${inverted.length - 5} more` : ''));
  for (const j of data.jobPostings) {
    if (j.salaryMinUsd != null && j.salaryMaxUsd != null && j.salaryMaxUsd < j.salaryMinUsd)
      note(`${j.id}: salary range runs backwards (${j.salaryMinUsd} > ${j.salaryMaxUsd})`);
    if (j.applyByDate && j.startDate && j.applyByDate > j.startDate)
      note(`${j.id}: applyByDate ${j.applyByDate} is after startDate ${j.startDate}`);
  }

  for (const u of data.schoolUsers) if (!S.has(u.schoolId)) note(`${u.id}: unknown school ${u.schoolId}`);
  for (const s of data.schools) if (s.planId && !P.has(s.planId)) note(`${s.id}: unknown plan ${s.planId}`);
  for (const d of data.documents) if (!T.has(d.teacherId)) note(`${d.id}: unknown candidate ${d.teacherId}`);

  // The gate, as it will be enforced by the trigger in 0006.
  const byId = new Map(data.applications.map((a) => [a.id, a]));
  for (const m of data.messages) {
    const a = byId.get(m.applicationId);
    if (!a) { note(`${m.id}: unknown application ${m.applicationId}`); continue; }
    if (!a.messagingUnlocked) note(`${m.id}: message on a locked application (${a.id}, ${a.stage})`);
    if (['rejected', 'withdrawn', 'hired'].includes(a.stage))
      note(`${m.id}: message on a closed thread (${a.id}, ${a.stage})`);
  }

  // The weighting formula, against the bundle's own stored scores. Uses the
  // exact fractions rather than rankingModel.weightsByCount: the rounded
  // weights agree to 3 decimals and sum to 1, so they make no difference here,
  // and the exact form is what CLAUDE.md specifies.
  let checked = 0, drift = 0, ties = 0;
  for (const a of data.applications) {
    if (!a.rankable) continue;
    const j = data.jobPostings.find((p) => p.id === a.jobPostingId);
    const n = j.rankingCriteria.length;
    const w = Array.from({ length: n }, (_, i) => (n - i) / ((n * (n + 1)) / 2));
    const raw = j.rankingCriteria.reduce((sum, c, i) => sum + w[i] * a.criterionScores[c], 0);
    const isTie = Math.abs(raw - Math.floor(raw) - 0.5) < 1e-9;
    if (isTie) ties++;
    checked++;
    if (Math.round(raw) !== a.aiRankScore) {
      drift++;
      // A half-point tie is a known gap in the spec, not a corrupt row.
      if (isTie) warn(`${a.id}: raw ${raw.toFixed(1)}, stored ${a.aiRankScore} (half-point tie rounded down)`);
      else note(`${a.id}: aiRankScore ${a.aiRankScore}, formula gives ${Math.round(raw)}`);
    }
  }
  console.log(`  aiRankScore matches Math.round  ${checked - drift}/${checked}`);
  if (ties) console.log(`  scores landing exactly on .5    ${ties}`);

  console.log();
  if (warnings.length) {
    console.warn(`${warnings.length} warning(s) — the bundle loads, but note:\n`);
    for (const w of warnings) console.warn(`  ! ${w}`);
    console.warn(
      '\n  The weighting formula is exact; rounding at a half point is not\n' +
      '  specified. This bundle rounds some ties up and some down, so a UI\n' +
      '  using Math.round will disagree with the stored score for the ones\n' +
      '  rounded down. Pick a rule (Math.round is the obvious one), apply it\n' +
      '  in both the generator and the client, and this disappears.\n');
  }
  if (problems.length) {
    console.error(`Pre-flight failed — ${problems.length} problem(s):\n`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log('Pre-flight clean.\n');
}

preflight();
if (checkOnly) process.exit(0);

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1); }
if (reset && process.env.ALLOW_RESET !== '1') {
  console.error('--reset refuses to run without ALLOW_RESET=1.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: true },
});
await client.connect();

const nz = (v) => (v === undefined ? null : v);
const arr = (v) => (Array.isArray(v) ? v : []);

// ---------------------------------------------------------------------------
// Decisions 3 and 4 (db/DECISIONS.md): a candidate says what kind of post they
// want and may want more than one, and work that is not a taught subject is a
// specialism rather than a subject.
//
// The bundle carries neither field — it predates both questions — so the seed
// derives them from what it does carry. The bundle itself is untouched, and
// these two values stay a reading of it: the day the profile form asks the
// question outright, this derivation is deleted rather than migrated.
//
// `Counseling` and `Learning Support` also stay in `subjects`, where the
// bundle put them, because the counsellor posting matches on subjects and
// rewriting the bundle would break the de-facto schema contract. A profile
// filled in after this change carries the specialism and no subject.
// ---------------------------------------------------------------------------
const SPECIALISMS = new Set(['Counseling', 'Learning Support']);

const specialismsOf = (x) => arr(x.subjects).filter((s) => SPECIALISMS.has(s));

function roleFamiliesOf(t) {
  const subjects = arr(t.subjects);
  const families = new Set();
  if (subjects.some((s) => !SPECIALISMS.has(s))) families.add('teacher');
  if (subjects.some((s) => SPECIALISMS.has(s))) families.add('support_staff');
  if ((t.leadershipYears ?? 0) > 0) families.add('administrator');
  // A profile with nothing to go on declares teaching rather than nothing:
  // no declaration means unfiltered (see candidate_seeks_posting), and an
  // empty set would be indistinguishable from never having been asked.
  if (!families.size) families.add('teacher');
  return [...families];
}

async function insert(table, rows, map) {
  if (!rows.length) return 0;
  const cols = Object.keys(map(rows[0]));
  const text = `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(', ')}) ` +
               `VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`;
  for (const r of rows) await client.query(text, cols.map((c) => nz(map(r)[c])));
  return rows.length;
}

const SEEDED = ['document_access_log', 'audit_log', 'notifications', 'messages', 'super_likes',
  'interviews', 'references_', 'documents', 'application_stage_history', 'applications',
  'job_postings', 'criteria_catalog', 'school_user_grants', 'school_users',
  'candidate_role_families', 'candidates',
  'subscriptions', 'schools', 'plans', 'platform_settings'];

/** The bundle's word for the person, in the schema's vocabulary. */
const party = (t) => (t === 'teacher' ? 'candidate' : t);

try {
  await client.query('BEGIN');

  if (reset) {
    console.log('Resetting seeded tables ...');
    await client.query(`TRUNCATE ${SEEDED.join(', ')} RESTART IDENTITY CASCADE`);
    await client.query('INSERT INTO platform_settings DEFAULT VALUES');
  }

  const n = {};

  n.plans = await insert('plans', data.plans, (p) => ({
    id: p.id, name: p.name, price_usd_monthly: p.priceUsdMonthly ?? 0,
    stripe_price_id: p.stripePriceId, job_posting_limit: p.jobPostingLimit,
    application_limit_per_cycle: p.applicationLimitPerCycle, seats: p.seats,
    // plan_teacher_free / plan_teacher_pro carry null here; the column is NOT NULL.
    ai_ranking_enabled: p.aiRankingEnabled ?? false,
    custom_ranking_criteria: p.customRankingCriteria ?? false,
    candidate_search_enabled: p.candidateSearchEnabled ?? false,
    profile_boost: p.profileBoost ?? false,
  }));

  n.schools = await insert('schools', data.schools, (s) => ({
    id: s.id, name: s.name, short_name: s.shortName, city: s.city, country: s.country,
    country_code: s.countryCode, region: s.region, timezone: s.timezone, website: s.website,
    description: s.description, founded_year: s.foundedYear, student_count: s.studentCount,
    curricula: arr(s.curricula), divisions: arr(s.divisions), benefits_summary: s.benefitsSummary,
    logo_url: s.logoUrl, hero_image_url: s.heroImageUrl, candidate_rating: s.teacherRating,
    rating_count: s.ratingCount ?? 0, average_response_days: s.averageResponseDays,
    verification_status: s.verificationStatus ?? 'pending', verified_at: s.verifiedAt,
    plan_id: s.planId, created_at: s.createdAt ?? new Date().toISOString(),
  }));

  n.school_users = await insert('school_users', data.schoolUsers, (u) => ({
    id: u.id, school_id: u.schoolId, role: u.role, first_name: u.firstName,
    last_name: u.lastName, email: u.email, title: u.title, avatar_url: u.avatarUrl,
    last_active_at: u.lastActiveAt,
  }));

  // The per-user delta, derived rather than copied: whatever the role template
  // does not already give is a grant, whatever it gives and the user lacks is a
  // revoke. This is the usr_cai_principal / view_salary case.
  const { rows: rolePerms } = await client.query('SELECT role_code, permission FROM role_permissions');
  const byRole = new Map();
  for (const r of rolePerms) {
    if (!byRole.has(r.role_code)) byRole.set(r.role_code, new Set());
    byRole.get(r.role_code).add(r.permission);
  }
  const grants = [];
  for (const u of data.schoolUsers) {
    const have = new Set(u.permissions ?? []);
    const template = byRole.get(u.role) ?? new Set();
    for (const p of have) if (!template.has(p)) grants.push({ u: u.id, p, granted: true });
    for (const p of template) if (!have.has(p)) grants.push({ u: u.id, p, granted: false });
  }
  n.school_user_grants = await insert('school_user_grants', grants, (g) => ({
    school_user_id: g.u, permission: g.p, granted: g.granted,
    reason: g.granted ? 'granted beyond role template (from seed)' : 'revoked from role template (from seed)',
  }));

  n.candidates = await insert('candidates', data.teachers, (t) => ({
    id: t.id, first_name: t.firstName, last_name: t.lastName, headline: t.headline,
    avatar_url: t.avatarUrl, intro_video_url: t.introVideoUrl, linkedin_url: t.linkedinUrl,
    current_school: t.currentSchool, current_city: t.currentCity, current_country: t.currentCountry,
    timezone: t.timezone, nationality: t.nationality, nationalities: arr(t.nationalities),
    languages: arr(t.languages), subjects: arr(t.subjects),
    specialisms: specialismsOf(t), grade_levels: arr(t.gradeLevels),
    curriculum_experience: arr(t.curriculumExperience), regions_worked: arr(t.regionsWorked),
    preferred_regions: arr(t.preferredRegions), highest_degree: t.highestDegree,
    degree_field: t.degreeField, years_experience: t.yearsExperience ?? 0,
    years_in_subject: t.yearsInSubject, leadership_years: t.leadershipYears ?? 0,
    first_time_international: t.firstTimeInternational ?? false,
    coaching_capable: t.coachingCapable ?? false, coaching_activities: arr(t.coachingActivities),
    dependents: t.dependents ?? 0, available_from: t.availableFrom,
    salary_expectation_min_usd: t.salaryExpectationMinUsd,
    salary_expectation_max_usd: t.salaryExpectationMaxUsd,
    profile_completeness: t.profileCompleteness ?? 0,
    profile_visibility: t.profileVisibility ?? 'public', premium_member: t.premiumMember ?? false,
    last_active_at: t.lastActiveAt, created_at: t.createdAt ?? new Date().toISOString(),
  }));

  const declarations = data.teachers.flatMap((t) =>
    roleFamiliesOf(t).map((family) => ({ candidate: t.id, family })));
  n.candidate_role_families = await insert('candidate_role_families', declarations,
    (d) => ({ candidate_id: d.candidate, role_family: d.family }));

  // partner_candidate_id is a self-reference, so it waits for every row to exist.
  let couples = 0;
  for (const t of data.teachers) if (t.partnerTeacherId) {
    await client.query('UPDATE candidates SET partner_candidate_id = $2 WHERE id = $1',
      [t.id, t.partnerTeacherId]);
    couples++;
  }

  n.criteria_catalog = await insert('criteria_catalog', data.criteriaCatalog, (c) => ({
    id: c.id, label: c.label, short_label: c.shortLabel, description: c.description,
    measured_from: c.measuredFrom, sort_order: data.criteriaCatalog.indexOf(c),
  }));

  n.job_postings = await insert('job_postings', data.jobPostings, (j) => ({
    id: j.id, school_id: j.schoolId, created_by_id: j.createdById, title: j.title,
    role_family: j.roleFamily ?? 'teacher', subjects: arr(j.subjects),
    specialisms: specialismsOf(j), division: j.division,
    grade_levels: arr(j.gradeLevels), curriculum_required: arr(j.curriculumRequired),
    employment_type: j.employmentType ?? 'full_time', academic_year: j.academicYear,
    status: j.status, likelihood: j.likelihood ?? 'definite', apply_by_date: j.applyByDate,
    start_date: j.startDate, contract_length_years: j.contractLengthYears,
    openings_available: j.openingsAvailable ?? 1, min_years_experience: j.minYearsExperience ?? 0,
    excluded_nationalities: arr(j.excludedNationalities),
    cover_letter_required: j.coverLetterRequired ?? false,
    screening_questions: JSON.stringify(j.screeningQuestions ?? []),
    salary_min_usd: j.salaryMinUsd, salary_max_usd: j.salaryMaxUsd,
    housing_provided: j.housingProvided ?? false,
    dependent_tuition_covered: j.dependentTuitionCovered ?? 0,
    ranking_criteria: j.rankingCriteria, previous_ranking_criteria: j.previousRankingCriteria,
    ranking_criteria_updated_at: j.rankingCriteriaUpdatedAt,
    ranking_criteria_updated_by_id: j.rankingCriteriaUpdatedById,
    ai_ranking_enabled: j.aiRankingEnabled ?? true,
    view_count: j.viewCount ?? 0, posted_at: j.postedAt,
    created_at: j.createdAt ?? new Date().toISOString(),
  }));

  n.applications = await insert('applications', data.applications, (a) => ({
    id: a.id, candidate_id: a.teacherId, job_posting_id: a.jobPostingId,
    // Overwritten by the pipeline trigger from the posting; sent so the NOT
    // NULL holds on the way in.
    school_id: data.jobPostings.find((j) => j.id === a.jobPostingId).schoolId,
    stage: a.stage, stage_changed_at: a.stageChangedAt, applied_at: a.appliedAt,
    cover_letter_submitted: a.coverLetterSubmitted ?? false,
    screening_answers: JSON.stringify(a.screeningAnswers ?? []),
    shortlisted: a.shortlisted ?? false, shortlisted_by_id: a.shortlistedById,
    internal_notes: a.internalNotes, school_owes_response: a.schoolOwesResponse ?? false,
    feedback_sent_at: a.feedbackSentAt, rejection_reason: a.rejectionReason,
    withdrawn_reason: a.withdrawnReason,
    criterion_scores: JSON.stringify(a.criterionScores),
    criterion_notes: JSON.stringify(a.criterionNotes),
    rankable: a.rankable, not_rankable_reason: a.notRankableReason,
    ai_rank_score: a.aiRankScore,
  }));

  // The pipeline trigger writes one history row per application on insert.
  // Replace that with the real history the bundle carries.
  await client.query('DELETE FROM application_stage_history');
  let history = 0;
  for (const a of data.applications)
    for (const h of a.stageHistory ?? []) {
      await client.query(
        'INSERT INTO application_stage_history (application_id, stage, at) VALUES ($1,$2,$3)',
        [a.id, h.stage, h.at]);
      history++;
    }

  n.super_likes = await insert('super_likes',
    data.applications.filter((a) => a.superLikeSent),
    (a) => ({ application_id: a.id, sent_at: a.appliedAt }));

  n.documents = await insert('documents', data.documents, (d) => ({
    id: d.id, candidate_id: d.teacherId, type: d.type, status: d.status,
    file_name: d.fileName, file_size_kb: d.fileSizeKb, storage_key: d.storageKey,
    uploaded_at: d.uploadedAt, verified_at: d.verifiedAt, expires_on: d.expiresOn,
    rejection_reason: d.rejectionReason,
  }));

  n.references_ = await insert('references_', data.references, (r) => ({
    id: r.id, candidate_id: r.teacherId, referee_name: r.refereeName,
    referee_email: r.refereeEmail, referee_title: r.refereeTitle,
    referee_school: r.refereeSchool, relationship: r.relationship, status: r.status,
    verification_method: r.verificationMethod,
    email_domain_matches_school: r.emailDomainMatchesSchool,
    overall_rating: r.overallRating, note: r.note,
    requested_at: r.requestedAt, responded_at: r.respondedAt,
  }));

  n.interviews = await insert('interviews', data.interviews, (i) => ({
    id: i.id, application_id: i.applicationId, candidate_id: i.teacherId,
    school_id: i.schoolId, round_name: i.roundName, status: i.status,
    starts_at_utc: i.startsAtUtc, duration_minutes: i.durationMinutes ?? 45,
    school_timezone: i.schoolTimezone, candidate_timezone: i.teacherTimezone,
    meeting_url: i.meetingUrl, google_calendar_event_id: i.googleCalendarEventId,
    interviewer_ids: arr(i.interviewerIds),
    structured_feedback: i.structuredFeedback ? JSON.stringify(i.structuredFeedback) : null,
  }));

  // Goes through messages_enforce_gate like any other write — the seed is not
  // allowed to create a message the product would refuse.
  n.messages = await insert('messages', data.messages, (m) => ({
    id: m.id, application_id: m.applicationId,
    sender_school_user_id: m.senderType === 'school' ? m.senderId : null,
    sender_candidate_id: m.senderType === 'teacher' ? m.senderId : null,
    body: m.body, sent_at: m.sentAt, read_at: m.readAt,
  }));

  n.subscriptions = await insert('subscriptions', data.subscriptions, (s) => ({
    id: s.id, owner_type: party(s.ownerType), owner_id: s.ownerId, plan_id: s.planId,
    status: s.status, stripe_subscription_id: s.stripeSubscriptionId,
    current_period_end: s.currentPeriodEnd, job_postings_used: s.jobPostingsUsed ?? 0,
    seats_used: s.seatsUsed ?? 0,
  }));

  n.notifications = await insert('notifications', data.notifications, (x) => ({
    id: x.id, recipient_type: party(x.recipientType), recipient_id: x.recipientId,
    kind: x.kind, severity: x.severity ?? 'info', title: x.title, body: x.body,
    action_url: x.actionUrl, read_at: x.readAt, created_at: x.createdAt,
  }));

  // -------------------------------------------------------------------------
  // Post-load verification, read back from the database rather than from the
  // file we just read. A seed that only checks its own input proves nothing
  // about what the columns actually accepted.
  // -------------------------------------------------------------------------
  console.log('Loaded\n');
  for (const [t, c] of Object.entries(n)) console.log(`  ${t.padEnd(22)} ${c}`);
  console.log(`  ${'application_stage_history'.padEnd(22)} ${history}`);
  console.log(`  ${'teaching couples linked'.padEnd(22)} ${couples}`);

  console.log('\nVerification (read back from Postgres)\n');
  const checks = [];
  const one = async (label, sql, want) => {
    const { rows } = await client.query(sql);
    const got = Number(Object.values(rows[0])[0]);
    const ok = got === want;
    checks.push(ok);
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(44)} ${got}${ok ? '' : ` (expected ${want})`}`);
  };

  await one('applications stored', 'SELECT count(*) FROM applications', data.applications.length);
  await one(`applications with all ${CATALOG.length} criterion_scores`,
    `SELECT count(*) FROM applications
     WHERE (SELECT count(*) FROM jsonb_object_keys(criterion_scores)) = ${CATALOG.length}`,
    data.applications.length);
  await one(`applications with all ${CATALOG.length} criterion_notes`,
    `SELECT count(*) FROM applications
     WHERE (SELECT count(*) FROM jsonb_object_keys(criterion_notes)) = ${CATALOG.length}`,
    data.applications.length);
  await one('applications whose score keys match the catalog exactly',
    `SELECT count(*) FROM applications a
     WHERE NOT EXISTS (SELECT 1 FROM criteria_catalog c
                       WHERE NOT a.criterion_scores ? c.id)`,
    data.applications.length);
  await one('applications whose note keys match the catalog exactly',
    `SELECT count(*) FROM applications a
     WHERE NOT EXISTS (SELECT 1 FROM criteria_catalog c
                       WHERE NOT a.criterion_notes ? c.id)`,
    data.applications.length);
  await one('criterion scores outside 0-100',
    `SELECT count(*) FROM applications a, jsonb_each(a.criterion_scores) kv
     WHERE (kv.value)::int NOT BETWEEN 0 AND 100`, 0);
  await one('blank criterion notes',
    `SELECT count(*) FROM applications a, jsonb_each_text(a.criterion_notes) kv
     WHERE btrim(kv.value) = ''`, 0);
  await one('not-rankable applications carrying a score',
    'SELECT count(*) FROM applications WHERE rankable IS FALSE AND ai_rank_score IS NOT NULL', 0);
  await one('messages on a locked application',
    `SELECT count(*) FROM messages m JOIN applications a ON a.id = m.application_id
     WHERE a.messaging_unlocked_at IS NULL`, 0);
  await one('documents outside the restricted prefix',
    `SELECT count(*) FROM documents WHERE storage_key IS NOT NULL
       AND storage_key NOT LIKE 'sensitive/%'`, 0);
  await one('per-user permission deltas recorded', 'SELECT count(*) FROM school_user_grants', grants.length);
  await one('role families declared', 'SELECT count(*) FROM candidate_role_families',
    declarations.length);
  await one('candidates declaring no role family',
    `SELECT count(*) FROM candidates c
     WHERE NOT EXISTS (SELECT 1 FROM candidate_role_families f WHERE f.candidate_id = c.id)`, 0);
  await one('candidates wanting more than one kind of post',
    `SELECT count(*) FROM (SELECT candidate_id FROM candidate_role_families
                           GROUP BY candidate_id HAVING count(*) > 1) m`,
    data.teachers.filter((t) => roleFamiliesOf(t).length > 1).length);
  // Decision 4 is only real if a non-teaching profile is describable: these
  // are the people the NOT NULL subjects column was said to exclude.
  await one('student-support candidates with a specialism',
    `SELECT count(*) FROM candidates c
     WHERE candidate_seeks(c.id, 'support_staff') AND c.specialisms <> '{}'`,
    data.teachers.filter((t) => roleFamiliesOf(t).includes('support_staff')).length);
  await one('support postings naming no specialism',
    `SELECT count(*) FROM job_postings
     WHERE role_family = 'support_staff' AND specialisms = '{}'`, 0);
  await one("usr_cai_principal's effective permissions",
    `SELECT count(*) FROM school_user_effective_permissions WHERE school_user_id = 'usr_cai_principal'`,
    data.schoolUsers.find((u) => u.id === 'usr_cai_principal').permissions.length);

  if (checks.includes(false)) {
    console.error('\nVerification failed — rolling back. Nothing was written.');
    await client.query('ROLLBACK');
    await client.end();
    process.exit(1);
  }

  await client.query('COMMIT');
  console.log('\nCommitted.');
} catch (err) {
  await client.query('ROLLBACK');
  console.error(`\nSeed failed, rolled back:\n  ${err.message}`);
  if (err.detail) console.error(`  ${err.detail}`);
  if (err.table) console.error(`  table: ${err.table}`);
  await client.end();
  process.exit(1);
}

await client.end();
