import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads docs/mock-data.json on the server and hands each zone the little it
 * needs. The bundle is 600KB; none of it reaches the browser.
 *
 * Everything here is derived at request time from the records in the file.
 * Nothing is hard-coded, and nothing is invented — if a number appears on the
 * dashboard it came out of this module.
 */

const bundle = JSON.parse(
  readFileSync(join(process.cwd(), "docs", "mock-data.json"), "utf8"),
) as Bundle;

/** The bundle was generated for this date; "days ago" is counted from it. */
export const AS_OF = new Date(bundle.schoolDashboardSummary[0].asOf);

/* ------------------------------------------------------------------ types */

type Candidate = {
  id: string; firstName: string; lastName: string; headline: string;
  currentCity: string; currentCountry: string; timezone: string;
  currentSchool: string | null; nationality: string | null;
  profileCompleteness: number; yearsExperience: number; leadershipYears: number;
  avatarUrl: string | null; dependents: number;
};
type Doc = {
  id: string; teacherId: string; type: string; status: string;
  expiresOn: string | null; rejectionReason: string | null;
};
type Ref = {
  id: string; teacherId: string; refereeName: string; refereeTitle: string | null;
  refereeSchool: string | null; relationship: string; status: string;
  requestedAt: string; respondedAt: string | null;
};
type Posting = {
  id: string; schoolId: string; title: string; status: string;
  applicationCount: number; viewCount: number; postedAt: string | null;
  rankingCriteria: string[]; aiRankingEnabled: boolean;
  salaryMinUsd: number | null; salaryMaxUsd: number | null;
  openingsAvailable: number; likelihood: string; applyByDate: string | null;
  startDate: string | null; housingProvided: boolean;
  dependentTuitionCovered: number; contractLengthYears: number | null;
  academicYear: string | null;
};
type Application = {
  id: string; teacherId: string; jobPostingId: string; stage: string;
  daysSinceStageChange: number; schoolOwesResponse: boolean; appliedAt: string;
  aiRankScore: number | null; rankable: boolean; notRankableReason: string | null;
  criterionScores: Record<string, number>; criterionNotes: Record<string, string>;
  rejectionReason: string | null;
};
type Interview = {
  id: string; applicationId: string; teacherId: string; schoolId: string;
  roundName: string; status: string; startsAtUtc: string;
  durationMinutes: number; schoolTimezone: string; teacherTimezone: string;
  structuredFeedback: unknown | null;
};
export type CandidateSummary = {
  teacherId: string; asOf: string; profileCompleteness: number;
  readiness: { profile: number; documents: number; references: number; overall: number };
  activeApplications: number; offersOpen: number; interviewsNext7Days: number;
  schoolsOwingResponse: number;
  blockers: { kind: string; severity: "critical" | "warning" | "info";
              entityId: string; label: string; actionLabel: string }[];
  recommendedJobs: { jobPostingId: string; matchScore: number; whyShown: string[] }[];
  savedJobIds: string[];
};

type Bundle = {
  criteriaCatalog: { id: string; label: string; shortLabel: string }[];
  rankingModel: { weightsByCount: Record<string, number[]> };
  schools: { id: string; name: string; city: string; country: string; timezone: string }[];
  schoolUsers: { id: string; schoolId: string; firstName: string; lastName: string;
                 title: string; role: string; permissions: string[] }[];
  /* The bundle's key is still `teachers`; the type it holds is a Candidate. */
  teachers: Candidate[];
  jobPostings: Posting[];
  applications: Application[];
  interviews: Interview[];
  documents: Doc[];
  references: Ref[];
  schoolDashboardSummary: Summary[];
  teacherDashboardSummary: CandidateSummary[];
};
export type Summary = {
  schoolId: string; asOf: string; openPostings: number; draftPostings: number;
  onHoldPostings: number; totalApplications: number; totalActiveApplications: number;
  candidatesAwaitingResponse: number; longestWaitDays: number;
  interviewsNext7Days: number; interviewFeedbackMissing: number;
  medianResponseDays: number; respondedCount: number; neverRespondedCount: number;
  postingsAtRisk: { jobPostingId: string; reason: string; detail: string }[];
  funnelCounts: Record<string, number>;
  applicationsPerWeek: { weekStart: string; count: number }[];
  timeToHireDays: { shortest: number | null; average: number | null; longest: number | null };
  planUsage: { planId: string; jobPostingsUsed: number; jobPostingLimit: number;
               seatsUsed: number; seats: number; subscriptionStatus: string };
};

