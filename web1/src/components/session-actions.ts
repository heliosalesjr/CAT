"use server";

import { signOut } from "@/auth";

/**
 * Ends the session and drops you at the start.
 *
 * `/signup` rather than `/` because signing out is almost always the first
 * half of signing in as somebody else — testing the three sides needs three
 * addresses, and this is the loop that gets walked dozens of times a day.
 *
 * A POST, not a link: a GET that destroys a session can be fired by any image
 * tag on any page, and a prefetch would sign people out for reading.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/signup" });
}
