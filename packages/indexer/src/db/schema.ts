/**
 * Inlined copy of schema.sql so it's available at runtime without a build-time
 * file copy. The canonical source stays in schema.sql for diffing / editor
 * syntax highlighting; keep the two in sync.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS skills (
  token_id TEXT PRIMARY KEY,
  creator TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price_per_use TEXT NOT NULL,
  quality_score INTEGER NOT NULL DEFAULT 0,
  total_rentals INTEGER NOT NULL DEFAULT 0,
  storage_uri TEXT NOT NULL,
  data_hash TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skills_creator ON skills(creator);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_quality ON skills(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_skills_active_created ON skills(is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS rentals (
  rental_id TEXT PRIMARY KEY,
  skill_token_id TEXT NOT NULL,
  renter TEXT NOT NULL,
  creator TEXT NOT NULL,
  amount TEXT NOT NULL,
  state TEXT NOT NULL,
  work_proof_hash TEXT,
  quality_score INTEGER,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (skill_token_id) REFERENCES skills(token_id)
);

CREATE INDEX IF NOT EXISTS idx_rentals_renter ON rentals(renter);
CREATE INDEX IF NOT EXISTS idx_rentals_creator ON rentals(creator);
CREATE INDEX IF NOT EXISTS idx_rentals_state ON rentals(state);
CREATE INDEX IF NOT EXISTS idx_rentals_skill_created ON rentals(skill_token_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agents (
  address TEXT PRIMARY KEY,
  skills_created INTEGER NOT NULL DEFAULT 0,
  skills_rented INTEGER NOT NULL DEFAULT 0,
  total_earned TEXT NOT NULL DEFAULT '0',
  total_spent TEXT NOT NULL DEFAULT '0',
  avg_quality_score_as_creator INTEGER,
  first_seen_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_number INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  contract TEXT NOT NULL,
  event_name TEXT NOT NULL,
  args TEXT NOT NULL,
  processed_at INTEGER NOT NULL,
  UNIQUE(tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_events_block ON events(block_number);
CREATE INDEX IF NOT EXISTS idx_events_contract ON events(contract, event_name);

CREATE TABLE IF NOT EXISTS indexer_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