export const ACTIVE_STAGES = ["applied", "screening", "interview", "offer"] as const;
const TERMINAL = new Set(["rejected", "withdrawn", "hired"]);

/* ------------------------------------------------------------- the viewer */

export type Viewer = {
  id: string; name: string; title: string; role: string;
  permissions: Set<string>;
  can: (p: string) => boolean;
};

export function getViewer(userId: string): Viewer {
  const u = bundle.schoolUsers.find((x) => x.id === userId)!;
  const permissions = new Set(u.permissions);
  return {
    id: u.id, name: `${u.firstName} ${u.lastName}`, title: u.title, role: u.role,
    permissions, can: (p) => permissions.has(p),
  };
}

export function getSchool(schoolId: string) {
  return bundle.schools.find((s) => s.id === schoolId)!;
}

export function getSummary(schoolId: string): Summary {
  return bundle.schoolDashboardSummary.find((s) => s.schoolId === schoolId)!;
}

/* --------------------------------------------------------------- postings */

export function getPostings(schoolId: string) {
  return bundle.jobPostings.filter((p) => p.schoolId === schoolId);
}

/** Critical first, then caution, then healthy. */
const rank = (r: { trouble: { severity: string } | null }) =>
  r.trouble?.severity === "critical" ? 2 : r.trouble ? 1 : 0;

export type PipelineRow = {
  id: string; title: string; status: string; applicationCount: number;
  viewCount: number; daysPosted: number | null; openings: number;
  likelihood: string; salaryMinUsd: number | null; salaryMaxUsd: number | null;
  counts: Record<string, number>;
  /** Why this row is flagged, or null when the posting is healthy. */
  trouble: { severity: "caution" | "critical"; label: string; detail: string } | null;
  /** Whoever the ranking currently puts first, for the link into the list. */
  topCandidate: { name: string; score: number | null } | null;
  rankedCount: number;
};

export function getPipeline(schoolId: string): PipelineRow[] {
  const postings = getPostings(schoolId).filter((p) => p.status !== "draft");
  const apps = bundle.applications;

  return postings
    .map((p) => {
      const mine = apps.filter((a) => a.jobPostingId === p.id);
      const counts: Record<string, number> = {};
      for (const s of ACTIVE_STAGES) counts[s] = mine.filter((a) => a.stage === s).length;
      const daysPosted = p.postedAt ? daysBetween(new Date(p.postedAt), AS_OF) : null;
      const owed = mine.filter((a) => a.schoolOwesResponse).length;

      let trouble: PipelineRow["trouble"] = null;
      if (p.status === "posted" && p.applicationCount === 0 && (daysPosted ?? 0) >= 7) {
        trouble = {
          severity: "critical", label: "No applicants",
          detail: `${p.viewCount} views, ${daysPosted} days, nobody applied. The listing is being seen and rejected.`,
        };
      } else if (owed >= 10 || counts.applied >= 20) {
        // 47 applications is not a success: it is a queue nobody has read.
        // Volume counts even when nothing is formally owed yet — 28 unopened
        // applications is a backlog whether or not a clock has started.
        const detail = owed >= 10
          ? `${p.applicationCount} applications, ${owed} still waiting on a reply.`
          : `${p.applicationCount} applications and ${counts.applied} never opened. Volume is not progress.`;
        trouble = { severity: "caution", label: "Triage debt", detail };
      } else if (p.status === "on_hold") {
        trouble = {
          severity: "caution", label: "On hold",
          detail: `${mine.filter((a) => !TERMINAL.has(a.stage)).length} candidates are still waiting on a decision that is paused.`,
        };
      }

      const ranked = mine
        .filter((a) => a.rankable && !TERMINAL.has(a.stage))
        .sort((x, y) => (y.aiRankScore ?? 0) - (x.aiRankScore ?? 0));
      const first = ranked[0];
      const firstTeacher = first && bundle.teachers.find((t) => t.id === first.teacherId);

      return {
        id: p.id, title: p.title, status: p.status,
        applicationCount: p.applicationCount, viewCount: p.viewCount,
        daysPosted, openings: p.openingsAvailable, likelihood: p.likelihood,
        salaryMinUsd: p.salaryMinUsd, salaryMaxUsd: p.salaryMaxUsd,
        counts, trouble,
        topCandidate: firstTeacher
          ? { name: `${firstTeacher.firstName} ${firstTeacher.lastName}`,
              score: p.aiRankingEnabled ? first.aiRankScore : null }
          : null,
        rankedCount: ranked.length,
      };
    })
    .sort((a, b) => rank(b) - rank(a) || b.applicationCount - a.applicationCount);
}

