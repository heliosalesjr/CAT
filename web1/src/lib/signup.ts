import "server-only";
import { createCandidate, setRoleFamilies } from "./db/candidates.ts";
import { query } from "./db/client.ts";
import { joinSchool, registerSchool, schoolsForEmail } from "./db/schools.ts";
import type { Candidate } from "./db/candidates.ts";
import type { School, SchoolUser } from "./db/schools.ts";
import type { RoleFamily, SchoolUserRole } from "./db/schema.ts";

/**
 * Finishing signup, once Auth.js has proved the address.
 *
 * Deliberately plain functions and not server actions: an action is a
 * transport, and putting the rules in one would mean the only way to test
 * them is to drive a form. These are what `db/signup-smoke.ts` exercises and
 * what `src/app/signup/actions.ts` calls.
 *
 * The order of the whole flow matters and is worth stating, because it is the
 * reason none of this stores anything for an unproved address: the email
 * comes first and is the login. By the time any function here runs, Auth.js
 * has a verified `users` row, and the person's domain has already answered
 * which school they belong to.
 */

export type Problem = { field: string; message: string };

export class InvalidSignup extends Error {
  // Written out rather than declared as a constructor parameter property:
  // that TypeScript shorthand emits runtime code, and Node's type stripping
  // only erases types. Anything in src/ that db/smoke.ts imports has to stay
  // inside that subset — no parameter properties, no `enum`, no namespaces.
  readonly problems: Problem[];

  constructor(problems: Problem[]) {
    super(problems.map((p) => `${p.field}: ${p.message}`).join("; "));
    this.name = "InvalidSignup";
    this.problems = problems;
  }
}

const ROLE_FAMILIES: readonly RoleFamily[] = ["teacher", "administrator", "support_staff"];
const SCHOOL_ROLES: readonly SchoolUserRole[] = ["hr", "principal", "coordinator"];

/* ------------------------------------------------------------ small checks */

function text(value: unknown, field: string, max: number, problems: Problem[]): string {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) problems.push({ field, message: "is required" });
  else if (v.length > max) problems.push({ field, message: `is longer than ${max} characters` });
  return v;
}

/**
 * The browser sends the zone it thinks it is in, so this is untrusted input
 * that lands in a NOT NULL column every interview time is rendered against.
 * `Intl` is the only list worth checking against, and it throws for a zone it
 * does not know.
 */
function timezone(value: unknown, problems: Problem[]): string {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) {
    problems.push({ field: "timezone", message: "is required" });
    return "UTC";
  }
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: v });
    return v;
  } catch {
    problems.push({ field: "timezone", message: `is not a time zone: ${v}` });
    return "UTC";
  }
}

/* ------------------------------------------------------------- a candidate */

export type CandidateSignup = {
  authUserId: string;
  email: string;
  firstName: unknown;
  lastName: unknown;
  timezone: unknown;
  roleFamilies: unknown;
};

/**
 * Step one of the candidate form, plus decision 3's question.
 *
 * At least one role family is required here even though the schema allows
 * none. The two are not in conflict: an undeclared candidate is unfiltered
 * rather than excluded, which is what the 136 profiles that predate the
 * question need, but somebody signing up today is being asked, and leaving
 * the answer empty would make matching guess for no reason.
 */
export async function finishCandidateSignup(
  input: CandidateSignup,
): Promise<{ candidate: Candidate; families: RoleFamily[] }> {
  const problems: Problem[] = [];
  const firstName = text(input.firstName, "firstName", 80, problems);
  const lastName = text(input.lastName, "lastName", 80, problems);
  const tz = timezone(input.timezone, problems);

  const families = (Array.isArray(input.roleFamilies) ? input.roleFamilies : []).filter(
    (f): f is RoleFamily => ROLE_FAMILIES.includes(f as RoleFamily),
  );
  const unique = [...new Set(families)];
  if (!unique.length) {
    problems.push({ field: "roleFamilies", message: "pick at least one kind of post" });
  }

  if (problems.length) throw new InvalidSignup(problems);

  const candidate = await createCandidate({
    authUserId: input.authUserId,
    email: input.email,
    firstName,
    lastName,
    timezone: tz,
  });
  await setRoleFamilies(candidate.id, unique);
  return { candidate, families: unique };
}

/* ---------------------------------------------------------- a school user */

/**
 * What the form offers after the work email is known. Three outcomes, and the
 * UI shows a different screen for each: one match preselects, several mean a
 * group and the person picks their campus, none means search by name or
 * register a school nobody has yet.
 */
