import "server-only";
import { one, query, scalar } from "./client.ts";
import type { Camelize, CriteriaCatalogRow, JobPostingsRow } from "./schema.ts";
import type { PostingInput } from "../posting-fields.ts";

export type Posting = Camelize<JobPostingsRow>;
export type Criterion = Camelize<CriteriaCatalogRow>;

/**
 * Job postings.
 *
 * Nothing here checks whether the author may post, whether the school is
 * verified, or whether the criteria are real. All three are triggers — 0021
 * for the first two, 0004 for the third — because there will be a second way
 * to create a posting (a duplicate button, an importer) and a check living in
 * this file would not be on that path.
 */

/** The ten, in the order the picker should offer them. */
export async function criteriaCatalog(): Promise<Criterion[]> {
  return query<CriteriaCatalogRow>(
    `SELECT * FROM criteria_catalog WHERE active ORDER BY sort_order, id`,
  );
}

export async function postingsForSchool(schoolId: string): Promise<Posting[]> {
  return query<JobPostingsRow>(
    `SELECT * FROM job_postings
     WHERE school_id = $1 AND deleted_at IS NULL
     ORDER BY CASE status WHEN 'posted' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
              created_at DESC`,
    [schoolId],
  );
}

export async function postingById(id: string): Promise<Posting | null> {
  const rows = await query<JobPostingsRow>(
    `SELECT * FROM job_postings WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  return rows[0] ?? null;
}

/** Whether this school's plan lets a posting turn ranking on at all. */
export async function planAllowsRanking(schoolId: string): Promise<boolean> {
  return scalar<boolean>(
    `SELECT COALESCE((SELECT p.ai_ranking_enabled FROM schools s
                      JOIN plans p ON p.id = s.plan_id WHERE s.id = $1), false)`,
    [schoolId],
  );
}

export async function createPosting(input: {
  schoolId: string;
  createdById: string;
  aiRankingEnabled: boolean;
  posting: PostingInput;
}): Promise<Posting> {
  const p = input.posting;
  return one<JobPostingsRow>(
    `INSERT INTO job_postings (
       school_id, created_by_id, title, role_family, subjects, specialisms,
       division, grade_levels, curriculum_required, employment_type,
       academic_year, status, likelihood, apply_by_date, start_date,
       contract_length_years, openings_available, min_years_experience,
       excluded_nationalities, cover_letter_required, salary_min_usd,
       salary_max_usd, housing_provided, dependent_tuition_covered,
       ranking_criteria, ai_ranking_enabled, posted_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10,
       $11, $12, $13, $14, $15,
       $16, $17, $18,
       $19, $20, $21,
       $22, $23, $24,
       $25, $26, CASE WHEN $12 = 'posted'::job_posting_status THEN now() END
     ) RETURNING *`,
    [
      input.schoolId,
      input.createdById,
      p.title,
      p.roleFamily,
      p.subjects,
      p.specialisms,
      p.division,
      p.gradeLevels,
      p.curriculumRequired,
      p.employmentType,
      p.academicYear,
      p.status,
      p.likelihood,
      p.applyByDate,
      p.startDate,
      p.contractLengthYears,
      p.openingsAvailable,
      p.minYearsExperience,
      p.excludedNationalities,
      p.coverLetterRequired,
      p.salaryMinUsd,
      p.salaryMaxUsd,
      p.housingProvided,
      p.dependentTuitionCovered,
      p.rankingCriteria,
      input.aiRankingEnabled,
    ],
  );
}