/* ------------------------------------------------------- attention queue */

export type QueueItem = {
  key: string; kind: "response" | "feedback" | "posting";
  who: string; what: string; context: string;
  days: number; cost: number;
  severity: "critical" | "caution" | "neutral";
  action: string;
  /** Set when this row outranks longer waits, and why. */
  boost: string | null;
};

/**
 * Sorted by cost of inaction, not recency.
 *
 * cost = days waiting x a weight for what the delay actually costs. A
 * candidate already in screening has invested more and is likelier to walk,
 * so the same wait costs more than at applied. Interview feedback blocks a
 * decision someone else is holding. A posting with no applicants is burning
 * the whole vacancy, not one relationship.
 */
export function getQueue(schoolId: string): QueueItem[] {
  const postingIds = new Set(getPostings(schoolId).map((p) => p.id));
  const items: QueueItem[] = [];

  for (const a of bundle.applications) {
    if (!postingIds.has(a.jobPostingId) || !a.schoolOwesResponse) continue;
    const t = bundle.teachers.find((x) => x.id === a.teacherId)!;
    const p = bundle.jobPostings.find((x) => x.id === a.jobPostingId)!;
    const weight = a.stage === "screening" ? 1.6 : 1;
    items.push({
      key: a.id, kind: "response",
      who: `${t.firstName} ${t.lastName}`,
      what: a.stage === "screening" ? "Waiting on a screening decision" : "Applied, never answered",
      context: p.title,
      days: a.daysSinceStageChange,
      cost: a.daysSinceStageChange * weight,
      severity: a.daysSinceStageChange >= 30 ? "critical" : a.daysSinceStageChange >= 14 ? "caution" : "neutral",
      action: a.stage === "screening" ? "Decide" : "Reply",
      boost: a.stage === "screening" ? "Further along" : null,
    });
  }

  for (const i of bundle.interviews) {
    if (i.schoolId !== schoolId || i.status !== "completed" || i.structuredFeedback) continue;
    const t = bundle.teachers.find((x) => x.id === i.teacherId)!;
    const days = daysBetween(new Date(i.startsAtUtc), AS_OF);
    items.push({
      key: i.id, kind: "feedback",
      who: `${t.firstName} ${t.lastName}`,
      what: "Interview feedback never submitted",
      context: i.roundName,
      days, cost: days * 1.5,
      severity: days >= 7 ? "critical" : "caution",
      action: "Add feedback",
      boost: "Blocks a decision",
    });
  }

  for (const row of getPipeline(schoolId)) {
    if (row.trouble?.severity !== "critical" || row.applicationCount > 0) continue;
    items.push({
      key: row.id, kind: "posting",
      who: row.title, what: row.trouble.detail, context: "Posting",
      days: row.daysPosted ?? 0, cost: (row.daysPosted ?? 0) * 1.2,
      severity: "critical", action: "Review posting",
      boost: "Whole vacancy stalled",
    });
  }

  return items.sort((a, b) => b.cost - a.cost);
}

/* ------------------------------------------------------------- shortlist */

export type Ranked = {
  id: string; name: string; headline: string; location: string;
  stage: string; score: number | null; appliedDaysAgo: number;
  /** Derived from the two highest-weighted criteria, never stored prose. */
  reasons: { label: string; note: string; score: number; tone: "reason" | "concern" | "neutral" }[];
  owed: boolean;
};

export type Shortlist = {
  posting: { id: string; title: string; applicationCount: number };
  criteria: { id: string; label: string; weight: number }[];
  ranked: Ranked[];
  byRecency: Ranked[];
  notRankable: { id: string; name: string; completeness: number; reason: string }[];
  /** Applications the shortlist leaves out, so the counts can be reconciled
      rather than silently disagreeing with the posting's total. */
  closed: { rejected: number; withdrawn: number; hired: number };
};