export async function schoolOptionsForEmail(email: string) {
  const matches = await schoolsForEmail(email);
  return {
    matches,
    outcome: matches.length === 1 ? "preselected" : matches.length > 1 ? "choose" : "unknown",
  } as const;
}

/**
 * Which role a self-serve joiner may take.
 *
 * Somebody whose work domain checks out provably works at the school — it
 * does not follow that they should hold billing and user administration. So
 * the first person at a school may be `hr`, because somebody has to set it
 * up, and everybody after them joins as `coordinator` and is elevated by an
 * admin who is already there. A school that wants a second administrator
 * invites them, which carries the role explicitly.
 *
 * This lives here and not in a trigger, which is a trade worth knowing about:
 * `joinSchool()` is the only path that creates a self-serve school user, so
 * the rule holds today, and the day a second path exists it should become a
 * constraint instead.
 */
export async function roleForJoiner(
  schoolId: string,
  requested: unknown,
): Promise<SchoolUserRole> {
  const asked = SCHOOL_ROLES.includes(requested as SchoolUserRole)
    ? (requested as SchoolUserRole)
    : "coordinator";

  const [{ n }] = await query<{ n: string }>(
    `SELECT count(*) AS n FROM school_users
     WHERE school_id = $1 AND verified_at IS NOT NULL AND deleted_at IS NULL`,
    [schoolId],
  );
  const established = Number(n) > 0;
  return established ? "coordinator" : asked;
}

export type SchoolJoinSignup = {
  authUserId: string;
  email: string;
  schoolId: unknown;
  firstName: unknown;
  lastName: unknown;
  title?: unknown;
  requestedRole?: unknown;
};

export async function finishSchoolJoin(
  input: SchoolJoinSignup,
): Promise<{ user: SchoolUser; verified: boolean }> {
  const problems: Problem[] = [];
  const firstName = text(input.firstName, "firstName", 80, problems);
  const lastName = text(input.lastName, "lastName", 80, problems);
  const schoolId = text(input.schoolId, "schoolId", 80, problems);
  if (problems.length) throw new InvalidSignup(problems);

  const [school] = await query<{ id: string }>(
    `SELECT id FROM schools WHERE id = $1 AND deleted_at IS NULL`,
    [schoolId],
  );
  if (!school) throw new InvalidSignup([{ field: "schoolId", message: "no such school" }]);

  return joinSchool({
    authUserId: input.authUserId,
    email: input.email,
    schoolId,
    role: await roleForJoiner(schoolId, input.requestedRole),
    firstName,
    lastName,
    title: typeof input.title === "string" ? input.title.trim() || undefined : undefined,
  });
}

/* -------------------------------------------------------- a new school */

export type SchoolRegistration = {
  authUserId: string;
  email: string;
  schoolName: unknown;
  country: unknown;
  city?: unknown;
  timezone: unknown;
  phone: unknown;
  addressLine: unknown;
  postalCode?: unknown;
  website?: unknown;
  firstName: unknown;
  lastName: unknown;
  title?: unknown;
};

/**
 * Nobody had registered this school. Phone and address are required because a
 * human confirms them, and the school starts `pending`: it cannot post until
 * somebody does, and its domain is recorded as a claim so nobody else walks in
 * behind it on an unproved domain.
 */
export async function finishSchoolRegistration(
  input: SchoolRegistration,
): Promise<{ school: School; user: SchoolUser }> {
  const problems: Problem[] = [];
  const schoolName = text(input.schoolName, "schoolName", 200, problems);
  const country = text(input.country, "country", 100, problems);
  const phone = text(input.phone, "phone", 40, problems);
  const addressLine = text(input.addressLine, "addressLine", 200, problems);
  const firstName = text(input.firstName, "firstName", 80, problems);
  const lastName = text(input.lastName, "lastName", 80, problems);
  const tz = timezone(input.timezone, problems);
  if (problems.length) throw new InvalidSignup(problems);

  const optional = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;

  return registerSchool({
    authUserId: input.authUserId,
    email: input.email,
    schoolName,
    country,
    city: optional(input.city),
    timezone: tz,
    phone,
    addressLine,
    postalCode: optional(input.postalCode),
    website: optional(input.website),
    // The first person at a school they registered themselves administers it.
    // They are pending until a human confirms the school, so the role grants
    // nothing until then.
    role: "hr",
    firstName,
    lastName,
    title: optional(input.title),
  });
}
