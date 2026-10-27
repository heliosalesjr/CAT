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
import {
  actorForIdentity,
  claimPlatformSeat,
  permissionsFor,
  platformUserIsActive,
  schoolUserHas,
} from "../src/lib/db/actors.ts";
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
import { parseProfileForm } from "../src/lib/profile-fields.ts";
import { applyProfileSave } from "../src/lib/profile-save.ts";
import {
  InvalidSignup,
  finishCandidateSignup,
  finishSchoolJoin,
  finishSchoolRegistration,
  roleForJoiner,
  schoolOptionsForEmail,
} from "../src/lib/signup.ts";
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

/* ------------------------------------------------------------ signup rules */

// Validation runs before anything is written, so a bad form leaves no rows.
await refuses(
  () =>
    finishCandidateSignup({
      authUserId: "unused",
      email: "x@example.test",
      firstName: "  ",
      lastName: "Nobody",
      timezone: "America/Chicago",
      roleFamilies: ["teacher"],
    }),
  "a blank name is refused before the insert",
);
await refuses(
  () =>
    finishCandidateSignup({
      authUserId: "unused",
      email: "x@example.test",
      firstName: "Someone",
      lastName: "Nobody",
      timezone: "Mars/Olympus_Mons",
      roleFamilies: ["teacher"],
    }),
  "a time zone the browser invented is refused",
);
await refuses(
  () =>
    finishCandidateSignup({
      authUserId: "unused",
      email: "x@example.test",
      firstName: "Someone",
      lastName: "Nobody",
      timezone: "UTC",
      roleFamilies: ["headmaster of everything"],
    }),
  "a role family outside the enum counts as none, and none is refused",
);

const signupIdentity = await makeIdentity("signup@example.test");
const signedUp = await finishCandidateSignup({
  authUserId: signupIdentity,
  email: "signup@example.test",
  firstName: "Signed",
  lastName: "Up",
  timezone: "America/Chicago",
  roleFamilies: ["teacher", "administrator", "teacher"],
});
made.candidates.push(signedUp.candidate.id);
check(signedUp.families.length === 2, "a duplicated role family is stored once");
check(
  (await roleFamiliesFor(signedUp.candidate.id)).length === 2,
  "... and the declaration reaches the database",
);
check(
  (await actorForIdentity(signupIdentity))?.type === "candidate",
  "... and the identity now resolves to a candidate",
);

// The role a self-serve joiner may take.
check(
  (await roleForJoiner("sch_hangang", "hr")) === "coordinator",
  "a school with staff already does not hand out hr to whoever signs up",
);
check(
  (await roleForJoiner(registered.school.id, "hr")) === "hr",
  "... but somebody has to administer a school with nobody in it yet",
);

await refuses(
  () =>
    finishSchoolJoin({
      authUserId: "unused",
      email: "someone@example-his.edu",
      schoolId: "sch_does_not_exist",
      firstName: "No",
      lastName: "School",
    }),
  "joining a school that does not exist is refused",
);

const joinerTwo = await makeIdentity("second.joiner@example-his.edu");
const joinedTwo = await finishSchoolJoin({
  authUserId: joinerTwo,
  email: "second.joiner@example-his.edu",
  schoolId: "sch_hangang",
  firstName: "Second",
  lastName: "Joiner",
  requestedRole: "hr",
});
check(joinedTwo.verified, "a work domain still verifies the join");
check(joinedTwo.user.role === "coordinator", "... at the role the rule allows, not the one asked");

const domainOptions = await schoolOptionsForEmail("someone@example-cai.edu.co");
check(domainOptions.outcome === "preselected", "one domain match preselects the school");
check(
  (await schoolOptionsForEmail("someone@gmail.com")).outcome === "unknown",
  "a personal address leaves the school unknown",
);

const regIdentity = await makeIdentity("head@another-school.test");
const registeredTwo = await finishSchoolRegistration({
  authUserId: regIdentity,
  email: "head@another-school.test",
  schoolName: "Second Smoke International",
  country: "Testland",
  timezone: "UTC",
  phone: "+1 555 0102",
  addressLine: "2 Test Street",
  firstName: "Second",
  lastName: "Founder",
});
made.schools.push(registeredTwo.school.id);
check(registeredTwo.user.role === "hr", "whoever registers a school administers it");
check(
  (await permissionsFor(registeredTwo.user.id)).length === 0,
  "... and still holds nothing until a human confirms the school",
);

