import type { Curriculum, EmploymentType, JobPostingStatus, Likelihood, RoleFamily } from "./db/schema.ts";
import { CURRICULA, GRADE_LEVELS } from "./profile-fields.ts";

/**
 * What a school fills in to open a role, described once — the form renders
 * from this and the action parses from it, the same arrangement the candidate
 * profile uses and for the same reason.
 *
 * Deliberately not here: screening questions. They are a list of objects with
 * their own types, and a repeater UI for them is a feature of its own rather
 * than a field on this form. The column keeps its empty-array default.
 *
 * No "server-only": the client renders from this file.
 */

export type PostingProblem = { field: string; message: string };

export const ROLE_FAMILIES: { value: RoleFamily; label: string; blurb: string }[] = [
  {
    value: "teacher",
    label: "Classroom teaching",
    blurb: "Matched on subjects, curricula and grade levels.",
  },
  {
    value: "administrator",
    label: "Leadership",
    blurb: "Coordinator, head of department, head of school. Leadership years weigh heavily.",
  },
  {
    value: "support_staff",
    label: "Student support or specialist",
    blurb: "Counselling, learning support, library, nursing, admissions. Matched on specialism.",
  },
];

export const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "fractional", label: "Fractional" },
];

export const LIKELIHOODS: { value: Likelihood; label: string; blurb: string }[] = [
  { value: "definite", label: "Definite", blurb: "The post exists and is funded." },
  { value: "probable", label: "Probable", blurb: "Expected, not yet confirmed." },
  { value: "possible", label: "Possible", blurb: "Depends on enrolment or a resignation." },
];

export const DIVISIONS = [
  { value: "early_years", label: "Early years" },
  { value: "elementary", label: "Elementary" },
  { value: "middle", label: "Middle" },
  { value: "high", label: "High" },
  { value: "school_wide", label: "School-wide" },
] as const;

export { CURRICULA, GRADE_LEVELS };

/**
 * Position is priority, and the weights come from position alone:
 *
 *   w(i) = (N - i + 1) / (N(N+1)/2)
 *
 * Five criteria give 33/27/20/13/7; three give 50/33/17. The form shows these
 * live as the recruiter reorders, because a list of five where the first is
 * worth five times the last is not obvious from looking at it.
 */
export function criterionWeights(count: number): number[] {
  const denominator = (count * (count + 1)) / 2;
  return Array.from({ length: count }, (_, i) =>
    Math.round(((count - i) / denominator) * 100),
  );
}

export const MIN_CRITERIA = 3;
export const MAX_CRITERIA = 5;

/* ------------------------------------------------------------------ parsing */

export type PostingInput = {
  title: string;
  roleFamily: RoleFamily;
  subjects: string[];
  specialisms: string[];
  division: string | null;
  gradeLevels: string[];
  curriculumRequired: Curriculum[];
  employmentType: EmploymentType;
  academicYear: string | null;
  likelihood: Likelihood;
  applyByDate: string | null;
  startDate: string | null;
  contractLengthYears: number | null;
  openingsAvailable: number;
  minYearsExperience: number;
  excludedNationalities: string[];
  coverLetterRequired: boolean;
  salaryMinUsd: number | null;
  salaryMaxUsd: number | null;
  housingProvided: boolean;
  dependentTuitionCovered: number;
  rankingCriteria: string[];
  status: JobPostingStatus;
};

export type ParsedPosting =
  | { ok: true; input: PostingInput }
  | { ok: false; problems: PostingProblem[] };

const ROLE_FAMILY_VALUES = new Set(ROLE_FAMILIES.map((r) => r.value as string));
const EMPLOYMENT_VALUES = new Set(EMPLOYMENT_TYPES.map((e) => e.value as string));
const LIKELIHOOD_VALUES = new Set(LIKELIHOODS.map((l) => l.value as string));
const DIVISION_VALUES = new Set(DIVISIONS.map((d) => d.value as string));
const CURRICULUM_VALUES = new Set(CURRICULA.map((c) => c.value as string));
const GRADE_VALUES = new Set(GRADE_LEVELS.map((g) => g.value as string));

/**
 * Shape only. The catalog of subjects and the catalog of criteria are the
 * database's to police — 0017 and 0004 both refuse an unknown value — and
 * re-listing either here would be a second copy to drift.
 */
