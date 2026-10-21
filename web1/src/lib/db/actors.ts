import "server-only";
import { maybeOne, query, scalar } from "./client.ts";
import type { ActorForIdentityRow, Permission } from "./schema.ts";

/**
 * Who is making this request, and what may they do.
 *
 * Every answer here comes from a SQL function or view — `actor_for_identity`,
 * `school_user_effective_permissions`, `may_read_document`. None of these
 * rules is re-implemented in TypeScript, and that is the point: decision 8's
 * third layer (an unverified school user resolves to zero permissions) is one
 * condition inside one view, and it only stays true for the whole application
 * while the application never asks the question any other way.
 *
 * The rule of thumb: if a check could ever be wrong in a way that leaks
 * somebody's passport, it belongs in SQL and this file calls it.
 */

export type Actor =
  | { type: "candidate"; id: string; schoolId: null }
  | { type: "school_user"; id: string; schoolId: string };

/**
 * The first thing a request does after reading the session. Returns null for
 * a signed-in identity that has not finished signing up — Auth.js has a
 * `users` row, but no candidate or school user hangs off it yet, and the
 * caller should send them back into the signup flow rather than treat them as
 * a stranger.
 *
 * Decision 9 guarantees at most one row, in the database rather than here.
 */
export async function actorForIdentity(authUserId: string): Promise<Actor | null> {
  const row = await maybeOne<ActorForIdentityRow>(
    `SELECT auth_user_id, actor_type, actor_id, school_id
     FROM   actor_for_identity WHERE auth_user_id = $1`,
    [authUserId],
  );
  if (!row) return null;
  return row.actorType === "candidate"
    ? { type: "candidate", id: row.actorId!, schoolId: null }
    : { type: "school_user", id: row.actorId!, schoolId: row.schoolId! };
}

/** The resolved set, template plus per-person delta, verification included. */
export async function permissionsFor(schoolUserId: string): Promise<Permission[]> {
  const rows = await query<{ permission: Permission }>(
    `SELECT permission FROM school_user_effective_permissions
     WHERE school_user_id = $1 ORDER BY permission`,
    [schoolUserId],
  );
  return rows.map((r) => r.permission);
}

export async function schoolUserHas(
  schoolUserId: string,
  permission: Permission,
): Promise<boolean> {
  return scalar<boolean>(`SELECT school_user_has($1, $2)`, [schoolUserId, permission]);
}

/**
 * The whole document rule: holds view_documents, the candidate applied to
 * their school, that application reached screening. Call this before anything
 * that could produce a signed URL — and remember that logging the access is
 * what actually enforces it, because `document_access_log` refuses to record
 * a read this function would have denied.
 */
export async function mayReadDocument(
  schoolUserId: string,
  documentId: string,
): Promise<boolean> {
  return scalar<boolean>(`SELECT may_read_document($1, $2)`, [schoolUserId, documentId]);
}

/** Decision 6: a founder may read anything, and the log is how that stays honest. */
export async function platformMayReadDocument(
  platformUserId: string,
  documentId: string,
): Promise<boolean> {
  return scalar<boolean>(`SELECT platform_may_read_document($1, $2)`, [
    platformUserId,
    documentId,
  ]);
}
