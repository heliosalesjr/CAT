/**
 * Runs the data layer against a seeded database.
 *
 *   DATABASE_URL=postgres://... npm run db:smoke
 *
 * `db:check` proves the SCHEMA behaves; this proves the TypeScript that talks
 * to it does — that the queries parse, that the columns exist under the names
 * the generated types claim, and that a Postgres date arrives as a string
 * rather than as yesterday. Typechecking cannot show any of that, because
 * nothing typechecks a string of SQL.
 *
 * It writes, so point it at a scratch database. Everything it creates is
 * cleaned up at the end; a failure part-way leaves rows behind on purpose, to
 * be looked at.
 */
import { pool, query } from "../src/lib/db/client.ts";
import { actorForIdentity, permissionsFor, schoolUserHas } from "../src/lib/db/actors.ts";
import {
  candidateById,
  completenessBreakdown,
  createCandidate,
  isRankable,
  practiceOptions,
  readiness,
  roleFamiliesFor,
  setRoleFamilies,
  updateCandidate,
} from "../src/lib/db/candidates.ts";
import {
  acceptInvite,
  inviteColleague,
  joinSchool,
  registerSchool,
  schoolsForEmail,
  searchSchools,
} from "../src/lib/db/schools.ts";

let passed = 0;
const failures: string[] = [];

function check(ok: boolean, what: string) {
  if (ok) {
    passed++;
    console.log(`  ok    ${what}`);
  } else {
    failures.push(what);
    console.log(`  FAIL  ${what}`);
  }
}

async function refuses(fn: () => Promise<unknown>, what: string) {
  try {
    await fn();
    failures.push(what);
    console.log(`  FAIL  ${what} -- it was allowed`);
  } catch (err) {
    passed++;
    const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
    console.log(`  ok    ${what} -- ${msg.slice(0, 60)}`);
  }
}

const made: { authUsers: string[]; candidates: string[]; schools: string[] } = {
  authUsers: [],
  candidates: [],
  schools: [],
};

