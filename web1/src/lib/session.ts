import "server-only";
import { auth } from "@/auth";
import { actorForIdentity, type Actor } from "./db/actors.ts";

/**
 * Who is making this request — the two questions a page actually asks.
 *
 * The actor is resolved per request rather than stashed in the session on
 * sign-in. A session row outlives a lot: a school user gets verified, a
 * permission is granted or revoked, somebody finishes signing up. Any of
 * those would leave a cached actor describing a person who no longer exists
 * in that shape, and the one that matters is verification, because a stale
 * copy of it is a permission the database has already taken away.
 */

export type Identity = { id: string; email: string | null };

export async function currentIdentity(): Promise<Identity | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;
  return { id: user.id, email: user.email ?? null };
}

/**
 * Null has two meanings and the caller has to tell them apart: nobody is
 * signed in, or somebody is signed in and has not finished signing up —
 * Auth.js has a `users` row for them and no candidate or school user hangs
 * off it yet. `currentIdentity()` separates the two.
 */
export async function currentActor(): Promise<Actor | null> {
  const identity = await currentIdentity();
  if (!identity) return null;
  return actorForIdentity(identity.id);
}

export async function requireActor(): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) throw new Error("not signed in, or signup is not finished");
  return actor;
}
