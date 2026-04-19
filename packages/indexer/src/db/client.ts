import Database, { type Database as Db } from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Thin wrapper over better-sqlite3 that runs the schema migration on first
 * connect and exposes a single `db` handle. Everything downstream uses
 * prepared statements in `queries.ts` — no ad-hoc SQL elsewhere.
 */

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(here, 'schema.sql');

export interface DbOptions {
  /** Path to the sqlite file; `:memory:` for tests. */
  path: string;
  /** Log each statement. Off in prod. */
  verbose?: boolean;
}

export function openDb(opts: DbOptions): Db {
  const db = new Database(opts.path, opts.verbose ? { verbose: console.log } : {});
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  const schema = readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  return db;
}
