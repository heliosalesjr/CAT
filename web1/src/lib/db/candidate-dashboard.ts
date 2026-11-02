import "server-only";
import { maybeOne, one, query, scalar } from "./client.ts";
import type {
  ApplicationStage,
  DocumentStatus,
  DocumentType,
  ReferenceRelationship,
} from "./schema.ts";
import type {
  CandidateApplication as ApplicationCard,
  CandidateSummary as DashboardSummary,
  OfferContext,
} from "../dashboard-data.ts";

/**
 * The teacher dashboard, out of the database instead of the bundle.
 *
 * `/dashboard/teacher` used to render the sample bundle unconditionally, the
 * way `/dashboard/school` did before it was fixed: a teacher who had just
 * created a profile landed on Daniel's — somebody else's offer, somebody
 * else's passport, somebody else's name in the header. This module is what
 * the real path reads, and the three panels it feeds (`Readiness`,
 * `Blockers`, `MyApplications`) are the same components the demo uses, so
 * the two paths cannot drift apart visually.
 *
 * The prop shapes are declared in `lib/dashboard-data.ts` because that is
 * where they were first needed. They are imported as types only — nothing
 * here loads the bundle — and satisfying them exactly is the point: the real
 * dashboard is the designed dashboard, not a degraded copy of it.
 *
 * Numbers that the ranking also reads come from SQL and are never recomputed
 * here: `profile_completeness` is a trigger's output, `candidate_is_rankable`
 * is rule 6, and `documents_expected`/`references_expected` are the dials in
 * 0018. What this module does in TypeScript is the display derivation — which
 * blockers to show, in what order — the same way the school page writes its
 * "what to do now" paragraph in TSX.
 */

/** The four stages the funnel on a card draws; the rest are outcomes. */
const STAGE_INDEX = ["applied", "screening", "interview", "offer"];

/* ----------------------------------------------------------- applications */

type ApplicationRow = {
  id: string;
  stage: ApplicationStage;
  stage_changed_at: Date;
  school_owes_response: boolean;
  rejection_reason: string | null;
  posting: string;
  school: string;
  city: string | null;
  country: string | null;
  start_date: string | null;
  apply_by_date: string | null;
  salary_min_usd: number | null;
  salary_max_usd: number | null;
  housing_provided: boolean;
  dependent_tuition_covered: number;
  contract_length_years: number | null;
  academic_year: string | null;
};

/**
 * One card per application, furthest along first — an open offer is the
 * loudest thing on the page and should not be below a rejection.
 *
 * `daysSinceStageChange` is computed from `stage_changed_at` rather than
 * stored. The bundle stored it, frozen on its generation date, which is
 * exactly the bug 0007 and 0008 fixed for documents and references.
 */
export async function candidateApplicationCards(
  candidateId: string,
): Promise<ApplicationCard[]> {
  const rows = await query<ApplicationRow>(
    `SELECT a.id, a.stage, a.stage_changed_at, a.school_owes_response,
            a.rejection_reason,
            p.title AS posting, p.start_date, p.apply_by_date,
            p.salary_min_usd, p.salary_max_usd, p.housing_provided,
            p.dependent_tuition_covered, p.contract_length_years, p.academic_year,
            s.name AS school, s.city, s.country
     FROM   applications a
     JOIN   job_postings p ON p.id = a.job_posting_id
     JOIN   schools s      ON s.id = a.school_id
     WHERE  a.candidate_id = $1
     ORDER  BY stage_rank(a.stage) DESC, a.applied_at DESC`,
    [candidateId],
  );

  return rows.map((r) => ({
    id: r.id,
    stage: r.stage,
    stageIndex: STAGE_INDEX.indexOf(r.stage),
    daysSinceStageChange: daysSince(r.stageChangedAt),
    schoolOwesResponse: r.schoolOwesResponse,
    rejectionReason: r.rejectionReason,
    posting: r.posting,
    school: r.school,
    city: r.city ?? "",
    country: r.country ?? "",
    startDate: r.startDate,
    applyByDate: r.applyByDate,
    salaryMinUsd: r.salaryMinUsd,
    salaryMaxUsd: r.salaryMaxUsd,
    housingProvided: r.housingProvided,
    dependentTuitionCovered: r.dependentTuitionCovered,
    contractLengthYears: r.contractLengthYears,
    academicYear: r.academicYear,
  }));
}

/**
 * What an offer has to be read against: the band's floor versus what they
 * asked for, the tuition versus the children they actually have, and the
 * passport versus the permit the start date needs.
 */
