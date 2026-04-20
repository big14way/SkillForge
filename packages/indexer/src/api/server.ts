import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { Logger } from 'pino';
import type { Queries } from '../db/queries.js';
import type {
  AgentView,
  HealthView,
  RentalView,
  SkillView} from './schemas.js';
import {
  ListSkillsQuery,
  agentRowToView,
  rentalRowToView,
  skillRowToView,
} from './schemas.js';
import { z } from 'zod';

export interface ApiServerOptions {
  db: Queries;
  chainId: number;
  logger: Logger;
}

/**
 * Build a ready-to-listen Fastify app. Caller controls listen() so tests can
 * hit the app in-process via `app.inject`.
 */
export async function buildApi(opts: ApiServerOptions) {
  // Fastify v5 wants a config object (or false) under `logger`. We pass our
  // pino instance separately via `loggerInstance` to reuse the indexer's
  // configured transport.
  const app = Fastify({
    loggerInstance: opts.logger,
    disableRequestLogging: true,
  });
  await app.register(cors, { origin: true });

  app.get('/api/health', async () => {
    const body: HealthView = {
      ok: true,
      lastBlocks: {
        skillRegistry: opts.db.getIndexerState('skill_registry_last_block'),
        skillEscrow: opts.db.getIndexerState('skill_escrow_last_block'),
        skillINFT: opts.db.getIndexerState('skill_inft_last_block'),
      },
      chainId: opts.chainId,
      skillsIndexed: opts.db.countActiveSkills(),
    };
    return body;
  });

  app.get('/api/skills', async (req, reply) => {
    const parsed = ListSkillsQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const rows = opts.db.listSkills({
      ...(parsed.data.category !== undefined && { category: parsed.data.category }),
      ...(parsed.data.creator !== undefined && { creator: parsed.data.creator }),
      ...(parsed.data.sort !== undefined && { sort: parsed.data.sort }),
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
    const items = rows.map(skillRowToView);
    return {
      items,
      page: { limit: parsed.data.limit, offset: parsed.data.offset, count: items.length },
    };
  });

  app.get<{ Params: { tokenId: string } }>('/api/skills/:tokenId', async (req, reply) => {
    const row = opts.db.getSkill(req.params.tokenId);
    if (!row) return reply.code(404).send({ error: 'skill not found' });
    const view: SkillView = skillRowToView(row);
    const rentals = opts.db.listRentalsBySkill(row.token_id, 20).map(rentalRowToView);
    return { skill: view, recentRentals: rentals };
  });

  app.get<{ Params: { tokenId: string }; Querystring: { limit?: string; offset?: string } }>(
    '/api/skills/:tokenId/rentals',
    async (req) => {
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const offset = Math.max(Number(req.query.offset ?? 0), 0);
      const rentals = opts.db.listRentalsBySkill(req.params.tokenId, limit, offset).map(rentalRowToView);
      return { items: rentals, page: { limit, offset, count: rentals.length } };
    },
  );

  app.get<{ Params: { rentalId: string } }>('/api/rentals/:rentalId', async (req, reply) => {
    const row = opts.db.getRental(req.params.rentalId);
    if (!row) return reply.code(404).send({ error: 'rental not found' });
    const view: RentalView = rentalRowToView(row);
    return { rental: view };
  });

  app.get<{ Params: { address: string } }>('/api/agents/:address', async (req, reply) => {
    const addr = req.params.address.toLowerCase();
    const row = opts.db.getAgent(addr);
    if (!row) return reply.code(404).send({ error: 'agent not found' });
    const view: AgentView = agentRowToView(row);
    const asRenter = opts.db.listRentalsByAgent(addr, 'renter', 5).map(rentalRowToView);
    const asCreator = opts.db.listRentalsByAgent(addr, 'creator', 5).map(rentalRowToView);
    return { agent: view, recent: { asRenter, asCreator } };
  });

  const AgentRentalsQuery = z.object({
    as: z.enum(['renter', 'creator']).default('renter'),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  });

  app.get<{ Params: { address: string } }>(
    '/api/agents/:address/rentals',
    async (req, reply) => {
      const parsed = AgentRentalsQuery.safeParse(req.query);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
      const items = opts.db
        .listRentalsByAgent(req.params.address, parsed.data.as, parsed.data.limit, parsed.data.offset)
        .map(rentalRowToView);
      return { items, page: { limit: parsed.data.limit, offset: parsed.data.offset, count: items.length } };
    },
  );

  return app;
}