await refuses(
  () =>
    finishSchoolRegistration({
      authUserId: "unused",
      email: "head@another-school.test",
      schoolName: "Missing Phone Academy",
      country: "Testland",
      timezone: "UTC",
      phone: "",
      addressLine: "3 Test Street",
      firstName: "No",
      lastName: "Phone",
    }),
  "a school cannot be registered without the details a human will check",
);

check(
  new InvalidSignup([{ field: "phone", message: "is required" }]).problems.length === 1,
  "validation problems come back per field, for the form to show",
);

/* --------------------------------------------------- the profile form parser */

// A pure function, so these run without touching the database — but they run
// here because the whole point of the parser is that what it produces is what
// the data layer accepts.
{
  const f = new FormData();
  f.set("headline", "  DP Chemistry teacher  ");
  f.set("yearsExperience", "9");
  f.set("availableFrom", "2027-08-01");
  f.set("languages", "English, Spanish\nFrench");
  f.append("subjects", "Chemistry");
  f.append("subjects", "General Science");
  f.append("curriculumExperience", "IB_DP");
  f.set("coachingCapable__sent", "1");
  const { patch, families, problems } = parseProfileForm(f);

  check(problems.length === 0, "a well-filled form parses with no complaints");
  check(patch.headline === "DP Chemistry teacher", "text is trimmed");
  check(patch.yearsExperience === 9, "a number arrives as a number");
  check(patch.availableFrom === "2027-08-01", "a date stays the string the column wants");
  check(
    JSON.stringify(patch.languages) === '["English","Spanish","French"]',
    "a typed list splits on commas and newlines",
  );
  check(patch.coachingCapable === false, "an unticked checkbox saves false, not nothing");
  check(families === null, "a form that did not ask about role families leaves them alone");
  check(!("firstName" in patch), "a field the form did not send is not in the patch");
}

{
  const f = new FormData();
  f.set("yearsExperience", "nine");
  f.set("availableFrom", "next August");
  f.set("highestDegree", "honorary");
  f.append("curriculumExperience", "IB_MADE_UP");
  f.set("salaryExpectationMinUsd", "60000");
  f.set("salaryExpectationMaxUsd", "50000");
  f.set("roleFamilies__sent", "1");
  const { problems } = parseProfileForm(f);
  const named = (field: string) => problems.some((p) => p.field === field);

  check(named("yearsExperience"), "a number that is not a number is refused");
  check(named("availableFrom"), "a date that is not a date is refused");
  check(named("highestDegree"), "a degree outside the enum is refused");
  check(named("curriculumExperience"), "a curriculum outside the list is refused");
  check(
    named("salaryExpectationMaxUsd"),
    "a salary range that runs backwards names the field to fix, not a constraint",
  );
  check(named("roleFamilies"), "clearing every role family is refused");
  check(problems.length === 6, "every problem is reported at once, not one per submit");
}

// And the patch the parser produces goes through the data layer unchanged.
{
  const f = new FormData();
  f.set("headline", "Parsed end to end");
  f.append("subjects", "Mathematics");
  f.set("roleFamilies__sent", "1");
  f.append("roleFamilies", "teacher");
  const { patch, families } = parseProfileForm(f);
  const saved = await updateCandidate(fresh.id, patch);
  check(saved.headline === "Parsed end to end", "the parsed patch saves");
  check(
    JSON.stringify(saved.subjects) === '["Mathematics"]',
    "... including a catalog-backed list",
  );
  if (families) await setRoleFamilies(fresh.id, families);
  check((await roleFamiliesFor(fresh.id)).length === 1, "... and the families it carried");
}

/* ------------------------------------------- saving a profile, as the form does */

