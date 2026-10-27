import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Reads web1/.env.local, which Next loads and a plain `node` process does not.
 * Returns {} when the file is not there. Nothing is exported into
 * process.env — the caller decides what to do with each value.
 */
export function readEnvLocal() {
  const found = {};
  try {
    const text = readFileSync(join(HERE, '..', '.env.local'), 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let value = m[2].trim();
      if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
      if (value) found[m[1]] = value;
    }
  } catch {
    return {};
  }
  return found;
}

/**
 * The URL for a script that only reads and writes rows.
 *
 * Prefers the shell, then the DIRECT host from the file, then the pooled one.
 * `migrate` and `seed` deliberately do NOT use this: DDL belongs on the direct
 * host, and a script that silently fell back to the pooled one would hand
 * migrations to PgBouncer. A single INSERT does not care.
 */
export function databaseUrlForRowWork() {
  const env = readEnvLocal();
  return (
    process.env.DATABASE_URL ||
    env.DATABASE_URL_DIRECT ||
    env.DATABASE_URL ||
    null
  );
}