export function getShortlist(postingId: string): Shortlist {
  const p = bundle.jobPostings.find((x) => x.id === postingId)!;
  const weights = bundle.rankingModel.weightsByCount[String(p.rankingCriteria.length)];
  const label = (id: string) =>
    bundle.criteriaCatalog.find((c) => c.id === id)?.label ?? id;

  const criteria = p.rankingCriteria.map((id, i) => ({
    id, label: label(id), weight: weights[i],
  }));
  // The explanation comes from the two criteria carrying the most weight.
  const top2 = criteria.slice(0, 2);

  const mine = bundle.applications.filter(
    (a) => a.jobPostingId === p.id && !TERMINAL.has(a.stage),
  );

  const shape = (a: Application): Ranked => {
    const t = bundle.teachers.find((x) => x.id === a.teacherId)!;
    return {
      id: a.id, name: `${t.firstName} ${t.lastName}`, headline: t.headline,
      location: `${t.currentCity}, ${t.currentCountry}`,
      stage: a.stage, score: a.aiRankScore,
      appliedDaysAgo: daysBetween(new Date(a.appliedAt), AS_OF),
      owed: a.schoolOwesResponse,
      reasons: top2.map((c) => {
        const score = a.criterionScores[c.id];
        return {
          label: c.label, note: a.criterionNotes[c.id], score,
          // The thresholds are the spec's: >=70 reads as a reason, <55 as a
          // concern, and the band between is stated without a verdict.
          tone: score >= 70 ? "reason" : score < 55 ? "concern" : "neutral",
        };
      }),
    };
  };

  const all = bundle.applications.filter((a) => a.jobPostingId === p.id);
  const closed = {
    rejected: all.filter((a) => a.stage === "rejected").length,
    withdrawn: all.filter((a) => a.stage === "withdrawn").length,
    hired: all.filter((a) => a.stage === "hired").length,
  };

  const rankable = mine.filter((a) => a.rankable);
  return {
    posting: { id: p.id, title: p.title, applicationCount: p.applicationCount },
    closed,
    criteria,
    ranked: rankable.map(shape).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    byRecency: rankable.map(shape).sort((a, b) => a.appliedDaysAgo - b.appliedDaysAgo),
    notRankable: mine
      .filter((a) => !a.rankable)
      .map((a) => {
        const t = bundle.teachers.find((x) => x.id === a.teacherId)!;
        return {
          id: a.id, name: `${t.firstName} ${t.lastName}`,
          completeness: t.profileCompleteness,
          reason: a.notRankableReason ?? "profile_incomplete",
        };
      })
      .sort((a, b) => b.completeness - a.completeness),
  };
}

/* ------------------------------------------------------------ interviews */

export type InterviewRow = {
  id: string; who: string; round: string; status: string;
  startsAtUtc: string; durationMinutes: number;
  schoolTimezone: string; teacherTimezone: string;
  /** Hours the candidate's clock is ahead (+) or behind (-) the school's. */
  offsetHours: number;
  teacherCity: string;
  daysAway: number;
};

export function getInterviews(schoolId: string): InterviewRow[] {
  return bundle.interviews
    .filter((i) => i.schoolId === schoolId && i.status !== "completed" && i.status !== "cancelled")
    .map((i) => {
      const t = bundle.teachers.find((x) => x.id === i.teacherId)!;
      const at = new Date(i.startsAtUtc);
      return {
        id: i.id, who: `${t.firstName} ${t.lastName}`, round: i.roundName,
        status: i.status, startsAtUtc: i.startsAtUtc,
        durationMinutes: i.durationMinutes,
        schoolTimezone: i.schoolTimezone, teacherTimezone: i.teacherTimezone,
        offsetHours: tzOffsetHours(at, i.teacherTimezone) - tzOffsetHours(at, i.schoolTimezone),
        teacherCity: t.currentCity,
        daysAway: daysBetween(AS_OF, at),
      };
    })
    .sort((a, b) => +new Date(a.startsAtUtc) - +new Date(b.startsAtUtc));
}

/* ----------------------------------------------------------------- utils */

export function daysBetween(from: Date, to: Date) {
  return Math.round((+to - +from) / 86_400_000);
}

/** Minutes a zone is offset from UTC at a given instant, via Intl. */
function tzOffsetHours(at: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, timeZoneName: "longOffset",
  });
  const part = fmt.formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) + Number(m[3] ?? 0) / 60);
}

export function formatIn(at: Date, timeZone: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, ...opts }).format(at);
}

/* ==================================================================
   Candidate side

   The entity is Candidate, not Teacher: a third of the postings in the
   bundle are leadership or student-support roles, and the people applying
   to them are not all teachers. The mock data still uses `teachers` and
   `teacherId` as its keys, and those names stay — this file reads them and
   speaks Candidate everywhere else.
   ================================================================== */

