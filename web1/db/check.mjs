#!/usr/bin/env node
/**
 * Runs db/checks.sql against a seeded database and rolls it back.
 *
 * The migrations say what the schema enforces; this says whether it does. It
 * needs nothing the project does not already depend on — `pg`, one
 * transaction, and the NOTICEs the assertions raise.
 *
 *   DATABASE_URL=postgres://... node db/check.mjs
 *
 * A failed assertion aborts the transaction, so the first FAIL is the only one
 * reported. That is deliberate: these are invariants, not a test matrix, and
 * one broken invariant makes everything after it meaningless.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HERE = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(HERE, 'checks.sql'), 'utf8');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Export a SCRATCH connection string and retry.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: true },
});

let passed = 0;
client.on('notice', (n) => {
  const m = (n.message ?? '').trim();
  if (!m.startsWith('ok')) return;
  passed++;
  console.log(`  ${m}`);
});

await client.connect();
console.log('Checks (every write is rolled back)\n');

try {
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('ROLLBACK');
  console.log(`\n${passed} check(s) passed. Nothing was kept.`);
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(`\n${err.message.replace(/^FAIL\s+/, 'FAILED: ')}`);
  if (err.hint) console.error(`  ${err.hint}`);
  console.error(`\n${passed} check(s) passed before this one. Nothing was kept.`);
  await client.end();
  process.exit(1);
}

await client.end();
