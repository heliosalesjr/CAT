#!/usr/bin/env node
/**
 * The staff allowlist, from the command line.
 *
 *   npm run admin list
 *   npm run admin add you@example.com "Your Name" [owner|staff]
 *   npm run admin remove you@example.com
 *
 * Reads DATABASE_URL from the shell, or DATABASE_URL_DIRECT from
 * web1/.env.local when the shell has none.
 *
 * There is no signup form for platform staff and there should never be one.
 * A row here is created by somebody holding the database URL; signing in with
 * that address claims it (`claim_platform_seat` in 0019). That is the whole
 * access-control story for the admin side, and it is deliberately boring.
 *
 * `remove` soft-deletes: `platform_user_is_active()` then says no, so the
 * person loses all reach, while `document_access_log` keeps pointing at a row
 * that still exists. 0014 made that log append-only on purpose — a founder
 * who leaves does not take the record of what they read with them.
 */
import pg from 'pg';
import { databaseUrlForRowWork } from './env.mjs';

const [command, email, name, role = 'staff'] = process.argv.slice(2);

// Falls back to web1/.env.local, because typing a Neon connection string to
// add one row is the kind of friction that stops people using the tool.
const url = databaseUrlForRowWork();
if (!url) {
  console.error('No DATABASE_URL, in the shell or in web1/.env.local.');
  process.exit(1);
}

function usage(message) {
  if (message) console.error(`${message}\n`);
  console.error('Usage:');
  console.error('  node db/admin.mjs list');
  console.error('  node db/admin.mjs add <email> "<name>" [owner|staff]');
  console.error('  node db/admin.mjs remove <email>');
  process.exit(1);
}

if (!['list', 'add', 'remove'].includes(command)) usage();
if (command !== 'list' && !email) usage('An email address is required.');
if (command === 'add' && !['owner', 'staff'].includes(role)) {
  usage(`Role must be owner or staff, not ${role}.`);
}

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: true },
});
await client.connect();

try {
  if (command === 'list') {
    const { rows } = await client.query(`
      SELECT p.id, p.email, p.role,
             btrim(concat_ws(' ', p.first_name, p.last_name)) AS name,
             p.auth_user_id IS NOT NULL AS signed_in_once,
             p.deleted_at IS NOT NULL   AS removed
      FROM   platform_users p
      ORDER  BY p.deleted_at NULLS FIRST, p.created_at`);

    if (!rows.length) {
      console.log('Nobody on the staff list yet. Add yourself:');
      console.log('  node db/admin.mjs add you@example.com "Your Name" owner');
    } else {
      console.log(`${rows.length} on the staff list\n`);
      for (const r of rows) {
        const state = r.removed ? 'removed' : r.signed_in_once ? 'active' : 'never signed in';
        console.log(`  ${r.email.padEnd(34)} ${r.role.padEnd(6)} ${state.padEnd(16)} ${r.name || ''}`);
      }
    }
  }

  if (command === 'add') {
    const [first, ...rest] = (name ?? '').trim().split(/\s+/);
    // The name is for the audit trail and the admin screens; an address alone
    // is enough to sign in, so it stays optional.
    const { rows } = await client.query(
      `INSERT INTO platform_users (email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role`,
      [email.trim(), first || null, rest.join(' ') || null, role],
    );
    const r = rows[0];
    console.log(`Added ${r.email} as ${r.role} (${r.id}).`);
    console.log('Sign in with that address and the seat binds to it.');
  }

  if (command === 'remove') {
    const { rows } = await client.query(
      `UPDATE platform_users SET deleted_at = now()
       WHERE lower(email) = lower($1) AND deleted_at IS NULL
       RETURNING id, email`,
      [email.trim()],
    );
    if (!rows.length) {
      console.error(`${email} is not on the staff list, or was already removed.`);
      process.exitCode = 1;
    } else {
      console.log(`Removed ${rows[0].email}. They can no longer read anything;`);
      console.log('the log of what they already read is kept, by design.');
    }
  }
} catch (err) {
  // The interesting failures are the schema's own, and their messages were
  // written to be read: a duplicate address, or one that already belongs to a
  // candidate or a school user.
  console.error(`\n${err.message}`);
  if (err.detail) console.error(`  ${err.detail}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
