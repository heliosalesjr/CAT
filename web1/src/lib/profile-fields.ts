import type { CandidatePatch } from "./db/candidates.ts";
import type { RoleFamily } from "./db/schema.ts";

/**
 * What a candidate may edit, described once.
 *
 * The form renders from this and the server action parses from it, which is
 * the only way the two stay in step: a field added to the screen and not to
 * the parser would silently fail to save, and a field parsed but not rendered
 * is dead code nobody notices. It is the same reason completeness is one
 * breakdown read by both the screen and the ranking.
 *
 * No "server-only" here — the client renders from this file too. It holds no
 * secrets and reaches no database.
 */

export type FieldKind =
  /** One line of text. */
  | "text"
  /** A whole number. */
  | "number"
  /** Money, whole USD. */
  | "money"
  /** A calendar date, 'YYYY-MM-DD'. */
  | "date"
  /** Yes or no. */
  | "bool"
  /** Free list — the person types their own values. */
  | "tags"
  /** A list chosen from the catalog in 0017. */
  | "subjects"
  | "specialisms"
  /** A list chosen from a database enum. */
  | "curricula"
  | "grades"
  /** One value from a database enum. */
  | "degree";

export type ProfileField = {
  /** camelCase, and must be in `EDITABLE` in db/candidates.ts. */
  name: keyof CandidatePatch;
  label: string;
  kind: FieldKind;
  hint?: string;
  max?: number;
};

export type ProfileSection = {
  id: string;
  title: string;
  blurb: string;
  fields: ProfileField[];
};

/**
 * The sections and the copy come from the mockup this replaces — they were
 * written with the co-founder and say things no schema can: that work permits
 * turn on nationality, that leadership years are weighed above classroom
 * years for coordinator posts, that a salary expectation is never shown to a
 * school as a number.
 */
export const PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: "you",
    title: "You",
    blurb: "What a school sees first, and how they reach you.",
    fields: [
      { name: "firstName", label: "First name", kind: "text", max: 80 },
      { name: "lastName", label: "Last name", kind: "text", max: 80 },
      {
        name: "headline",
        label: "Headline",
        kind: "text",
        max: 200,
        hint: "One line. This is what appears beside your name on a shortlist.",
      },
      {
        name: "nationality",
        label: "Nationality",
        kind: "text",
        max: 100,
        hint: "Work permits turn on this. Some postings exclude nationalities for permit reasons, and you are told before you apply.",
      },
      {
        name: "nationalities",
        label: "All passports held",
        kind: "tags",
        hint: "A second passport often changes which countries can hire you.",
      },
      { name: "languages", label: "Languages", kind: "tags" },
      { name: "linkedinUrl", label: "LinkedIn", kind: "text", max: 300, hint: "Optional." },
    ],
  },
  {
    id: "where",
    title: "Where you are, where you'd go",
    blurb: "Regional experience is one of the ten ranking criteria.",
    fields: [
      { name: "currentSchool", label: "Current school", kind: "text", max: 200 },
      { name: "currentCity", label: "City", kind: "text", max: 100 },
      { name: "currentCountry", label: "Country", kind: "text", max: 100 },
      { name: "regionsWorked", label: "Regions you have worked in", kind: "tags" },
      { name: "preferredRegions", label: "Regions you would move to", kind: "tags" },
    ],
  },
  {
    id: "teaching",
    title: "What you do",
    blurb:
      "The single biggest factor in whether a school's ranking puts you near the top. Leadership and student-support roles are read from the same fields.",
    fields: [
      {
        name: "subjects",
        label: "Subjects you teach",
        kind: "subjects",
        hint: "Chosen from one list so that a Mathematics posting finds you — a school typing “Maths” and you typing “Mathematics” would never match.",
      },
      {
        name: "specialisms",
        label: "Specialism, if your work is not a taught subject",
        kind: "specialisms",
        hint: "Counselling, learning support, library, nursing, admissions. Leave empty if you teach a subject.",
      },
      {
        name: "curriculumExperience",
        label: "Curricula",
        kind: "curricula",
        hint: "Schools filter hard on this, including for roles outside the classroom — a counsellor at an IB school is expected to know the programme.",
      },
      { name: "gradeLevels", label: "Grade levels", kind: "grades" },
      { name: "yearsExperience", label: "Years in the profession", kind: "number" },
      { name: "yearsInSubject", label: "Years in your specialism", kind: "number" },
      {
        name: "leadershipYears",
        label: "Years leading a team",
        kind: "number",
        hint: "Coordination or department-head time. Counted separately because coordinator roles weigh it above classroom years.",
      },
      { name: "coachingCapable", label: "I can coach or run an activity", kind: "bool" },
      { name: "coachingActivities", label: "Coaching and activities", kind: "tags" },
    ],
  },
  {
    id: "quals",
    title: "Qualifications",
    blurb: "Backed by the documents below. Both have to agree.",
    fields: [
      { name: "highestDegree", label: "Highest degree", kind: "degree" },
      { name: "degreeField", label: "Field", kind: "text", max: 200 },
    ],
  },
  {
    id: "package",
    title: "Package and family",
    blurb: "Never shown to schools as a number. It filters which roles reach you.",
    fields: [
      { name: "salaryExpectationMinUsd", label: "Salary expectation, from", kind: "money" },
      { name: "salaryExpectationMaxUsd", label: "to", kind: "money" },
      {
        name: "dependents",
        label: "Dependents moving with you",
        kind: "number",
        hint: "Decides whether a package covering two tuitions is viable for you.",
      },
      { name: "availableFrom", label: "Available from", kind: "date" },
      { name: "firstTimeInternational", label: "This would be my first post abroad", kind: "bool" },
    ],
  },
];

