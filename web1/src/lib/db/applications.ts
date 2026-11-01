import "server-only";
import { query, scalar } from "./client.ts";
import type {
  ApplicationStage,
  CandidateApplicationsRow,
  Camelize,
  JobPostingsRow,
  PostingApplicationsRow,
} from "./schema.ts";

/**
 * Applying, and moving along.
 *
 * Both writes go through SQL functions from 0022, which is where the rules
 * live: who may move a pipeline, whether a work permit blocks an application,
 * which of the two not-rankable reasons a new application carries. Nothing
 * here decides any of that.
 *
 * The views type as nullable because Postgres cannot prove otherwise through
 * a view; these signatures narrow what the tables behind them guarantee.
 */

export type CandidateApplication = Omit<
  Camelize<CandidateApplicationsRow>,
  "applicationId" | "postingId" | "title" | "schoolName" | "stage"
> & {
  applicationId: string;
  postingId: string;
  title: string;
  schoolName: string;
  stage: ApplicationStage;
};

export type PostingApplication = Omit<
  Camelize<PostingApplicationsRow>,
  | "applicationId" | "candidateId" | "candidateName" | "stage"
  | "profileCompleteness" | "yearsExperience" | "rankable" | "schoolOwesResponse"
> & {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  stage: ApplicationStage;
  // NOT NULL on `candidates` and `applications`; the view reports them
  // nullable because Postgres cannot prove otherwise through one.
  profileCompleteness: number;
  yearsExperience: number;
  rankable: boolean;
  schoolOwesResponse: boolean;
};

/** Live roles a candidate could apply to, newest first. */
export async function openPostings(limit = 50) {
  return query<JobPostingsRow>(
    `SELECT * FROM job_postings
     WHERE status = 'posted' AND deleted_at IS NULL
     ORDER BY posted_at DESC NULLS LAST
     LIMIT $1`,
    [limit],
  );
}

/**
 * NULL when they can apply, a sentence when they cannot. Asked before the
 * button is drawn, so nobody is refused after the fact.
 */
export async function whyCannotApply(
  candidateId: string,
  postingId: string,
): Promise<string | null> {
  return scalar<string | null>(`SELECT why_cannot_apply($1, $2)`, [candidateId, postingId]);
}

export async function applyToPosting(input: {
  candidateId: string;
  postingId: string;
  coverLetter?: boolean;
}): Promise<string> {
  return scalar<string>(`SELECT apply_to_posting($1, $2, $3)`, [
    input.candidateId,
    input.postingId,
    input.coverLetter ?? false,
  ]);
}

export async function applicationsForCandidate(
  candidateId: string,
): Promise<CandidateApplication[]> {
  return (await query<CandidateApplicationsRow>(
    `SELECT * FROM candidate_applications
     WHERE candidate_id = $1
     ORDER BY applied_at DESC`,
    [candidateId],
  )) as CandidateApplication[];
}

export async function applicationsForPosting(
  postingId: string,
): Promise<PostingApplication[]> {
  return (await query<PostingApplicationsRow>(
    `SELECT * FROM posting_applications
     WHERE job_posting_id = $1
     ORDER BY stage_rank(stage) DESC, ai_rank_score DESC NULLS LAST, applied_at`,
    [postingId],
  )) as PostingApplication[];
}

export async function moveApplicationStage(input: {
  schoolUserId: string;
  applicationId: string;
  to: ApplicationStage;
  reason?: string;
}): Promise<ApplicationStage> {
  return scalar<ApplicationStage>(`SELECT move_application_stage($1, $2, $3, $4)`, [
    input.schoolUserId,
    input.applicationId,
    input.to,
    input.reason ?? null,
  ]);
}

export type OwedApplication = {
  applicationId: string;
  postingId: string;
  postingTitle: string;
  candidateId: string;
  candidateName: string;
  headline: string | null;
  stage: ApplicationStage;
  appliedAt: Date;
  rankable: boolean;
  notRankableReason: string | null;
};

/**
 * Everybody across the school who is waiting to hear something.
 *
 * `school_owes_response` is set true when the application arrives and false by
 * `move_application_stage()` — moving IS the response — so this is not a
 * derived guess, it is the flag the pipeline itself maintains. Oldest first,
 * because the number that matters to a candidate is how long they have been
 * waiting, and the dashboard should surface the person who has waited longest
 * rather than the one who applied most recently.
 */
export async function applicationsOwedResponse(
  schoolId: string,
  limit = 12,
): Promise<OwedApplication[]> {
  return query<{
    application_id: string;
    posting_id: string;
    posting_title: string;
    candidate_id: string;
    candidate_name: string;
    headline: string | null;
    stage: ApplicationStage;
    applied_at: Date;
    rankable: boolean;
    not_rankable_reason: string | null;
  }>(
    `SELECT a.application_id, a.job_posting_id AS posting_id, p.title AS posting_title,
            a.candidate_id, a.candidate_name, a.headline, a.stage, a.applied_at,
            a.rankable, a.not_rankable_reason
     FROM   posting_applications a
     JOIN   job_postings p ON p.id = a.job_posting_id
     WHERE  a.school_id = $1 AND a.school_owes_response
     ORDER  BY a.applied_at
     LIMIT  $2`,
    [schoolId, limit],
  ) as Promise<OwedApplication[]>;
}
