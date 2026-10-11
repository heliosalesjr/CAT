#!/usr/bin/env node
/**
 * Applies db/migrations/*.sql in filename order, once each.
 *
 * Plain SQL and a 60-line runner rather than a migration framework: the point
 * of the stack choice is that Neon today and Cloud SQL later is a dump and a
 * restore, and that stays true only while nothing but Postgres is required to
 * read these files.
 *
 *   DATABASE_URL=postgres://... node db/migrate.mjs [--dry-run]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
const dryRun = process.argv.includes('--dry-run');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Export your Neon connection string and retry.');
  process.exit(1);
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const client = new pg.Client({
  connectionString: url,
  ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: true },
});
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    text PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now()
  )`);

const { rows } = await client.query('SELECT filename FROM schema_migrations');
const done = new Set(rows.map((r) => r.filename));
const pending = files.filter((f) => !done.has(f));

if (!pending.length) {
  console.log(`Up to date — ${files.length} migration(s) already applied.`);
  await client.end();
  process.exit(0);
}

console.log(`${pending.length} pending migration(s):`);
for (const f of pending) console.log(`  ${f}`);
if (dryRun) { console.log('\n--dry-run: nothing applied.'); await client.end(); process.exit(0); }

for (const f of pending) {
  const sql = readFileSync(join(DIR, f), 'utf8');
  process.stdout.write(`\napplying ${f} ... `);
  try {
    // Each file carries its own BEGIN/COMMIT, so a failure rolls that file
    // back on its own and leaves schema_migrations untouched.
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [f]);
    console.log('ok');
  } catch (err) {
    console.log('FAILED');
    console.error(`\n${err.message}`);
    if (err.position) {
      const upto = sql.slice(0, Number(err.position));
      console.error(`  at line ${upto.split('\n').length}`);
    }
    await client.end();
    process.exit(1);
  }
}

console.log('\nDone.');
await client.end();
