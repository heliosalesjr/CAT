import "server-only";
import pg from "pg";
import type { Camelize } from "./schema.ts";

/**
 * The only place the application opens a connection.
 *
 * No ORM and no query builder — CLAUDE.md rules those out and the reasoning
 * holds: plain SQL is what keeps Neon today and Cloud SQL later a dump and a
 * restore. What this module adds is the two things plain `pg` gets wrong on
 * its own: honest types for three Postgres types, and snake_case rows arriving
 * as camelCase objects.
 */

/* ------------------------------------------------------------------ types */

/**
 * These three parsers and `db/types.mjs` have to agree. Change one and the
 * generated types start lying about what comes back.
 *
 * DATE (1082). A date with no time is a calendar date. node-postgres hands
 * back a `Date` at LOCAL midnight, so `available_from` of 2027-08-01 becomes
 * July 31st on a server west of UTC — a bug that only appears in deployment.
 * Kept as the 'YYYY-MM-DD' string Postgres sent.
 *
 * NUMERIC (1700). Parsed to a number because every numeric in this schema is
 * a small display value: a 0-5 rating, a day count with one decimal. Money is
 * `int` USD and never numeric. If a numeric money column is ever added, delete
 * this parser first — binary floating point is not a currency.
 *
 * INT8 (20) is deliberately NOT parsed. bigserial ids exceed what a JS number
 * holds exactly, nothing does arithmetic on them, and a string id is harmless.
 */
pg.types.setTypeParser(1082, (v: string) => v);
pg.types.setTypeParser(1700, (v: string) => Number(v));

/* ------------------------------------------------------------------- pool */

const url = process.env.DATABASE_URL;

/**
 * Constructing a Pool opens nothing — node-postgres connects on the first
 * query — and that is what makes this safe to do at module load.
 *
 * It must stay that way. `next build` collects page data for the Auth.js route
 * handler, which imports this module, so anything that throws here fails the
 * build. A build has no business holding a database credential: it runs in CI
 * and in Cloud Run's source deploy, where `DATABASE_URL` is correctly absent.
 * A missing URL is therefore a runtime error, raised by the first query, with
 * a message that says what to do.
 */
function makePool(): pg.Pool {
  return new pg.Pool({
    connectionString: url,
    // Same rule as db/migrate.mjs and db/seed.mjs, so there is one answer to
    // "does this connection use TLS" across the whole project.
    ssl: !url || url.includes("localhost") ? undefined : { rejectUnauthorized: true },
    // Cloud Run scales to zero and runs many instances, so each one keeps a
    // small pool and lets Neon's pooler do the concentrating. A large max here
    // multiplies by instance count and exhausts the free tier's connections.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
}

// `next dev` re-evaluates modules on every edit; without this each reload
// would leak a pool and the connection limit would be reached by lunchtime.
const globalForDb = globalThis as unknown as { __catPool?: pg.Pool };
export const pool: pg.Pool = globalForDb.__catPool ?? makePool();
if (process.env.NODE_ENV !== "production") globalForDb.__catPool = pool;

/* --------------------------------------------------------------- querying */

type Row = Record<string, unknown>;

/** Called by everything that actually talks to the database. */
function assertConfigured(): void {
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. The app reads the database directly; " +
        "point it at a Neon branch (use the -pooler host) and restart.",
    );
  }
}

const camelKey = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/**
 * Top-level keys only, and that restriction is load-bearing: `criterion_scores`
 * and `criterion_notes` are jsonb objects keyed by criterion id, and
 * `safeguarding_references` is one of those ids. Walking into them would
 * rename the data.
 */
function camelize<R extends Row>(row: R): Camelize<R> {
  const out: Row = {};
  for (const k in row) out[camelKey(k)] = row[k];
  return out as Camelize<R>;
}

export async function query<R extends Row>(
  text: string,
  params: readonly unknown[] = [],
): Promise<Camelize<R>[]> {
  assertConfigured();
  const result = await pool.query<R>(text, params as unknown[]);
  return result.rows.map(camelize);
}

/** Exactly one row, or an error naming the query. Use for lookups by id. */
export async function one<R extends Row>(
  text: string,
  params: readonly unknown[] = [],
): Promise<Camelize<R>> {
  const rows = await query<R>(text, params);
  if (rows.length !== 1) {
    throw new Error(`expected exactly 1 row, got ${rows.length}: ${text.trim().slice(0, 120)}`);
  }
  return rows[0];
}

/** One row or null. Use where absence is a normal answer. */
export async function maybeOne<R extends Row>(
  text: string,
  params: readonly unknown[] = [],
): Promise<Camelize<R> | null> {
  const rows = await query<R>(text, params);
  if (rows.length > 1) {
    throw new Error(`expected at most 1 row, got ${rows.length}: ${text.trim().slice(0, 120)}`);
  }
  return rows[0] ?? null;
}

/** A single scalar — `SELECT school_user_has($1, $2)` and friends. */
export async function scalar<T>(text: string, params: readonly unknown[] = []): Promise<T> {
  assertConfigured();
  const result = await pool.query(text, params as unknown[]);
  if (result.rows.length !== 1) {
    throw new Error(`expected exactly 1 row, got ${result.rows.length}`);
  }
  return Object.values(result.rows[0])[0] as T;
}

/**
 * Everything inside runs on one connection, in one transaction. Anything that
 * writes more than a single row belongs in here — not because the rows need
 * to arrive together, but because the triggers in 0016 and 0018 fire inside it
 * and a half-applied signup leaves a school user nobody verified.
 */
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  assertConfigured();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Inside a `tx`, where the caller holds the client. */
export async function txQuery<R extends Row>(
  client: pg.PoolClient,
  text: string,
  params: readonly unknown[] = [],
): Promise<Camelize<R>[]> {
  const result = await client.query<R>(text, params as unknown[]);
  return result.rows.map(camelize);
}
