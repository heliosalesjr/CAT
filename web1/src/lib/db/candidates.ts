import "server-only";
import { maybeOne, query, scalar, tx, txQuery } from "./client.ts";
import type {
  Camelize,
  CandidatesRow,
  DocumentStatus,
  DocumentType,
  DocumentsWithExpiryRow,
  ReferenceRelationship,
  ReferenceStatus,
  ReferencesWithWaitingRow,
  PracticeKind,
  PracticeOptionsRow,
  RoleFamily,
} from "./schema.ts";

/** The row as the app sees it: camelCase, and nothing renamed by hand. */
export type Candidate = Camelize<CandidatesRow>;

/* The three types below exist because of one quirk of introspection: a VIEW
   reports every column nullable, since Postgres cannot prove otherwise through
   it. These say what the columns behind the views actually guarantee. */

export type PracticeOption = { id: string; kind: PracticeKind; label: string };

export type CandidateDocument = Omit<Camelize<DocumentsWithExpiryRow>, "id" | "type" | "status">
  & { id: string; type: DocumentType; status: DocumentStatus };

export type CandidateReference =
  Omit<Camelize<ReferencesWithWaitingRow>, "id" | "refereeName" | "relationship" | "status">
  & { id: string; refereeName: string; relationship: ReferenceRelationship; status: ReferenceStatus };

export async function candidateById(id: string): Promise<Candidate | null> {
  return maybeOne<CandidatesRow>(
    `SELECT * FROM candidates WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
}

export async function candidateByIdentity(authUserId: string): Promise<Candidate | null> {
  return maybeOne<CandidatesRow>(
    `SELECT * FROM candidates WHERE auth_user_id = $1 AND deleted_at IS NULL`,
    [authUserId],
  );
}

/* --------------------------------------------------------- what they want */

export async function roleFamiliesFor(candidateId: string): Promise<RoleFamily[]> {
  const rows = await query<{ role_family: RoleFamily }>(
    `SELECT role_family FROM candidate_role_families
     WHERE candidate_id = $1 ORDER BY role_family`,
    [candidateId],
  );
  return rows.map((r) => r.roleFamily);
}

/**
 * Decision 3 lets a candidate want more than one kind of post, so the form
 * sends the whole set and this replaces it. Inside a transaction because the
 * delete and the insert together move `profile_completeness` — the trigger in
 * 0018 fires on each, and a half-applied change would show a wrong number.
 */
export async function setRoleFamilies(
  candidateId: string,
  families: readonly RoleFamily[],
): Promise<void> {
  await tx(async (c) => {
    await c.query(`DELETE FROM candidate_role_families WHERE candidate_id = $1`, [candidateId]);
    if (families.length) {
      await c.query(
        `INSERT INTO candidate_role_families (candidate_id, role_family)
         SELECT $1, unnest($2::role_family[])`,
        [candidateId, families],
      );
    }
  });
}

/* ----------------------------------------------------------- the form patch */

/**
 * What a candidate may change about themselves, as an explicit allow-list.
 *
 * It is a list and not "every column" on purpose. `profile_completeness` is
 * written by a trigger, the document and reference counters are written by
 * other triggers, `auth_user_id` is identity and `premium_member` is billing.
 * A patch naming any of them is a bug or an attack, and either way the answer
 * is the same: it is not in this array, so it never reaches the SQL.
 */
const EDITABLE = [
  "first_name", "last_name", "headline", "avatar_url", "intro_video_url", "linkedin_url",
  "current_school", "current_city", "current_country", "timezone",
  "nationality", "nationalities", "languages",
  "subjects", "specialisms", "grade_levels", "curriculum_experience",
  "regions_worked", "preferred_regions",
  "highest_degree", "degree_field",
  "years_experience", "years_in_subject", "leadership_years",
  "first_time_international", "coaching_capable", "coaching_activities",
  "dependents", "partner_candidate_id", "available_from",
  "salary_expectation_min_usd", "salary_expectation_max_usd",
  "profile_visibility", "email",
] as const;

type EditableColumn = (typeof EDITABLE)[number];

/** camelCase in, snake_case out — the same mapping the client does on the way back. */
export type CandidatePatch = Partial<
  Pick<Candidate, Extract<keyof Candidate, SnakeKeysToCamel<EditableColumn>>>
>;

type SnakeKeysToCamel<S extends string> = S extends `${infer H}_${infer T}`
  ? `${H}${Capitalize<SnakeKeysToCamel<T>>}`
  : S;

const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/**
 * Saves one step of the multi-page form. Only the keys present are touched,
 * so step 2 cannot blank out what step 1 collected — which matters because
 * the row is created half-empty by design and filled across three or four
 * screens.
 *
 * Returns the row as the database left it, completeness recomputed, so the
 * screen shows the number the ranking will use rather than its own guess.
 */
export async function updateCandidate(
  id: string,
  patch: CandidatePatch,
): Promise<Candidate> {
  const allowed = new Set<string>(EDITABLE);
  const sets: string[] = [];
  const params: unknown[] = [id];

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const column = snake(key);
    if (!allowed.has(column)) {
      throw new Error(`candidate field is not editable: ${key}`);
    }
    params.push(value);
    // The column name is never interpolated from input — it came out of
    // EDITABLE, which is a literal in this file.
    sets.push(`${column} = $${params.length}`);
  }

  if (!sets.length) {
    const current = await candidateById(id);
    if (!current) throw new Error(`no such candidate: ${id}`);
    return current;
  }

  const rows = await query<CandidatesRow>(
    `UPDATE candidates SET ${sets.join(", ")}
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    params,
  );
  if (rows.length !== 1) throw new Error(`no such candidate: ${id}`);
  return rows[0];
}