export type CandidateDoc = {
  id: string; type: string; status: string;
  expiresOn: string | null; daysUntilExpiry: number | null;
  rejectionReason: string | null;
};

export type CandidateRef = {
  id: string; refereeName: string; refereeTitle: string | null;
  refereeSchool: string | null; relationship: string; status: string;
  daysWaiting: number | null;
};

export type CandidateApplication = {
  id: string; stage: string; stageIndex: number; daysSinceStageChange: number;
  schoolOwesResponse: boolean; rejectionReason: string | null;
  posting: string; school: string; city: string; country: string;
  startDate: string | null; applyByDate: string | null;
  salaryMinUsd: number | null; salaryMaxUsd: number | null;
  /* Offer terms. Present on every row, read only when stage is "offer". */
  housingProvided: boolean;
  dependentTuitionCovered: number;
  contractLengthYears: number | null;
  academicYear: string | null;
};

export type JobCard = {
  id: string; title: string; school: string; city: string; country: string;
  startDate: string | null; applyByDate: string | null;
  salaryMinUsd: number | null; salaryMaxUsd: number | null;
  matchScore?: number; whyShown?: string[];
};

export function getCandidate(id: string) {
  return bundle.teachers.find((t) => t.id === id)!;
}

/** The full record, for the profile form. */
export function getCandidateRecord(id: string): Record<string, unknown> {
  return bundle.teachers.find((t) => t.id === id) as unknown as Record<string, unknown>;
}

export function getCandidateSummary(id: string): CandidateSummary {
  return bundle.teacherDashboardSummary.find((s) => s.teacherId === id)!;
}

export function getCandidateDocuments(id: string): CandidateDoc[] {
  const order = ["passport", "diploma", "teaching_certificate", "transcript",
                 "reference_letter", "background_check"];
  return bundle.documents
    .filter((d) => d.teacherId === id)
    .map((d) => ({
      id: d.id, type: d.type, status: d.status,
      expiresOn: d.expiresOn ?? null,
      // Recomputed, never read from the bundle: daysUntilExpiry there was
      // frozen on the generation date and is wrong on any other day.
      daysUntilExpiry: d.expiresOn ? daysBetween(AS_OF, new Date(d.expiresOn)) : null,
      rejectionReason: d.rejectionReason ?? null,
    }))
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
}

export function getCandidateReferences(id: string): CandidateRef[] {
  return bundle.references
    .filter((r) => r.teacherId === id)
    .map((r) => ({
      id: r.id, refereeName: r.refereeName, refereeTitle: r.refereeTitle ?? null,
      refereeSchool: r.refereeSchool ?? null, relationship: r.relationship,
      status: r.status,
      daysWaiting: r.respondedAt ? null : daysBetween(new Date(r.requestedAt), AS_OF),
    }));
}

export function getCandidateApplications(id: string): CandidateApplication[] {
  const order = ["applied", "screening", "interview", "offer"];
  return bundle.applications
    .filter((a) => a.teacherId === id)
    .map((a) => {
      const j = bundle.jobPostings.find((p) => p.id === a.jobPostingId)!;
      const s = bundle.schools.find((x) => x.id === j.schoolId)!;
      return {
        id: a.id, stage: a.stage, stageIndex: order.indexOf(a.stage),
        daysSinceStageChange: a.daysSinceStageChange,
        schoolOwesResponse: a.schoolOwesResponse,
        rejectionReason: a.rejectionReason ?? null,
        posting: j.title, school: s.name, city: s.city, country: s.country,
        startDate: j.startDate, applyByDate: j.applyByDate,
        salaryMinUsd: j.salaryMinUsd, salaryMaxUsd: j.salaryMaxUsd,
        housingProvided: j.housingProvided,
        dependentTuitionCovered: j.dependentTuitionCovered,
        contractLengthYears: j.contractLengthYears,
        academicYear: j.academicYear,
      };
    })
    .sort((a, b) => b.stageIndex - a.stageIndex);
}

export function getJobCards(ids: string[]): JobCard[] {
  return ids.map((id) => {
    const j = bundle.jobPostings.find((p) => p.id === id)!;
    const s = bundle.schools.find((x) => x.id === j.schoolId)!;
    return {
      id: j.id, title: j.title, school: s.name, city: s.city, country: s.country,
      startDate: j.startDate, applyByDate: j.applyByDate,
      salaryMinUsd: j.salaryMinUsd, salaryMaxUsd: j.salaryMaxUsd,
    };
  });
}