export async function candidateOfferContext(candidateId: string): Promise<OfferContext> {
  const [c, passport] = await Promise.all([
    one<{
      dependents: number;
      salary_expectation_min_usd: number | null;
      available_from: string | null;
    }>(
      `SELECT dependents, salary_expectation_min_usd, available_from
       FROM   candidates WHERE id = $1`,
      [candidateId],
    ),
    maybeOne<{
      expires_on: string | null;
      days_until_expiry: number | null;
      status: DocumentStatus;
    }>(
      `SELECT expires_on, days_until_expiry, status
       FROM   documents_with_expiry
       WHERE  candidate_id = $1 AND type = 'passport' AND deleted_at IS NULL
       ORDER  BY uploaded_at DESC NULLS LAST
       LIMIT  1`,
      [candidateId],
    ),
  ]);

  return {
    dependents: c.dependents,
    salaryExpectationMinUsd: c.salaryExpectationMinUsd,
    availableFrom: c.availableFrom,
    passport: passport
      ? {
          expiresOn: passport.expiresOn,
          daysUntilExpiry: passport.daysUntilExpiry,
          status: passport.status,
        }
      : null,
  };
}

/* --------------------------------------------------------------- readiness */

/**
 * The ring's three arcs and the number in the middle.
 *
 * The two paperwork halves are the same arithmetic as `candidate_readiness()`
 * in 0018 — counters over the dials — read back separately because the ring
 * draws them as separate arcs. The centre figure is the mean of all three, as
 * the bundle computed it, and that is why it is not `candidate_readiness()`:
 * that function is paperwork only, deliberately excluding the profile, and
 * putting it in the middle of three arcs one of which IS the profile would
 * print a number the picture contradicts.
 */
async function readinessParts(candidateId: string): Promise<DashboardSummary["readiness"]> {
  const r = await one<{ profile: number; documents: number; references: number }>(
    `SELECT c.profile_completeness AS profile,
            round(100.0 * LEAST(c.documents_verified, documents_expected())
                        / documents_expected())::int AS documents,
            round(100.0 * LEAST(c.verified_supervisor_references, references_expected())
                        / references_expected())::int AS "references"
     FROM   candidates c WHERE c.id = $1`,
    [candidateId],
  );
  return {
    ...r,
    overall: Math.round((r.profile + r.documents + r.references) / 3),
  };
}

/* ---------------------------------------------------------------- blockers */

type DocRow = {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  days_until_expiry: number | null;
  rejection_reason: string | null;
};

type RefRow = {
  id: string;
  referee_name: string;
  relationship: ReferenceRelationship;
  status: string;
};

/** The six a school asks for, in the order the dashboard should nag about them. */
const EXPECTED_DOCS: DocumentType[] = [
  "passport",
  "diploma",
  "teaching_certificate",
  "transcript",
  "reference_letter",
  "background_check",
];

const DOC_WORD: Record<DocumentType, string> = {
  passport: "Passport",
  diploma: "Degree certificate",
  teaching_certificate: "Teaching certificate",
  transcript: "Transcript",
  reference_letter: "Reference letter",
  background_check: "Background check",
  visa: "Visa",
  medical: "Medical certificate",
};

const SUPERVISOR: ReferenceRelationship[] = [
  "direct_supervisor",
  "head_of_school",
  "department_head",
];

/**
 * What is actually in the way, worst first.
 *
 * Every row here is a row in the database — a document that expires on a
 * date, a reference from a named person — and never a guess. The severities
 * are the consequence, not the field: a passport inside the six months a work
 * permit needs is critical because it costs the job, while a background check
 * nobody has asked for yet is merely worth starting.
 */