// What the server action does, minus the session lookup and the revalidate.
{
  const f = new FormData();
  f.set("firstName", "Perfil");
  f.set("lastName", "Real");
  f.set("headline", "DP Chemistry teacher, 9 years");
  f.set("nationality", "United States");
  f.set("subjects__sent", "1");
  f.append("subjects", "Chemistry");
  f.append("subjects", "General Science");
  f.set("curriculumExperience__sent", "1");
  f.append("curriculumExperience", "IB_DP");
  f.set("gradeLevels__sent", "1");
  f.append("gradeLevels", "high");
  f.set("yearsExperience", "9");
  f.set("yearsInSubject", "9");
  f.set("highestDegree", "masters");
  f.set("degreeField", "Chemistry Education");
  f.set("availableFrom", "2027-08-01");
  f.set("preferredRegions__sent", "1");
  f.append("preferredRegions", "East Asia");
  f.set("regionsWorked__sent", "1");
  f.append("regionsWorked", "Middle East");
  f.set("languages__sent", "1");
  f.append("languages", "English");
  f.set("salaryExpectationMinUsd", "58000");
  f.set("salaryExpectationMaxUsd", "72000");
  f.set("roleFamilies__sent", "1");
  f.append("roleFamilies", "teacher");
  f.append("roleFamilies", "administrator");

  const before = (await candidateById(fresh.id))!.profileCompleteness;
  const result = await applyProfileSave(fresh.id, f);
  check(result?.status === "saved", "a filled form saves");

  const after = await candidateById(fresh.id);
  check(
    result?.status === "saved" && result.completeness === after!.profileCompleteness,
    "the number the form shows is the number the database holds",
  );
  check(after!.profileCompleteness > before, "and it went up");
  check(after!.headline === "DP Chemistry teacher, 9 years", "text landed");
  check(
    JSON.stringify(after!.subjects) === '["Chemistry","General Science"]',
    "a catalog-backed list landed in order",
  );
  check(after!.availableFrom === "2027-08-01", "a date landed as a calendar date");
  check((await roleFamiliesFor(fresh.id)).length === 2, "and both role families landed");
}

// A refusal leaves the row exactly as it was, because validation runs first.
{
  const before = await candidateById(fresh.id);
  const bad = new FormData();
  bad.set("headline", "Should not land");
  bad.set("yearsExperience", "about nine");
  const result = await applyProfileSave(fresh.id, bad);
  check(result?.status === "invalid", "a bad field refuses the whole save");
  const after = await candidateById(fresh.id);
  check(after!.headline === before!.headline, "... and nothing else in the form was written");
}

// A value the catalog does not know is refused by the database, not by a
// second copy of the vocabulary in TypeScript.
{
  const bad = new FormData();
  bad.set("subjects__sent", "1");
  bad.append("subjects", "Maths");
  const result = await applyProfileSave(fresh.id, bad);
  check(result?.status === "error", "an uncatalogued subject comes back as an error");
  check(
    result?.status === "error" && /catalog/.test(result.message),
    "... with the database's own words, which were written to be read",
  );
}

/* ----------------------------------------------- the staff allowlist (0019) */

{
  // A seat, created the only way there is: from the command line.
  await query(
    `INSERT INTO platform_users (id, email, first_name, role)
     VALUES ('plt_smoke', 'staff.smoke@example.test', 'Smoke', 'owner')`,
  );

  const identity = await makeIdentity("staff.smoke@example.test");
  const claimed = await claimPlatformSeat(identity, "staff.smoke@example.test");
  check(claimed === "plt_smoke", "signing in with a listed address claims the seat");
  check(
    (await claimPlatformSeat(identity, "staff.smoke@example.test")) === null,
    "... and claiming twice is a no-op, so every sign-in can try",
  );

  const stranger = await makeIdentity("not.staff@example.test");
  check(
    (await claimPlatformSeat(stranger, "not.staff@example.test")) === null,
    "an address nobody listed claims nothing — there is no form to grant yourself this",
  );

  const actor = await actorForIdentity(identity);
  check(actor?.type === "platform_user", "a founder resolves to a third kind of actor");
  check(
    actor?.type === "platform_user" && actor.schoolId === null,
    "... belonging to no school, so nothing scopes a query for them",
  );
  check(await platformUserIsActive("plt_smoke"), "and they are active");

  // Decision 9 now spans three tables, not two.
  await refuses(
    () =>
      query(
        `INSERT INTO candidates (email, first_name, last_name, timezone)
         VALUES ('staff.smoke@example.test', 'Same', 'Address', 'UTC')`,
      ),
    "a staff address cannot also be a candidate's",
  );

  // Removing somebody keeps the row and takes the reach.
  await query(`UPDATE platform_users SET deleted_at = now() WHERE id = 'plt_smoke'`);
  check(!(await platformUserIsActive("plt_smoke")), "removing a founder takes their reach away");
  check(
    (await actorForIdentity(identity)) === null,
    "... and they stop resolving to an actor at all",
  );

  await query(`DELETE FROM platform_users WHERE id = 'plt_smoke'`);
}

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