/**
 * Creates the row that step one of signup produces. Everything else is
 * nullable by design, so a profile exists from the first screen and the
 * candidate can come back to it.
 */
export async function createCandidate(input: {
  authUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
}): Promise<Candidate> {
  return tx(async (c) => {
    const rows = await txQuery<CandidatesRow>(
      c,
      `INSERT INTO candidates (auth_user_id, email, first_name, last_name, timezone)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [input.authUserId, input.email, input.firstName, input.lastName, input.timezone],
    );
    return rows[0];
  });
}

/* ------------------------------------------------------------ completeness */

export type CompletenessLine = {
  field: string;
  weight: number;
  present: boolean;
  readsInto: string;
};

/**
 * Rule 6's number, itemised. The form reads this rather than counting its own
 * fields, so "a photograph is the gap" is the same arithmetic the ranking
 * uses — they cannot disagree, because there is only one of them.
 */
export async function completenessBreakdown(
  candidateId: string,
): Promise<CompletenessLine[]> {
  const rows = await query<{
    field: string;
    weight: number;
    present: boolean;
    reads_into: string;
  }>(
    `SELECT field, weight, present, reads_into
     FROM   candidate_completeness_breakdown($1)
     ORDER  BY present, weight DESC`,
    [candidateId],
  );
  return rows;
}

/** Whether rule 6 lets this profile be ranked at all, threshold and all. */
export async function isRankable(candidateId: string): Promise<boolean> {
  return scalar<boolean>(`SELECT candidate_is_rankable($1)`, [candidateId]);
}

/** Separate from completeness on purpose — decision 11. Paperwork, 0-100. */
export async function readiness(candidateId: string): Promise<number> {
  return scalar<number>(`SELECT candidate_readiness($1)`, [candidateId]);
}

/* ---------------------------------------------------------------- the picker */

/**
 * What the tags input offers. Reading it from the catalog is what stops
 * "Maths" and "Mathematics" both existing — the trigger in 0017 refuses the
 * write, but a picker that only ever offers catalogued values means nobody
 * meets that error in the first place.
 */
/**
 * What the tags input offers. Reading it from the catalog is what stops
 * "Maths" and "Mathematics" both existing — the trigger in 0017 refuses the
 * write, but a picker that only ever offers catalogued values means nobody
 * meets that error in the first place.
 *
 * The return type is written out rather than taken from the generated row.
 * Postgres reports every column of a VIEW as nullable because it cannot prove
 * otherwise through one, so `PracticeOptionsRow` has `id: string | null` while
 * the column behind it is a primary key. Narrowing it here, once, with the
 * reason stated, beats a `?? ""` at every call site.
 */
export async function practiceOptions(kind?: PracticeKind): Promise<PracticeOption[]> {
  const rows = kind
    ? await query<PracticeOptionsRow>(`SELECT * FROM practice_options WHERE kind = $1`, [kind])
    : await query<PracticeOptionsRow>(`SELECT * FROM practice_options`);
  return rows as PracticeOption[];
}

/* --------------------------------------------------------- the two panels */

/**
 * Read through the views, not the tables: `daysUntilExpiry` and `daysWaiting`
 * were stored values in the bundle, computed on its generation date and wrong
 * on every other day, so 0007 and 0008 made them derived.
 */
export async function documentsFor(candidateId: string): Promise<CandidateDocument[]> {
  return (await query<DocumentsWithExpiryRow>(
    `SELECT * FROM documents_with_expiry
     WHERE candidate_id = $1 AND deleted_at IS NULL
     ORDER BY type`,
    [candidateId],
  )) as CandidateDocument[];
}

export async function referencesFor(candidateId: string): Promise<CandidateReference[]> {
  return (await query<ReferencesWithWaitingRow>(
    `SELECT * FROM references_with_waiting
     WHERE candidate_id = $1
     ORDER BY requested_at`,
    [candidateId],
  )) as CandidateReference[];
}
