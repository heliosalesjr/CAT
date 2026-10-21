"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { currentIdentity } from "@/lib/session";
import { searchSchools } from "@/lib/db/schools";
import {
  InvalidSignup,
  finishCandidateSignup,
  finishSchoolJoin,
  finishSchoolRegistration,
  type Problem,
} from "@/lib/signup";

/**
 * The form transport, and nothing else. Every rule lives in `lib/signup.ts`,
 * which is why it can be tested without driving a browser.
 *
 * One thing is load-bearing in all of these: the identity and the email come
 * from the SESSION, never from the submitted form. A form field saying which
 * account to attach a profile to would let anybody attach a profile to
 * somebody else's identity — and the email is what proved the school
 * affiliation, so taking it from a field would hand out verification to
 * whoever typed the right domain.
 */

export type FormState = { problems: Problem[] } | { error: string } | null;

const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
};

function asProblems(err: unknown): FormState {
  if (err instanceof InvalidSignup) return { problems: err.problems };
  // Database-level refusals land here: a duplicate email, an identity that
  // already acts for a school, a subject outside the catalog. The message is
  // written to be read by a person, so it is shown rather than swallowed.
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return { error: message.replace(/^[a-z_]+\([^)]*\):\s*/, "") };
}

/* --------------------------------------------------- step one: the email */

export async function startSignup(_prev: FormState, form: FormData): Promise<FormState> {
  const side = field(form, "as") === "school" ? "school" : "candidate";
  const email = field(form, "email").trim();

  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
    return { problems: [{ field: "email", message: "does not look like an email address" }] };
  }
  if (side === "school" && email.length > 320) {
    return { problems: [{ field: "email", message: "is too long" }] };
  }

  // Sending the link IS the signup. Nothing about this person is stored until
  // they prove the address, so an address typed by mistake leaves no trace.
  await signIn("magic-link", { email, redirectTo: `/signup/finish?as=${side}` });
  return null;
}

/* ------------------------------------------------ step two: who you are */

export async function completeCandidate(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await currentIdentity();
  if (!identity?.email) return { error: "Your sign-in link has expired. Start again." };

  try {
    await finishCandidateSignup({
      authUserId: identity.id,
      email: identity.email,
      firstName: field(form, "firstName"),
      lastName: field(form, "lastName"),
      timezone: field(form, "timezone"),
      roleFamilies: form.getAll("roleFamilies").filter((v) => typeof v === "string"),
    });
  } catch (err) {
    return asProblems(err);
  }
  redirect("/signup/done");
}

export async function completeSchoolJoin(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await currentIdentity();
  if (!identity?.email) return { error: "Your sign-in link has expired. Start again." };

  try {
    await finishSchoolJoin({
      authUserId: identity.id,
      email: identity.email,
      schoolId: field(form, "schoolId"),
      firstName: field(form, "firstName"),
      lastName: field(form, "lastName"),
      title: field(form, "title"),
      requestedRole: field(form, "requestedRole"),
    });
  } catch (err) {
    return asProblems(err);
  }
  redirect("/signup/done");
}

export async function completeSchoolRegistration(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const identity = await currentIdentity();
  if (!identity?.email) return { error: "Your sign-in link has expired. Start again." };

  try {
    await finishSchoolRegistration({
      authUserId: identity.id,
      email: identity.email,
      schoolName: field(form, "schoolName"),
      country: field(form, "country"),
      city: field(form, "city"),
      timezone: field(form, "timezone"),
      phone: field(form, "phone"),
      addressLine: field(form, "addressLine"),
      postalCode: field(form, "postalCode"),
      website: field(form, "website"),
      firstName: field(form, "firstName"),
      lastName: field(form, "lastName"),
      title: field(form, "title"),
    });
  } catch (err) {
    return asProblems(err);
  }
  redirect("/signup/done");
}

/* ------------------------------------------- the "I can't find it" search */

/**
 * Only for somebody who is already signed in. Schools are not secret, but an
 * open endpoint that lists them by substring is a directory export, and this
 * one exists to help a person find their own employer.
 */
export async function findSchools(term: string) {
  const identity = await currentIdentity();
  if (!identity) return [];
  const t = term.trim();
  if (t.length < 2) return [];
  return searchSchools(t, 15);
}
