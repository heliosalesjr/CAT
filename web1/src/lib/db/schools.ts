import "server-only";
import { query, scalar, tx, txQuery } from "./client.ts";
import { mintToken, hashToken } from "./tokens.ts";
import type { Camelize, SchoolUserRole, SchoolUsersRow, SchoolsRow } from "./schema.ts";

export type School = Camelize<SchoolsRow>;
export type SchoolUser = Camelize<SchoolUsersRow>;

/**
 * School signup, in the order the form asks.
 *
 * Step one is the work email, and the email picks the school — decision 8.
 * That inversion is what lets the common case finish with nobody in the loop:
 * a magic link proves the address, the address's domain proves the school.
 *
 * Nothing in this file decides whether somebody is verified. It asks
 * `email_proves_affiliation()`, because an unverified school user resolving to
 * zero permissions is only safe while the database owns the question.
 */

export type SchoolMatch = {
  schoolId: string;
  schoolName: string;
  verificationStatus: string;
};

/**
 * Zero matches means the person searches by name or registers a school. One
 * means the form preselects it. Several means a group running campuses off
 * one domain, and the person picks theirs.
 *
 * A public provider always returns nothing: `public_email_domains` exists so
 * that attaching gmail.com to a school cannot verify every Gmail user into it.
 */
export async function schoolsForEmail(email: string): Promise<SchoolMatch[]> {
  return query<{ school_id: string; school_name: string; verification_status: string }>(
    `SELECT school_id, school_name, verification_status FROM schools_for_email($1)`,
    [email],
  );
}

export async function emailProvesAffiliation(
  email: string,
  schoolId: string,
): Promise<boolean> {
  return scalar<boolean>(`SELECT email_proves_affiliation($1, $2)`, [email, schoolId]);
}

export async function isPublicEmailDomain(email: string): Promise<boolean> {
  return scalar<boolean>(`SELECT is_public_email_domain($1)`, [email]);
}

/** The "I can't find my school" fallback: type part of the name. */
export async function searchSchools(term: string, limit = 20): Promise<SchoolMatch[]> {
  return query<{ school_id: string; school_name: string; verification_status: string }>(
    `SELECT id AS school_id, name AS school_name, verification_status
     FROM   schools
     WHERE  deleted_at IS NULL AND name ILIKE '%' || $1 || '%'
     ORDER  BY name
     LIMIT  $2`,
    [term, limit],
  );
}

/* ------------------------------------------------------------- joining one */

/**
 * The person's school was already in the list. Whether they end up verified
 * is not this function's opinion: if the work email's domain is a verified
 * domain of that school they are in, and if it is not they are pending and
 * resolve to no permissions until somebody confirms them.
 */
export async function joinSchool(input: {
  authUserId: string;
  email: string;
  schoolId: string;
  role: SchoolUserRole;
  firstName?: string;
  lastName?: string;
  title?: string;
}): Promise<{ user: SchoolUser; verified: boolean }> {
  return tx(async (c) => {
    const proved = (
      await txQuery<{ ok: boolean }>(c, `SELECT email_proves_affiliation($1, $2) AS ok`, [
        input.email,
        input.schoolId,
      ])
    )[0].ok;

    const rows = await txQuery<SchoolUsersRow>(
      c,
      `INSERT INTO school_users
         (school_id, role, first_name, last_name, email, title, auth_user_id,
          verified_at, verification_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               CASE WHEN $8 THEN now() END,
               CASE WHEN $8 THEN 'email_domain' END)
       RETURNING *`,
      [
        input.schoolId,
        input.role,
        input.firstName ?? null,
        input.lastName ?? null,
        input.email,
        input.title ?? null,
        input.authUserId,
        proved,
      ],
    );
    return { user: rows[0], verified: proved };
  });
}

/* ---------------------------------------------------- registering a new one */

/**
 * Nobody had registered this school yet. The form collects phone and address
 * because a human confirms them, and the school starts `pending`: its domain
 * is recorded as a CLAIM (`verified_at` null), so until somebody at the
 * platform verifies it, this address proves nothing and nobody else can use
 * the domain to walk in behind them.
 */
export async function registerSchool(input: {
  authUserId: string;
  email: string;
  schoolName: string;
  country: string;
  city?: string;
  timezone: string;
  phone: string;
  addressLine: string;
  postalCode?: string;
  website?: string;
  role?: SchoolUserRole;
  firstName?: string;
  lastName?: string;
  title?: string;
}): Promise<{ school: School; user: SchoolUser }> {
  if (await isPublicEmailDomain(input.email)) {
    throw new Error(
      "a school cannot be registered from a personal email address — use your work address",
    );
  }

  return tx(async (c) => {
    const school = (
      await txQuery<SchoolsRow>(
        c,
        `INSERT INTO schools
           (name, city, country, timezone, website, phone, address_line, postal_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          input.schoolName,
          input.city ?? null,
          input.country,
          input.timezone,
          input.website ?? null,
          input.phone,
          input.addressLine,
          input.postalCode ?? null,
        ],
      )
    )[0];

    // A claim, not proof: verified_at stays null until a human says otherwise.
    await c.query(
      `INSERT INTO school_email_domains (school_id, domain) VALUES ($1, email_domain($2))`,
      [school.id, input.email],
    );

    const user = (
      await txQuery<SchoolUsersRow>(
        c,
        `INSERT INTO school_users
           (school_id, role, first_name, last_name, email, title, auth_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          school.id,
          input.role ?? "hr",
          input.firstName ?? null,
          input.lastName ?? null,
          input.email,
          input.title ?? null,
          input.authUserId,
        ],
      )
    )[0];

    return { school, user };
  });
}

/* ----------------------------------------------------------------- invites */

/**
 * Layer 2 of decision 8: once somebody at a school is verified, they bring in
 * their colleagues directly. Who may do that is `manage_users`, checked inside
 * `school_invite_issue()` and not here — an unverified user resolves to no
 * permissions, so they cannot invite their way around the gate.
 *
 * Returns the plaintext token exactly once. Put it in the email and let it go.
 */
export async function inviteColleague(input: {
  schoolId: string;
  email: string;
  role: SchoolUserRole;
  invitedById: string;
}): Promise<{ inviteId: string; token: string }> {
  const { token, sha256 } = mintToken();
  const inviteId = await scalar<string>(
    `SELECT school_invite_issue($1, $2, $3, $4, $5)::text`,
    [input.schoolId, input.email, input.role, input.invitedById, sha256],
  );
  return { inviteId, token };
}

/**
 * The colleague clicked the link. They arrive already verified, because a
 * verified colleague vouched — and the invite is single-use, so the link in
 * a forwarded email is worth nothing.
 */
export async function acceptInvite(input: {
  token: string;
  authUserId: string;
  firstName?: string;
  lastName?: string;
  title?: string;
}): Promise<string> {
  return scalar<string>(`SELECT school_invite_accept($1, $2, $3, $4, $5)`, [
    hashToken(input.token),
    input.authUserId,
    input.firstName ?? null,
    input.lastName ?? null,
    input.title ?? null,
  ]);
}
