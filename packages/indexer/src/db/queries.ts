import type { Database as Db, Statement } from 'better-sqlite3';

/**
 * Typed query surface. Every write-path statement is prepared once per Db
 * instance (via Queries' constructor) so the hot path never re-parses SQL.
 */

export interface SkillRow {
  token_id: string;
  creator: string;
  name: string;
  description: string;
  category: string;
  price_per_use: string;
  quality_score: number;
  total_rentals: number;
  storage_uri: string;
  data_hash: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface RentalRow {
  rental_id: string;
  skill_token_id: string;
  renter: string;
  creator: string;
  amount: string;
  state: string;
  work_proof_hash: string | null;
  quality_score: number | null;
  created_at: number;
  completed_at: number | null;
}

export interface AgentRow {
  address: string;
  skills_created: number;
  skills_rented: number;
  total_earned: string;
  total_spent: string;
  avg_quality_score_as_creator: number | null;
  first_seen_at: number;
  last_active_at: number;
}

export interface EventRow {
  block_number: number;
  tx_hash: string;
  log_index: number;
  contract: string;
  event_name: string;
  args: string;
  processed_at: number;
}

export type SkillSort = 'quality' | 'recent' | 'popular';

export class Queries {
  private readonly s: {
    upsertSkill: Statement;
    updateSkillScore: Statement;
    incrementSkillRentals: Statement;
    deactivateSkill: Statement;
    upsertRental: Statement;
    touchAgent: Statement;
    bumpAgentCreated: Statement;
    bumpAgentRented: Statement;
    insertEvent: Statement;
    setIndexerState: Statement;
    getIndexerState: Statement;
    getSkillById: Statement;
    getRentalById: Statement;
    getAgent: Statement;
    listRentalsBySkill: Statement;
    listRentalsByAgentAsRenter: Statement;
    listRentalsByAgentAsCreator: Statement;
    countSkills: Statement;
  };

