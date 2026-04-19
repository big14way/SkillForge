import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/db/client.js';
import { Queries } from '../src/db/queries.js';
import type { Database } from 'better-sqlite3';

describe('indexer DB', () => {
  let db: Database;
  let q: Queries;

  beforeEach(() => {
    db = openDb({ path: ':memory:' });
    q = new Queries(db);
  });

  it('upserts then reads a skill', () => {
    q.upsertSkill({
      token_id: '1',
      creator: '0xabc',
      name: 'alpha-hunter',
      description: 'sentiment',
      category: 'trading',
      price_per_use: '1000000000000000',
      storage_uri: '0g://deadbeef',
      created_at: 1_000,
    });
    const skill = q.getSkill('1');
    expect(skill?.name).toBe('alpha-hunter');
    expect(skill?.is_active).toBe(1);
    expect(skill?.quality_score).toBe(0);
  });

  it('updates quality score and increments rentals', () => {
    q.upsertSkill({
      token_id: '1',
      creator: '0xabc',
      name: 'x',
      description: '',
      category: 'trading',
      price_per_use: '1',
      storage_uri: '',
      created_at: 0,
    });
    q.updateSkillScore('1', 9000);
    q.incrementSkillRentals('1');
    q.incrementSkillRentals('1');
    const skill = q.getSkill('1');
    expect(skill?.quality_score).toBe(9000);
    expect(skill?.total_rentals).toBe(2);
  });

  it('filters skills by category and creator', () => {
    const base = { created_at: 0, description: '', price_per_use: '1', storage_uri: '' };
    q.upsertSkill({ ...base, token_id: '1', creator: '0xa', name: 'A', category: 'trading' });
    q.upsertSkill({ ...base, token_id: '2', creator: '0xb', name: 'B', category: 'data' });
    q.upsertSkill({ ...base, token_id: '3', creator: '0xa', name: 'C', category: 'trading' });
    q.updateSkillScore('1', 100);
    q.updateSkillScore('3', 500);

    const trading = q.listSkills({ category: 'trading' });
    expect(trading.map((s) => s.token_id)).toEqual(['3', '1']);

    const byA = q.listSkills({ creator: '0xa' });
    expect(byA).toHaveLength(2);
  });

  it('upserts rentals and transitions state', () => {
    // FK to skills — seed a row first.
    q.upsertSkill({
      token_id: '42',
      creator: '0x2',
      name: 'seed',
      description: '',
      category: 'trading',
      price_per_use: '1',
      storage_uri: '',
      created_at: 0,
    });
    q.upsertRental({
      rental_id: '1',
      skill_token_id: '42',
      renter: '0x1',
      creator: '0x2',
      amount: '1000',
      state: 'Requested',
      created_at: 100,
    });
    q.upsertRental({
      rental_id: '1',
      skill_token_id: '42',
      renter: '0x1',
      creator: '0x2',
      amount: '1000',
      state: 'Funded',
      created_at: 100,
    });
    const r = q.getRental('1');
    expect(r?.state).toBe('Funded');
  });

  it('insertEvent is idempotent on (tx_hash, log_index)', () => {
    const e = {
      block_number: 1,
      tx_hash: '0xabc',
      log_index: 0,
      contract: 'SkillRegistry',
      event_name: 'SkillRegistered',
      args: '{}',
      processed_at: 0,
    };
    q.insertEvent(e);
    q.insertEvent(e);
    const rows = db.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number };
    expect(rows.c).toBe(1);
  });

  it('setIndexerState persists across reads', () => {
    q.setIndexerState('last_block', '12345');
    expect(q.getIndexerState('last_block')).toBe('12345');
    q.setIndexerState('last_block', '12346');
    expect(q.getIndexerState('last_block')).toBe('12346');
  });
});