export const ALL_FIELDS: ProfileField[] = PROFILE_SECTIONS.flatMap((s) => s.fields);

/** Enum options the form offers. Values are what the columns accept. */
export const DEGREES = [
  { value: "bachelors", label: "Bachelor's" },
  { value: "masters", label: "Master's" },
  { value: "doctorate", label: "Doctorate" },
] as const;

export const CURRICULA = [
  { value: "IB_PYP", label: "IB PYP" },
  { value: "IB_MYP", label: "IB MYP" },
  { value: "IB_DP", label: "IB DP" },
  { value: "IB_CP", label: "IB CP" },
  { value: "Cambridge_IGCSE", label: "Cambridge IGCSE" },
  { value: "Cambridge_A_Level", label: "Cambridge A Level" },
  { value: "AP", label: "AP" },
  { value: "US_Common_Core", label: "US Common Core" },
  { value: "British_National", label: "British National" },
  { value: "Australian", label: "Australian" },
] as const;

export const GRADE_LEVELS = [
  { value: "early_years", label: "Early years" },
  { value: "elementary", label: "Elementary" },
  { value: "middle", label: "Middle" },
  { value: "high", label: "High" },
] as const;

export const ROLE_FAMILY_LABELS: Record<RoleFamily, string> = {
  teacher: "Classroom teaching",
  administrator: "Leadership",
  support_staff: "Student support and specialist roles",
};

/* ------------------------------------------------------------------ parsing */

export type FieldProblem = { field: string; message: string };

/**
 * What the save action answers. Declared here rather than in the action so
 * that the client component does not have to import a "use server" module to
 * know the shape of its own form state.
 */
export type ProfileSaveState =
  | { status: "saved"; completeness: number; at: number }
  | { status: "invalid"; problems: FieldProblem[] }
  | { status: "error"; message: string }
  | null;

export type ParsedProfile = {
  patch: CandidatePatch;
  families: RoleFamily[] | null;
  problems: FieldProblem[];
};

const CURRICULUM_VALUES = new Set(CURRICULA.map((c) => c.value as string));
const GRADE_VALUES = new Set(GRADE_LEVELS.map((g) => g.value as string));
const DEGREE_VALUES = new Set(DEGREES.map((d) => d.value as string));
const FAMILY_VALUES = new Set<string>(["teacher", "administrator", "support_staff"]);

/**
 * Form values into a patch the data layer will accept.
 *
 * Only the keys the form actually sent are included, so saving one section
 * cannot blank out another — which matters because this profile is filled in
 * over many sittings and half of it is empty most of the time.
 *
 * Catalog values are NOT validated here. `practice_catalog` is the authority
 * and the trigger in 0017 refuses anything outside it; re-listing the
 * vocabulary in TypeScript would be a second copy to drift. What this does
 * check is the shape: a number that is a number, a date that is a date, an
 * enum value that the column will accept.
 */
