import Database, { type Database as Db } from 'better-sqlite3';
import { SCHEMA_SQL } from './schema.js';

/**
 * Thin wrapper over better-sqlite3 that runs the schema migration on first
 * connect and exposes a single `db` handle. Everything downstream uses
 * prepared statements in `queries.ts` — no ad-hoc SQL elsewhere.
 */

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

  db.exec(SCHEMA_SQL);
  return db;
}