export function parsePostingForm(form: FormData): ParsedPosting {
  const problems: PostingProblem[] = [];
  const str = (name: string) => String(form.get(name) ?? "").trim();
  const list = (name: string) =>
    [...new Set(form.getAll(name).filter((v): v is string => typeof v === "string" && v !== ""))];

  const title = str("title");
  if (!title) problems.push({ field: "title", message: "is required" });
  if (title.length > 200) problems.push({ field: "title", message: "is too long" });

  const roleFamily = str("roleFamily");
  if (!ROLE_FAMILY_VALUES.has(roleFamily)) {
    problems.push({ field: "roleFamily", message: "pick what kind of post this is" });
  }

  const whole = (name: string, label: string, min: number, fallback: number | null) => {
    const raw = str(name);
    if (!raw) return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min) {
      problems.push({ field: name, message: `${label} must be a whole number, ${min} or more` });
      return fallback;
    }
    return n;
  };

  const date = (name: string) => {
    const raw = str(name);
    if (!raw) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) {
      problems.push({ field: name, message: "is not a date" });
      return null;
    }
    return raw;
  };

  const applyByDate = date("applyByDate");
  const startDate = date("startDate");
  if (applyByDate && startDate && applyByDate > startDate) {
    problems.push({
      field: "applyByDate",
      message: "closes after the role starts — candidates could apply to a post already filled",
    });
  }

  const salaryMinUsd = whole("salaryMinUsd", "The salary floor", 0, null);
  const salaryMaxUsd = whole("salaryMaxUsd", "The salary ceiling", 0, null);
  if (salaryMinUsd !== null && salaryMaxUsd !== null && salaryMaxUsd < salaryMinUsd) {
    problems.push({ field: "salaryMaxUsd", message: "is below the figure you start at" });
  }

  const rankingCriteria = list("rankingCriteria");
  if (rankingCriteria.length < MIN_CRITERIA || rankingCriteria.length > MAX_CRITERIA) {
    problems.push({
      field: "rankingCriteria",
      message: `pick between ${MIN_CRITERIA} and ${MAX_CRITERIA}, in the order that matters to you`,
    });
  }

  const subjects = list("subjects");
  const specialisms = list("specialisms");
  if (roleFamily === "support_staff" && !specialisms.length && !subjects.length) {
    problems.push({
      field: "specialisms",
      message: "a student-support role needs a specialism, or nobody can be matched to it",
    });
  }
  if (roleFamily === "teacher" && !subjects.length) {
    problems.push({ field: "subjects", message: "a teaching role needs at least one subject" });
  }

  const division = str("division");
  if (division && !DIVISION_VALUES.has(division)) {
    problems.push({ field: "division", message: "is not a division" });
  }

  const curriculumRequired = list("curriculumRequired");
  for (const c of curriculumRequired) {
    if (!CURRICULUM_VALUES.has(c)) {
      problems.push({ field: "curriculumRequired", message: `unknown curriculum: ${c}` });
    }
  }
  const gradeLevels = list("gradeLevels");
  for (const g of gradeLevels) {
    if (!GRADE_VALUES.has(g)) {
      problems.push({ field: "gradeLevels", message: `unknown grade level: ${g}` });
    }
  }

  const employmentType = str("employmentType") || "full_time";
  if (!EMPLOYMENT_VALUES.has(employmentType)) {
    problems.push({ field: "employmentType", message: "is not an employment type" });
  }
  const likelihood = str("likelihood") || "definite";
  if (!LIKELIHOOD_VALUES.has(likelihood)) {
    problems.push({ field: "likelihood", message: "is not a likelihood" });
  }

  const status = str("status") === "posted" ? "posted" : "draft";
  const openingsAvailable = whole("openingsAvailable", "Openings", 1, 1) ?? 1;
  const minYearsExperience = whole("minYearsExperience", "Minimum experience", 0, 0) ?? 0;
  const contractLengthYears = whole("contractLengthYears", "The contract length", 1, null);
  const dependentTuitionCovered = whole("dependentTuitionCovered", "Tuition covered", 0, 0) ?? 0;

  if (problems.length) return { ok: false, problems };

  return {
    ok: true,
    input: {
      title,
      roleFamily: roleFamily as RoleFamily,
      subjects,
      specialisms,
      division: division || null,
      gradeLevels,
      curriculumRequired: curriculumRequired as Curriculum[],
      employmentType: employmentType as EmploymentType,
      academicYear: str("academicYear") || null,
      likelihood: likelihood as Likelihood,
      applyByDate,
      startDate,
      contractLengthYears,
      openingsAvailable,
      minYearsExperience,
      excludedNationalities: list("excludedNationalities"),
      coverLetterRequired: form.get("coverLetterRequired") === "on",
      salaryMinUsd,
      salaryMaxUsd,
      housingProvided: form.get("housingProvided") === "on",
      dependentTuitionCovered,
      rankingCriteria,
      status: status as JobPostingStatus,
    },
  };
}