export type OfferContext = {
  dependents: number;
  salaryExpectationMinUsd: number | null;
  availableFrom: string | null;
  /** The document most likely to stop a work permit, if it is in trouble. */
  passport: { expiresOn: string | null; daysUntilExpiry: number | null; status: string } | null;
};

/**
 * Everything needed to read an offer against this particular person: whether
 * the band clears what they asked for, whether the tuition covers the children
 * they actually have, and whether their passport survives the permit process.
 */
export function getOfferContext(teacherId: string): OfferContext {
  const t = bundle.teachers.find((x) => x.id === teacherId)!;
  const passport = getCandidateDocuments(teacherId).find((d) => d.type === "passport");
  return {
    dependents: t.dependents ?? 0,
    salaryExpectationMinUsd: (t as unknown as { salaryExpectationMinUsd: number | null })
      .salaryExpectationMinUsd ?? null,
    availableFrom: (t as unknown as { availableFrom: string | null }).availableFrom ?? null,
    passport: passport
      ? { expiresOn: passport.expiresOn, daysUntilExpiry: passport.daysUntilExpiry,
          status: passport.status }
      : null,
  };
}

/** The teacher's own interviews, with their clock leading. */
export function getCandidateInterviews(teacherId: string): InterviewRow[] {
  return bundle.interviews
    .filter((i) => i.teacherId === teacherId && i.status !== "completed" && i.status !== "cancelled")
    .map((i) => {
      const s = bundle.schools.find((x) => x.id === i.schoolId)!;
      const at = new Date(i.startsAtUtc);
      return {
        id: i.id, who: s.name, round: i.roundName, status: i.status,
        startsAtUtc: i.startsAtUtc, durationMinutes: i.durationMinutes,
        // Swapped on purpose: on this side the teacher's zone is the one that
        // leads, and the school's is the counterpart.
        schoolTimezone: i.teacherTimezone, teacherTimezone: i.schoolTimezone,
        offsetHours: tzOffsetHours(at, i.schoolTimezone) - tzOffsetHours(at, i.teacherTimezone),
        teacherCity: s.city,
        daysAway: daysBetween(AS_OF, at),
      };
    })
    .sort((a, b) => +new Date(a.startsAtUtc) - +new Date(b.startsAtUtc));
}

/* ==================================================================
   Shortlists
   ================================================================== */

export type ShortlistSummary = {
  posting: {
    id: string; title: string; status: string;
    applicationCount: number; aiRankingEnabled: boolean;
  };
  criteria: { id: string; label: string; weight: number }[];
  /** The top slice, ordered by score. */
  top: Ranked[];
  /** The same people, ordered by how long each has waited. */
  topByWait: Ranked[];
  rankableCount: number;
  notRankableCount: number;
  /** Names just past the cut, for the "there is more" row. */
  peek: string[];
};

/**
 * One compact shortlist per posting, small enough to hand the browser all of
 * them at once so switching postings costs nothing. The full list lives at
 * /shortlists; this is the slice the dashboard shows.
 */
export function getShortlistSummaries(schoolId: string, take = 5): ShortlistSummary[] {
  return getPostings(schoolId)
    .filter((p) => p.status !== "draft" && p.applicationCount > 0)
    .sort((a, b) => b.applicationCount - a.applicationCount)
    .map((p) => {
      const full = getShortlist(p.id);
      // The visible set is fixed by the ranking and then reordered, never
      // re-sliced: turning ranking off must change the order, not the people.
      const top = full.ranked.slice(0, take);
      return {
        posting: {
          id: p.id, title: p.title, status: p.status,
          applicationCount: p.applicationCount, aiRankingEnabled: p.aiRankingEnabled,
        },
        criteria: full.criteria,
        top,
        topByWait: [...top].sort((a, b) => b.appliedDaysAgo - a.appliedDaysAgo),
        rankableCount: full.ranked.length,
        notRankableCount: full.notRankable.length,
        peek: full.ranked.slice(take, take + 3).map((c) => c.name),
      };
    });
}

/** Everything /shortlists needs: the cards, and the one opened. */
export function getShortlistsPage(schoolId: string, selectedId?: string) {
  const summaries = getShortlistSummaries(schoolId, 5);
  const selected = summaries.find((s) => s.posting.id === selectedId) ?? summaries[0];
  return { summaries, selected: selected ? getShortlist(selected.posting.id) : null,
           selectedId: selected?.posting.id ?? null };
}