async function blockersFor(
  candidateId: string,
  completeness: number,
  rankable: boolean,
): Promise<DashboardSummary["blockers"]> {
  const [docs, refs] = await Promise.all([
    query<DocRow>(
      `SELECT id, type, status, days_until_expiry, rejection_reason
       FROM   documents_with_expiry
       WHERE  candidate_id = $1 AND deleted_at IS NULL`,
      [candidateId],
    ),
    query<RefRow>(
      `SELECT id, referee_name, relationship, status
       FROM   references_ WHERE candidate_id = $1`,
      [candidateId],
    ),
  ]);

  const out: DashboardSummary["blockers"] = [];

  // Rule 6 first, because below the threshold nothing else matters: a school's
  // ranking does not order this profile at all, so the paperwork under it is
  // not what is keeping them out.
  if (!rankable) {
    out.push({
      kind: "profile_incomplete",
      severity: "critical",
      entityId: candidateId,
      label: `Your profile is ${completeness}% complete`,
      actionLabel: "Finish your profile",
    });
  }

  for (const d of docs) {
    if (d.status === "rejected") {
      out.push({
        kind: "document_rejected",
        severity: "critical",
        entityId: d.id,
        label: d.rejectionReason
          ? `${DOC_WORD[d.type]} was not accepted: ${d.rejectionReason}`
          : `${DOC_WORD[d.type]} was not accepted`,
        actionLabel: `Re-upload ${DOC_WORD[d.type].toLowerCase()}`,
      });
      continue;
    }
    if (d.status === "expired") {
      out.push({
        kind: "document_expiring",
        severity: "critical",
        entityId: d.id,
        label: `${DOC_WORD[d.type]} has expired`,
        actionLabel: `Upload renewed ${DOC_WORD[d.type].toLowerCase()}`,
      });
      continue;
    }
    // Six months is the permit rule, so inside it the document is already a
    // problem even though the document itself is still valid.
    if (d.daysUntilExpiry !== null && d.daysUntilExpiry <= 180) {
      out.push({
        kind: "document_expiring",
        severity: d.daysUntilExpiry <= 90 ? "critical" : "warning",
        entityId: d.id,
        label: `${DOC_WORD[d.type]} expires in ${d.daysUntilExpiry} days`,
        actionLabel: `Upload renewed ${DOC_WORD[d.type].toLowerCase()}`,
      });
    }
  }

  // Nothing uploaded at all is one blocker, not six. Six rows on a first-day
  // account reads as a punishment list rather than somewhere to start.
  const held = new Set(docs.filter((d) => d.status !== "missing").map((d) => d.type));
  const absent = EXPECTED_DOCS.filter((t) => !held.has(t));
  if (held.size === 0) {
    out.push({
      kind: "documents_missing",
      severity: "info",
      entityId: candidateId,
      label: "No documents uploaded yet",
      actionLabel: "Upload your documents",
    });
  } else {
    for (const t of absent) {
      out.push({
        kind: "document_missing",
        severity: "info",
        entityId: `${candidateId}:${t}`,
        label: `${DOC_WORD[t]} not uploaded`,
        actionLabel: `Upload ${DOC_WORD[t].toLowerCase()}`,
      });
    }
  }

  // Decision: a peer reference is not nothing, but it does not count towards
  // safeguarding, so somebody with two colleague references has a real gap and
  // a number on their profile that looks fine.
  const supervisors = refs.filter((r) => SUPERVISOR.includes(r.relationship));
  if (refs.length > 0 && supervisors.length === 0) {
    out.push({
      kind: "reference_wrong_relationship",
      severity: "warning",
      entityId: refs[0].id,
      label: "No reference from somebody who managed you",
      actionLabel: "Name a supervisor",
    });
  } else if (refs.length === 0) {
    out.push({
      kind: "references_missing",
      severity: "warning",
      entityId: candidateId,
      label: "No referees named yet",
      actionLabel: "Name a referee",
    });
  }

  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/**
 * Whether this account has done anything at all: nothing applied to, nothing
 * uploaded, nobody named. It is asked with three counts rather than inferred
 * from readiness, because readiness counts VERIFIED documents — somebody who
 * uploaded a passport yesterday would otherwise be shown the first-day screen
 * with their own upload sitting in it.
 */
export async function candidateHasNothingYet(candidateId: string): Promise<boolean> {
  return scalar<boolean>(
    `SELECT NOT EXISTS (SELECT 1 FROM applications WHERE candidate_id = $1)
        AND NOT EXISTS (SELECT 1 FROM documents
                        WHERE candidate_id = $1 AND deleted_at IS NULL
                          AND status <> 'missing')
        AND NOT EXISTS (SELECT 1 FROM references_ WHERE candidate_id = $1)
        AND NOT candidate_is_rankable($1)`,
    [candidateId],
  );
}

/* ----------------------------------------------------------- the whole lot */

/**
 * Everything the page's panels read, for one real candidate.
 *
 * `recommendedJobs` and `savedJobIds` are empty and that is honest rather
 * than unfinished: there is no ranking job and no saved-roles table yet, so
 * the page says so in words instead of showing an empty shelf. The bundle
 * fills them because the bundle is a drawing of the finished product.
 */
export async function candidateDashboardSummary(
  candidateId: string,
): Promise<DashboardSummary> {
  const [completeness, rankable, readiness, counts] = await Promise.all([
    scalar<number>(`SELECT profile_completeness FROM candidates WHERE id = $1`, [candidateId]),
    scalar<boolean>(`SELECT candidate_is_rankable($1)`, [candidateId]),
    readinessParts(candidateId),
    one<{ active: string; offers: string; owing: string }>(
      `SELECT count(*) FILTER (WHERE stage IN ('applied','screening','interview','offer'))
                                                                   AS active,
              count(*) FILTER (WHERE stage = 'offer')              AS offers,
              count(DISTINCT school_id) FILTER (WHERE school_owes_response) AS owing
       FROM   applications WHERE candidate_id = $1`,
      [candidateId],
    ),
  ]);

  return {
    teacherId: candidateId,
    asOf: new Date().toISOString(),
    profileCompleteness: completeness,
    readiness,
    activeApplications: Number(counts.active),
    offersOpen: Number(counts.offers),
    // Nothing schedules an interview yet, so counting them would be counting
    // a table that cannot have rows. Stated rather than silently zero.
    interviewsNext7Days: 0,
    schoolsOwingResponse: Number(counts.owing),
    blockers: await blockersFor(candidateId, completeness, rankable),
    recommendedJobs: [],
    savedJobIds: [],
  };
}

const daysSince = (at: Date) => Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000);
