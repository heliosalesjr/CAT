#!/usr/bin/env node
/**
 * Where am I, and what should I run next.
 *
 *   DATABASE_URL=postgres://... npm run db:doctor
 *
 * Written for the first ten minutes against a new Neon branch, which is where
 * a connection string is most likely to be subtly wrong: the pooled host used
 * for migrations, a database name that is not the one the branch made, a
 * password pasted with a line break in it. Each of those fails with a message
 * about sockets or authentication that says nothing about the actual mistake.
 *
 * It reads and counts. It never writes.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { readEnvLocal } from './env.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();

const say = (label, value) => console.log(`  ${label.padEnd(26)} ${value}`);
const next = [];

const envFile = readEnvLocal();
const url = process.env.DATABASE_URL || envFile?.DATABASE_URL_DIRECT || envFile?.DATABASE_URL;
const secret = process.env.AUTH_SECRET || envFile?.AUTH_SECRET;

console.log('');
console.log('Configuration');
say('web1/.env.local', Object.keys(envFile).length ? `${Object.keys(envFile).length} value(s)` : 'not there');
say('DATABASE_URL', process.env.DATABASE_URL ? 'from the shell'
    : envFile.DATABASE_URL_DIRECT ? 'from .env.local (direct)'
    : envFile.DATABASE_URL ? 'from .env.local (pooled)' : 'MISSING');
say('AUTH_SECRET', secret ? 'set' : 'MISSING — Auth.js answers 500 without it');

if (!Object.keys(envFile).length) {
  next.push('Create web1/.env.local with DATABASE_URL and AUTH_SECRET.');
}
if (!secret) {
  next.push("Add to web1/.env.local:  AUTH_SECRET='<openssl rand -base64 32>'");
}

if (!url) {
  console.log('');
  console.error('No DATABASE_URL, in the shell or in web1/.env.local.\n');
  console.error('Paste the POOLED Neon string into web1/.env.local:');
  console.error("  DATABASE_URL='postgres://...-pooler.../neondb?sslmode=verify-full'\n");
  if (next.length) {
    console.log('Next');
    for (const n of next) console.log(`  → ${n}`);
    console.log('');
  }
  process.exit(1);
}

/* ------------------------------------------------- what the URL itself says */

let host = '(unparseable)';
let database = '(unparseable)';
let pooled = false;
try {
  const u = new URL(url);
  host = u.hostname;
  database = u.pathname.replace(/^\//, '') || '(none)';
  pooled = /-pooler\./.test(host);
  if (/\s/.test(url)) {
    console.log('  ! The connection string contains whitespace — a line break in a');
    console.log('    pasted password is the usual cause, and it fails as a bad password.');
  }
  // Neon hands out `sslmode=require`, and node-postgres warns that a future
  // major will read that the way libpq does: encrypted, certificate NOT
  // verified. This project passes an explicit `ssl: { rejectUnauthorized }`
  // that wins today, but a string saying `require` is one dependency bump away
  // from meaning something weaker than it looks.
  const mode = u.searchParams.get('sslmode');
  if (mode && mode !== 'verify-full' && !/localhost/.test(host)) {
    console.log(`  ! sslmode=${mode} — change it to verify-full. Today it still verifies the`);
    console.log('    certificate; after the next pg major, this spelling would not.');
  }
} catch {
  console.error(`DATABASE_URL does not parse as a URL: ${url.slice(0, 40)}…`);
  process.exit(1);
}

console.log('Connection');
say('host', host);
say('database', database);
say('endpoint', pooled ? 'pooled (-pooler)' : 'direct');

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: true },
  connectionTimeoutMillis: 10_000,
});

try {
  await client.connect();
} catch (err) {
  console.log('');
  console.error(`Could not connect: ${err.message}\n`);
  if (/password|authentication/i.test(err.message)) {
    console.error('  Re-copy the string from the Neon console rather than retyping it.');
  } else if (/timeout|ENOTFOUND|EAI_AGAIN/i.test(err.message)) {
    console.error('  The host did not answer. Check the branch is not suspended and that');
    console.error('  the hostname is complete — Neon strings are long and easy to clip.');
  } else if (/certificate|self.signed/i.test(err.message)) {
    console.error('  TLS was refused. This project verifies certificates on purpose;');
    console.error('  do not disable that to get past it.');
  }
  process.exit(1);
}

/* ---------------------------------------------------------- what is in there */

const scalar = async (sql, fallback = null) => {
  try {
    const { rows } = await client.query(sql);
    return Object.values(rows[0])[0];
  } catch {
    return fallback;
  }
};

const version = await scalar('SELECT current_setting($$server_version$$)');
say('PostgreSQL', version ?? 'unknown');

const hasMigrations = await scalar(
  `SELECT to_regclass('public.schema_migrations') IS NOT NULL`,
);

console.log('\nSchema');
if (!hasMigrations) {
  say('migrations applied', 'none — this is an empty database');
  next.push(`Apply the schema:  DATABASE_URL='<direct>' npm run db:migrate`);
} else {
  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  const done = new Set(rows.map((r) => r.filename));
  const pending = files.filter((f) => !done.has(f));
  const stray = [...done].filter((f) => !files.includes(f));

  say('migrations applied', `${done.size} of ${files.length}`);
  if (pending.length) {
    say('pending', pending.join(', '));
    next.push(`Apply the rest:  DATABASE_URL='<direct>' npm run db:migrate`);
  }
  if (stray.length) {
    say('applied but missing', stray.join(', '));
    console.log('  ! This database has migrations that are not in the repo. Somebody');
    console.log('    applied a file that was later renamed or deleted.');
  }
  if (pooled && pending.length) {
    console.log('  ! Use the DIRECT host for migrations. The pooled one is PgBouncer in');
    console.log('    transaction mode: fine for the app, awkward for DDL.');
  }
}

if (hasMigrations) {
  console.log('\nContents');
  for (const [label, sql] of [
    ['candidates', 'SELECT count(*) FROM candidates'],
    ['schools', 'SELECT count(*) FROM schools'],
    ['job postings', 'SELECT count(*) FROM job_postings'],
    ['applications', 'SELECT count(*) FROM applications'],
    ['signed-in identities', 'SELECT count(*) FROM users'],
  ]) {
    const n = await scalar(sql);
    say(label, n ?? '(table not there yet)');
  }

  const seeded = Number(await scalar('SELECT count(*) FROM candidates', 0));
  if (seeded === 0) {
    next.push(`Load the sample bundle:  DATABASE_URL='<direct>' npm run db:seed`);
  }

  const staff = await scalar(
    `SELECT count(*) FROM platform_users WHERE deleted_at IS NULL`,
  );
  const claimed = await scalar(
    `SELECT count(*) FROM platform_users WHERE deleted_at IS NULL AND auth_user_id IS NOT NULL`,
  );
  if (staff !== null) {
    console.log('\nStaff list');
    say('on the list', `${staff}`);
    say('signed in at least once', `${claimed}`);
    if (Number(staff) === 0) {
      next.push('Add yourself:  npm run admin add you@example.com "Your Name" owner');
    } else if (Number(claimed) === 0) {
      next.push('Sign in at /signup with a listed address — the link prints in the terminal.');
    }
  }
}

await client.end();

console.log('');
if (next.length) {
  console.log('Next');
  for (const n of next) console.log(`  → ${n}`);
} else {
  console.log('Nothing to do — this database is ready. `npm run dev` and sign in.');
}
console.log('');
