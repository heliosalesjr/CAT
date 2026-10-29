"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { claimPlatformSeat } from "@/lib/db/actors";
import {
  confirmSchoolUser,
  proveDomain,
  unverifySchool,
  verifySchool,
} from "@/lib/db/platform";
import { currentActor, currentIdentity } from "@/lib/session";

/**
 * Claims a staff seat for the address already signed in.
 *
 * The seat normally binds in the `events.signIn` hook, which is right for the
 * common case: somebody is added to the allowlist and then signs in. It is
 * wrong for the other order — added WHILE signed in — and that order is the
 * usual one for the founders, who add each other. Without this they have to
 * sign out and back in, having read a sentence telling them to, which is a
 * poor first impression of the admin side.
 *
 * A POST and a button rather than a side effect inside the page's render: a
 * GET that writes is a smell even when the write is idempotent, and a
 * prefetch should never bind anything.
 */
export async function claimSeat(): Promise<{ error: string } | null> {
  const identity = await currentIdentity();
  if (!identity?.email) return { error: "You are signed out. Sign in and try again." };

  if (await currentActor()) redirect("/admin");

  const claimed = await claimPlatformSeat(identity.id, identity.email);
  if (!claimed) {
    return {
      error:
        `${identity.email} is not on the staff list, or its seat is already ` +
        `bound to another identity. Add it from the command line and try again.`,
    };
  }

  redirect("/admin");
}

/* ------------------------------------------------------- the queue actions */

export type ActionResult = { ok: string } | { error: string } | null;

/**
 * Every action here resolves the actor first and refuses anything that is not
 * active platform staff. That check is also inside each SQL function, and the
 * duplication is deliberate: this one produces a sentence for a person, and
 * the one in the database is the one that cannot be gone around.
 */
async function asStaff(): Promise<{ id: string } | { error: string }> {
  const actor = await currentActor();
  if (!actor) return { error: "You are signed out. Sign in and try again." };
  if (actor.type !== "platform_user") {
    return { error: "Only platform staff can do this." };
  }
  return { id: actor.id };
}

function failed(err: unknown): ActionResult {
  const message = err instanceof Error ? err.message : "That did not work.";
  // The SQL functions raise messages written to be read — "school X is already
  // verified", "no unproved domain Y claimed by school Z".
  return { error: message.replace(/^[a-z_]+\([^)]*\):\s*/, "") };
}

export async function verifySchoolAction(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const staff = await asStaff();
  if ("error" in staff) return staff;

  const schoolId = String(form.get("schoolId") ?? "");
  const name = String(form.get("schoolName") ?? schoolId);
  try {
    await verifySchool(staff.id, schoolId);
  } catch (err) {
    return failed(err);
  }
  revalidatePath("/admin");
  return { ok: `${name} is verified. Its postings can go live.` };
}

export async function unverifySchoolAction(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const staff = await asStaff();
  if ("error" in staff) return staff;

  const schoolId = String(form.get("schoolId") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  if (!reason) return { error: "Say why — it goes in the audit log." };
  try {
    await unverifySchool(staff.id, schoolId, reason);
  } catch (err) {
    return failed(err);
  }
  revalidatePath("/admin");
  return { ok: "Sent back to pending." };
}

export async function confirmSchoolUserAction(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const staff = await asStaff();
  if ("error" in staff) return staff;

  const schoolUserId = String(form.get("schoolUserId") ?? "");
  const who = String(form.get("who") ?? "this person");
  try {
    await confirmSchoolUser(staff.id, schoolUserId);
  } catch (err) {
    return failed(err);
  }
  revalidatePath("/admin");
  return { ok: `${who} is confirmed, and their role now grants what it says.` };
}

export async function proveDomainAction(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const staff = await asStaff();
  if ("error" in staff) return staff;

  const schoolId = String(form.get("schoolId") ?? "");
  const domain = String(form.get("domain") ?? "");
  try {
    await proveDomain(staff.id, schoolId, domain);
  } catch (err) {
    return failed(err);
  }
  revalidatePath("/admin");
  return {
    ok: `${domain} is proved. Anyone with an address on it now joins that school without us.`,
  };
}