export function parseProfileForm(form: FormData): ParsedProfile {
  const patch: Record<string, unknown> = {};
  const problems: FieldProblem[] = [];

  for (const f of ALL_FIELDS) {
    const name = f.name as string;
    // `sent` marks which fields this submission is responsible for. A checkbox
    // that is off sends nothing, so the form posts a companion marker.
    const present = form.has(name) || form.has(`${name}__sent`);
    if (!present) continue;

    const raw = form.get(name);
    const str = typeof raw === "string" ? raw.trim() : "";

    switch (f.kind) {
      case "text": {
        if (f.max && str.length > f.max) {
          problems.push({ field: name, message: `is longer than ${f.max} characters` });
          break;
        }
        patch[name] = str || null;
        break;
      }
      case "number":
      case "money": {
        if (!str) {
          patch[name] = null;
          break;
        }
        const n = Number(str);
        if (!Number.isInteger(n) || n < 0) {
          problems.push({ field: name, message: "must be a whole number, zero or more" });
          break;
        }
        patch[name] = n;
        break;
      }
      case "date": {
        if (!str) {
          patch[name] = null;
          break;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(str) || Number.isNaN(Date.parse(str))) {
          problems.push({ field: name, message: "is not a date" });
          break;
        }
        patch[name] = str;
        break;
      }
      case "bool": {
        patch[name] = form.get(name) === "on" || form.get(name) === "true";
        break;
      }
      case "tags": {
        patch[name] = splitTags(form.getAll(name));
        break;
      }
      case "subjects":
      case "specialisms": {
        patch[name] = uniqueStrings(form.getAll(name));
        break;
      }
      case "curricula": {
        patch[name] = pickFrom(form.getAll(name), CURRICULUM_VALUES, name, problems);
        break;
      }
      case "grades": {
        patch[name] = pickFrom(form.getAll(name), GRADE_VALUES, name, problems);
        break;
      }
      case "degree": {
        if (!str) {
          patch[name] = null;
          break;
        }
        if (!DEGREE_VALUES.has(str)) {
          problems.push({ field: name, message: "is not one of the degrees offered" });
          break;
        }
        patch[name] = str;
        break;
      }
    }
  }

  // The salary pair is the one cross-field rule, and the database has the
  // same CHECK — this exists so the person is told which field to fix rather
  // than shown a constraint name.
  const min = patch.salaryExpectationMinUsd;
  const max = patch.salaryExpectationMaxUsd;
  if (typeof min === "number" && typeof max === "number" && max < min) {
    problems.push({
      field: "salaryExpectationMaxUsd",
      message: "is below the figure you start at",
    });
  }

  const families = form.has("roleFamilies__sent")
    ? [
        ...new Set(
          form
            .getAll("roleFamilies")
            .filter((v): v is string => typeof v === "string" && FAMILY_VALUES.has(v)),
        ),
      ].map((v) => v as RoleFamily)
    : null;

  if (families && families.length === 0) {
    problems.push({ field: "roleFamilies", message: "pick at least one kind of post" });
  }

  return { patch: patch as CandidatePatch, families, problems };
}

function splitTags(values: FormDataEntryValue[]): string[] {
  const out: string[] = [];
  for (const v of values) {
    if (typeof v !== "string") continue;
    // Typed as a list, so both separators people reach for work.
    for (const part of v.split(/[,\n]/)) {
      const t = part.trim();
      if (t && !out.includes(t)) out.push(t);
    }
  }
  return out;
}

function uniqueStrings(values: FormDataEntryValue[]): string[] {
  return [
    ...new Set(values.filter((v): v is string => typeof v === "string" && v.trim() !== "")),
  ];
}

function pickFrom(
  values: FormDataEntryValue[],
  allowed: Set<string>,
  field: string,
  problems: FieldProblem[],
): string[] {
  const out: string[] = [];
  for (const v of values) {
    if (typeof v !== "string" || !v) continue;
    if (!allowed.has(v)) {
      problems.push({ field, message: `has a value this field does not offer: ${v}` });
      continue;
    }
    if (!out.includes(v)) out.push(v);
  }
  return out;
}