  constructor(private readonly db: Db) {
    this.s = {
      upsertSkill: db.prepare(`
        INSERT INTO skills (
          token_id, creator, name, description, category, price_per_use,
          quality_score, total_rentals, storage_uri, data_hash, is_active,
          created_at, updated_at
        ) VALUES (
          @token_id, @creator, @name, @description, @category, @price_per_use,
          COALESCE(@quality_score, 0), COALESCE(@total_rentals, 0), @storage_uri,
          COALESCE(@data_hash, ''), 1, @created_at, @updated_at
        )
        ON CONFLICT(token_id) DO UPDATE SET
          creator = excluded.creator,
          name = excluded.name,
          description = excluded.description,
          category = excluded.category,
          price_per_use = excluded.price_per_use,
          storage_uri = excluded.storage_uri,
          data_hash = CASE WHEN excluded.data_hash != '' THEN excluded.data_hash ELSE skills.data_hash END,
          is_active = 1,
          updated_at = excluded.updated_at
      `),
      updateSkillScore: db.prepare(`
        UPDATE skills SET quality_score = ?, updated_at = ? WHERE token_id = ?
      `),
      incrementSkillRentals: db.prepare(`
        UPDATE skills SET total_rentals = total_rentals + 1, updated_at = ? WHERE token_id = ?
      `),
      deactivateSkill: db.prepare(`
        UPDATE skills SET is_active = 0, updated_at = ? WHERE token_id = ?
      `),
      upsertRental: db.prepare(`
        INSERT INTO rentals (
          rental_id, skill_token_id, renter, creator, amount, state,
          work_proof_hash, quality_score, created_at, completed_at
        ) VALUES (
          @rental_id, @skill_token_id, @renter, @creator, @amount, @state,
          @work_proof_hash, @quality_score, @created_at, @completed_at
        )
        ON CONFLICT(rental_id) DO UPDATE SET
          state = excluded.state,
          work_proof_hash = COALESCE(excluded.work_proof_hash, rentals.work_proof_hash),
          quality_score = COALESCE(excluded.quality_score, rentals.quality_score),
          completed_at = COALESCE(excluded.completed_at, rentals.completed_at)
      `),
      touchAgent: db.prepare(`
        INSERT INTO agents (address, first_seen_at, last_active_at)
        VALUES (?, ?, ?)
        ON CONFLICT(address) DO UPDATE SET last_active_at = excluded.last_active_at
      `),
      bumpAgentCreated: db.prepare(`
        UPDATE agents SET skills_created = skills_created + 1, last_active_at = ? WHERE address = ?
      `),
      bumpAgentRented: db.prepare(`
        UPDATE agents SET skills_rented = skills_rented + 1, last_active_at = ? WHERE address = ?
      `),
      insertEvent: db.prepare(`
        INSERT OR IGNORE INTO events (
          block_number, tx_hash, log_index, contract, event_name, args, processed_at
        ) VALUES (@block_number, @tx_hash, @log_index, @contract, @event_name, @args, @processed_at)
      `),
      setIndexerState: db.prepare(`
        INSERT INTO indexer_state (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `),
      getIndexerState: db.prepare(`SELECT value FROM indexer_state WHERE key = ?`),
      getSkillById: db.prepare(`SELECT * FROM skills WHERE token_id = ?`),
      getRentalById: db.prepare(`SELECT * FROM rentals WHERE rental_id = ?`),
      getAgent: db.prepare(`SELECT * FROM agents WHERE address = ?`),
      listRentalsBySkill: db.prepare(
        `SELECT * FROM rentals WHERE skill_token_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      ),
      listRentalsByAgentAsRenter: db.prepare(
        `SELECT * FROM rentals WHERE renter = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      ),
      listRentalsByAgentAsCreator: db.prepare(
        `SELECT * FROM rentals WHERE creator = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      ),
      countSkills: db.prepare(`SELECT COUNT(*) as count FROM skills WHERE is_active = 1`),
    };
  }

  // ---------- writes ----------

  upsertSkill(row: Partial<SkillRow> & Pick<SkillRow, 'token_id' | 'creator' | 'name' | 'category' | 'price_per_use' | 'storage_uri' | 'created_at'>): void {
    const now = Date.now();
    this.s.upsertSkill.run({
      description: '',
      data_hash: '',
      quality_score: 0,
      total_rentals: 0,
      updated_at: now,
      ...row,
    });
  }

  updateSkillScore(tokenId: string, score: number): void {
    this.s.updateSkillScore.run(score, Date.now(), tokenId);
  }

  incrementSkillRentals(tokenId: string): void {
    this.s.incrementSkillRentals.run(Date.now(), tokenId);
  }

  deactivateSkill(tokenId: string): void {
    this.s.deactivateSkill.run(Date.now(), tokenId);
  }

  upsertRental(row: Partial<RentalRow> & Pick<RentalRow, 'rental_id' | 'skill_token_id' | 'renter' | 'creator' | 'amount' | 'state' | 'created_at'>): void {
    this.s.upsertRental.run({
      work_proof_hash: null,
      quality_score: null,
      completed_at: null,
      ...row,
    });
  }

  touchAgent(address: string, ts: number): void {
    this.s.touchAgent.run(address, ts, ts);
  }

  bumpAgentCreated(address: string): void {
    this.s.bumpAgentCreated.run(Date.now(), address);
  }

  bumpAgentRented(address: string): void {
    this.s.bumpAgentRented.run(Date.now(), address);
  }

  insertEvent(row: EventRow): void {
    this.s.insertEvent.run(row);
  }

  setIndexerState(key: string, value: string): void {
    this.s.setIndexerState.run(key, value);
  }

  getIndexerState(key: string): string | null {
    const r = this.s.getIndexerState.get(key) as { value: string } | undefined;
    return r?.value ?? null;
  }

  // ---------- reads ----------

  getSkill(tokenId: string): SkillRow | null {
    return (this.s.getSkillById.get(tokenId) as SkillRow | undefined) ?? null;
  }

  getRental(rentalId: string): RentalRow | null {
    return (this.s.getRentalById.get(rentalId) as RentalRow | undefined) ?? null;
  }

  getAgent(address: string): AgentRow | null {
    return (this.s.getAgent.get(address) as AgentRow | undefined) ?? null;
  }

  /**
   * Paginated + filterable skill list. Hand-written SQL because sqlite doesn't
   * love dynamic prepared statements; all inputs are type-checked.
   */
  listSkills(opts: {
    category?: string;
    creator?: string;
    sort?: SkillSort;
    limit?: number;
    offset?: number;
  }): SkillRow[] {
    const limit = Math.min(opts.limit ?? 20, 100);
    const offset = opts.offset ?? 0;
    const orderBy = {
      quality: 'quality_score DESC, created_at DESC',
      recent: 'created_at DESC',
      popular: 'total_rentals DESC, quality_score DESC',
    }[opts.sort ?? 'quality'];

    const filters: string[] = ['is_active = 1'];
    const params: Array<string | number> = [];
    if (opts.category) {
      filters.push('category = ?');
      params.push(opts.category);
    }
    if (opts.creator) {
      filters.push('creator = ?');
      params.push(opts.creator.toLowerCase());
    }
    const sql = `
      SELECT * FROM skills
      WHERE ${filters.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);
    return this.db.prepare(sql).all(...params) as SkillRow[];
  }

  listRentalsBySkill(tokenId: string, limit = 20, offset = 0): RentalRow[] {
    return this.s.listRentalsBySkill.all(tokenId, limit, offset) as RentalRow[];
  }

  listRentalsByAgent(address: string, as: 'renter' | 'creator', limit = 20, offset = 0): RentalRow[] {
    const stmt = as === 'renter' ? this.s.listRentalsByAgentAsRenter : this.s.listRentalsByAgentAsCreator;
    return stmt.all(address.toLowerCase(), limit, offset) as RentalRow[];
  }

  countActiveSkills(): number {
    return (this.s.countSkills.get() as { count: number }).count;
  }

  /**
   * Returns the last `limit` quality scores for a skill, ordered most-recent
   * first. Backs the reputation-trajectory sparkline. Source is the `rentals`
   * table — every rental that reached Verified or Completed has a non-null
   * score plus a completed_at (or, for Verified-but-not-Completed, the
   * created_at of the rental as a coarse fallback).
   */
  getRecentScores(tokenId: string, limit = 10): Array<{ score: number; ts: number; rentalId: string }> {
    const rows = this.db
      .prepare(
        `SELECT rental_id, quality_score, COALESCE(completed_at, created_at) AS ts
         FROM rentals
         WHERE skill_token_id = ? AND quality_score IS NOT NULL
         ORDER BY ts DESC
         LIMIT ?`,
      )
      .all(tokenId, limit) as Array<{ rental_id: string; quality_score: number; ts: number }>;
    return rows.map((r) => ({ score: r.quality_score, ts: r.ts, rentalId: r.rental_id }));
  }
}