async function makeIdentity(email: string): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO users (email) VALUES ($1) RETURNING id`,
    [email],
  );
  made.authUsers.push(rows[0].id);
  return rows[0].id;
}

console.log("Data layer, against a live database\n");

/* -------------------------------------------------------- types and shapes */

const daniel = await candidateById("tch_0001");
check(daniel !== null, "a candidate reads back");
check(daniel?.firstName === "Daniel", "snake_case columns arrive camelCase");
check(
  typeof daniel?.availableFrom === "string" && /^\d{4}-\d{2}-\d{2}$/.test(daniel.availableFrom),
  "a date column stays a calendar date and does not become yesterday",
);
check(daniel?.createdAt instanceof Date, "a timestamptz column is a Date");
check(Array.isArray(daniel?.subjects), "a text[] column is an array");
check(await candidateById("tch_nope") === null, "a missing candidate is null, not a throw");

/* ------------------------------------------------------------- permissions */

check(await schoolUserHas("usr_his_head", "view_salary"), "usr_his_head holds view_salary");
check(
  !(await schoolUserHas("usr_cai_principal", "view_salary")),
  "usr_cai_principal has it revoked, same role",
);
check((await permissionsFor("usr_his_coord")).length === 2, "the coordinator template resolves");

/* ------------------------------------------------- the email picks the school */

const matches = await schoolsForEmail("new.hire@example-his.edu");
check(
  matches.length === 1 && matches[0].schoolId === "sch_hangang",
  "a work email selects its school",
);
check((await schoolsForEmail("someone@gmail.com")).length === 0, "a personal address selects none");
check((await searchSchools("Hangang")).length === 1, "and the name search finds it as a fallback");

/* ------------------------------------------------------------ joining a school */

const joinerId = await makeIdentity("joiner@example-his.edu");
const joined = await joinSchool({
  authUserId: joinerId,
  email: "joiner@example-his.edu",
  schoolId: "sch_hangang",
  role: "coordinator",
  firstName: "Proved",
  lastName: "Domain",
});
check(joined.verified, "a matching work domain verifies the join with nobody in the loop");
check(await schoolUserHas(joined.user.id, "move_stage"), "... and their role template resolves");

const strangerId = await makeIdentity("stranger@elsewhere.test");
const stranger = await joinSchool({
  authUserId: strangerId,
  email: "stranger@elsewhere.test",
  schoolId: "sch_hangang",
  role: "hr",
  firstName: "Unproved",
});
check(!stranger.verified, "a claim from an unknown domain stays pending");
check(
  (await permissionsFor(stranger.user.id)).length === 0,
  "... and pending resolves to zero permissions, hr template or not",
);

/* --------------------------------------------------------------- the actor */

const actor = await actorForIdentity(joinerId);
check(
  actor?.type === "school_user" && actor.schoolId === "sch_hangang",
  "an identity resolves to one actor and its school",
);
check(await actorForIdentity("usr_nobody") === null, "an identity with no actor is null");

/* ------------------------------------------------------------- registering */

await refuses(
  () =>
    registerSchool({
      authUserId: "unused",
      email: "head@gmail.com",
      schoolName: "Gmail Academy",
      country: "Testland",
      timezone: "UTC",
      phone: "+1 555 0100",
      addressLine: "1 Test Street",
    }),
  "a school cannot be registered from a personal address",
);

const founderId = await makeIdentity("head@newschool.test");
const registered = await registerSchool({
  authUserId: founderId,
  email: "head@newschool.test",
  schoolName: "Smoke Test International",
  country: "Testland",
  city: "Testville",
  timezone: "UTC",
  phone: "+1 555 0101",
  addressLine: "1 Test Street",
  firstName: "First",
  lastName: "User",
});
made.schools.push(registered.school.id);
check(registered.school.id.startsWith("sch_"), "a registered school gets a generated id");
check(
  registered.school.verificationStatus === "pending",
  "... starts pending, so it cannot post until somebody confirms it",
);
check(
  (await permissionsFor(registered.user.id)).length === 0,
  "... and its first user has no permissions yet",
);
check(
  (await schoolsForEmail("colleague@newschool.test")).length === 0,
  "... and the claimed domain proves nothing while it is only a claim",
);

/* ----------------------------------------------------------------- invites */

const invite = await inviteColleague({
  schoolId: "sch_hangang",
  email: "colleague@example-his.edu",
  role: "coordinator",
  invitedById: "usr_his_hr",
});
check(invite.token.length >= 40, "an invite mints a token long enough to be a credential");
check(
  !(await query<{ n: string }>(
    `SELECT count(*) AS n FROM school_user_invites WHERE token_sha256 = $1`,
    [invite.token],
  ).then((r) => Number(r[0].n) > 0)),
  "... and the plaintext is nowhere in the database",
);

await refuses(
  () =>
    inviteColleague({
      schoolId: "sch_hangang",
      email: "someone@example-his.edu",
      role: "coordinator",
      invitedById: stranger.user.id,
    }),
  "a pending user cannot invite their way past the gate",
);

const inviteeId = await makeIdentity("colleague@example-his.edu");
const invitedUserId = await acceptInvite({
  token: invite.token,
  authUserId: inviteeId,
  firstName: "Invited",
});
check(await schoolUserHas(invitedUserId, "move_stage"), "accepting an invite arrives verified");
await refuses(
  () => acceptInvite({ token: invite.token, authUserId: inviteeId }),
  "an invite is single-use",
);

/* ------------------------------------------------------- candidate profile */

const newCandidateId = await makeIdentity("newteacher@example.test");
const fresh = await createCandidate({
  authUserId: newCandidateId,
  email: "newteacher@example.test",
  firstName: "Just",
  lastName: "Signed-up",
  timezone: "America/Chicago",
});
made.candidates.push(fresh.id);
check(fresh.id.startsWith("cnd_"), "a new candidate gets a generated id");
check(fresh.profileCompleteness < 70, "step one is not rankable");
check(!(await isRankable(fresh.id)), "... and rule 6 says so through the database");

const options = await practiceOptions("subject");
check(options.length === 24, "the picker offers the catalogued subjects");

const filled = await updateCandidate(fresh.id, {
  headline: "PYP homeroom teacher",
  subjects: ["Mathematics"],
  curriculumExperience: ["IB_PYP"],
  nationality: "United States",
  highestDegree: "masters",
  availableFrom: "2027-08-01",
});
check(
  filled.profileCompleteness > fresh.profileCompleteness,
  "filling the form moves completeness without the app computing it",
);

await refuses(
  () => updateCandidate(fresh.id, { subjects: ["Maths"] }),
  '"Maths" is refused: the catalog is one vocabulary',
);
await refuses(
  // @ts-expect-error — not in EDITABLE, and the allow-list is the point
  () => updateCandidate(fresh.id, { profileCompleteness: 100 }),
  "a patch cannot write the number the trigger owns",
);

await setRoleFamilies(fresh.id, ["teacher", "administrator"]);
check(
  (await roleFamiliesFor(fresh.id)).join() === "teacher,administrator",
  "a candidate may want more than one kind of post, in enum order",
);

const breakdown = await completenessBreakdown(fresh.id);
check(
  breakdown.reduce((s, l) => s + l.weight, 0) === 100,
  "the completeness breakdown still sums to 100",
);
check(
  breakdown.some((l) => !l.present && l.weight > 0),
  "... and names what is still missing, for the form to show",
);
check(typeof (await readiness("tch_0001")) === "number", "readiness is its own number");

/* ----------------------------------------------------------------- cleanup */

await query(`DELETE FROM candidate_role_families WHERE candidate_id = ANY($1)`, [made.candidates]);
await query(`DELETE FROM candidates WHERE id = ANY($1)`, [made.candidates]);
// Invites first: accepted_school_user_id points at users made below, and the
// foreign key is RESTRICT because an accepted invite is a record of how
// somebody got in.
await query(
  `DELETE FROM school_user_invites
   WHERE school_id = ANY($1)
      OR invited_by_id IN (SELECT id FROM school_users WHERE auth_user_id = ANY($2))
      OR accepted_school_user_id IN (SELECT id FROM school_users WHERE auth_user_id = ANY($2))`,
  [made.schools, made.authUsers],
);
await query(`DELETE FROM school_users WHERE auth_user_id = ANY($1)`, [made.authUsers]);
await query(`DELETE FROM school_email_domains WHERE school_id = ANY($1)`, [made.schools]);
await query(`DELETE FROM schools WHERE id = ANY($1)`, [made.schools]);
await query(`DELETE FROM users WHERE id = ANY($1)`, [made.authUsers]);

await pool.end();

console.log(
  failures.length
    ? `\n${passed} passed, ${failures.length} FAILED:\n  - ${failures.join("\n  - ")}`
    : `\n${passed} checks passed. Scratch rows cleaned up.`,
);
process.exit(failures.length ? 1 : 0);
