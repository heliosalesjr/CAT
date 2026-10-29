import "server-only";
import { query, scalar } from "./client.ts";
import type {
  Camelize,
  PlatformClaimedDomainsRow,
  PlatformPendingSchoolUsersRow,
  PlatformPendingSchoolsRow,
  PlatformQueueRow,
} from "./schema.ts";

/**
 * The staff side's reads and writes.
 *
 * Every write goes through a SQL function from 0020, and each of those checks
 * `platform_user_is_active()` before it does anything. So a founder removed
 * from the list this morning cannot verify a school this afternoon, even from
 * a page their browser still has open — the page is not where that is decided.
 *
 * The views all type as nullable because Postgres cannot prove otherwise
 * through a view; these signatures narrow the columns the tables behind them
 * guarantee, which is the same trade `candidates.ts` documents.
 */

export type PendingSchool = Camelize<PlatformPendingSchoolsRow> & {
  schoolId: string;
  name: string;
};
export type PendingSchoolUser = Camelize<PlatformPendingSchoolUsersRow> & {
  schoolUserId: string;
  schoolId: string;
  email: string;
};
export type ClaimedDomain = Camelize<PlatformClaimedDomainsRow> & {
  schoolId: string;
  domain: string;
};

export async function platformQueue(): Promise<Camelize<PlatformQueueRow>> {
  const [row] = await query<PlatformQueueRow>(`SELECT * FROM platform_queue`);
  return row;
}

export async function pendingSchools(): Promise<PendingSchool[]> {
  return (await query<PlatformPendingSchoolsRow>(
    `SELECT * FROM platform_pending_schools ORDER BY created_at`,
  )) as PendingSchool[];
}

export async function pendingSchoolUsers(): Promise<PendingSchoolUser[]> {
  return (await query<PlatformPendingSchoolUsersRow>(
    `SELECT * FROM platform_pending_school_users ORDER BY created_at`,
  )) as PendingSchoolUser[];
}

export async function claimedDomains(): Promise<ClaimedDomain[]> {
  return (await query<PlatformClaimedDomainsRow>(
    `SELECT * FROM platform_claimed_domains ORDER BY created_at`,
  )) as ClaimedDomain[];
}

/* -------------------------------------------------------------- the writes */

export async function verifySchool(
  platformUserId: string,
  schoolId: string,
): Promise<string> {
  return scalar<string>(`SELECT platform_verify_school($1, $2)`, [platformUserId, schoolId]);
}

export async function unverifySchool(
  platformUserId: string,
  schoolId: string,
  reason: string,
): Promise<string> {
  return scalar<string>(`SELECT platform_unverify_school($1, $2, $3)`, [
    platformUserId,
    schoolId,
    reason,
  ]);
}

export async function confirmSchoolUser(
  platformUserId: string,
  schoolUserId: string,
): Promise<string> {
  return scalar<string>(`SELECT platform_confirm_school_user($1, $2)`, [
    platformUserId,
    schoolUserId,
  ]);
}

export async function proveDomain(
  platformUserId: string,
  schoolId: string,
  domain: string,
): Promise<string> {
  return scalar<string>(`SELECT platform_prove_domain($1, $2, $3)`, [
    platformUserId,
    schoolId,
    domain,
  ]);
}
