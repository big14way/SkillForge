import { describe, it, expect, beforeEach } from 'vitest';
import pino from 'pino';
import type { FastifyInstance } from 'fastify';
import { openDb } from '../src/db/client.js';
import { Queries } from '../src/db/queries.js';
import { buildApi } from '../src/api/server.js';

describe('indexer API', () => {
  let q: Queries;
  let app: FastifyInstance;

  beforeEach(async () => {
    q = new Queries(openDb({ path: ':memory:' }));
    app = await buildApi({ db: q, chainId: 16602, logger: pino({ level: 'silent' }) });
    await app.ready();
  });

  it('GET /api/health returns ok + last blocks', async () => {
    q.setIndexerState('skill_registry_last_block', '123');
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.chainId).toBe(16602);
    expect(body.lastBlocks.skillRegistry).toBe('123');
  });

  it('GET /api/skills lists active skills sorted by quality desc', async () => {
    const base = { created_at: 0, description: '', price_per_use: '1', storage_uri: '' };
    q.upsertSkill({ ...base, token_id: '1', creator: '0xa', name: 'A', category: 'trading' });
    q.upsertSkill({ ...base, token_id: '2', creator: '0xb', name: 'B', category: 'trading' });
    q.updateSkillScore('1', 500);
    q.updateSkillScore('2', 9000);

    const res = await app.inject({ method: 'GET', url: '/api/skills' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items).toHaveLength(2);
    expect(body.items[0].tokenId).toBe('2');
    expect(body.items[0].qualityScore).toBe(9000);
  });

  it('GET /api/skills filters by category', async () => {
    const base = { created_at: 0, description: '', price_per_use: '1', storage_uri: '' };
    q.upsertSkill({ ...base, token_id: '1', creator: '0xa', name: 'A', category: 'trading' });
    q.upsertSkill({ ...base, token_id: '2', creator: '0xb', name: 'B', category: 'data' });
    const res = await app.inject({ method: 'GET', url: '/api/skills?category=data' });
    const body = res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].category).toBe('data');
  });

  it('GET /api/skills/:tokenId includes rental history', async () => {
    const base = { created_at: 0, description: '', price_per_use: '1000', storage_uri: '' };
    q.upsertSkill({ ...base, token_id: '1', creator: '0xa', name: 'A', category: 'trading' });
    q.upsertRental({
      rental_id: '1',
      skill_token_id: '1',
      renter: '0xr',
      creator: '0xa',
      amount: '1000',
      state: 'Completed',
      created_at: 10,
    });
    const res = await app.inject({ method: 'GET', url: '/api/skills/1' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.skill.tokenId).toBe('1');
    expect(body.recentRentals).toHaveLength(1);
  });

  it('GET /api/skills/:tokenId returns 404 for unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/skills/999' });
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/agents/:address returns profile + recent rentals', async () => {
    q.touchAgent('0xaa', 100);
    q.bumpAgentCreated('0xaa');
    const res = await app.inject({ method: 'GET', url: '/api/agents/0xAA' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.agent.address).toBe('0xaa');
    expect(body.agent.skillsCreated).toBe(1);
  });

  it('rejects invalid query params', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/skills?creator=not-an-address' });
    expect(res.statusCode).toBe(400);
  });
});
