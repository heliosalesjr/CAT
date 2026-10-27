"use server";

import { redirect } from "next/navigation";
import { claimPlatformSeat } from "@/lib/db/actors";
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
