import { z } from 'zod';

/**
 * Request + response schemas for the indexer HTTP API. Both the server and
 * the frontend consume these — always export the types, never duplicate.
 */

export const HexAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'invalid address')
  .transform((s) => s.toLowerCase());

export const SkillSort = z.enum(['quality', 'recent', 'popular']).default('quality');

export const ListSkillsQuery = z.object({
  category: z.string().min(1).optional(),
  creator: HexAddress.optional(),
  sort: SkillSort.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListSkillsQuery = z.infer<typeof ListSkillsQuery>;

export const SkillView = z.object({
  tokenId: z.string(),
  creator: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  pricePerUse: z.string(), // bigint as string
  qualityScore: z.number(),
  totalRentals: z.number(),
  storageURI: z.string(),
  dataHash: z.string(),
  isActive: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type SkillView = z.infer<typeof SkillView>;

export const RentalView = z.object({
  rentalId: z.string(),
  skillTokenId: z.string(),
  renter: z.string(),
  creator: z.string(),
  amount: z.string(),
  state: z.string(),
  workProofHash: z.string().nullable(),
  qualityScore: z.number().nullable(),
  createdAt: z.number(),
  completedAt: z.number().nullable(),
});
export type RentalView = z.infer<typeof RentalView>;

export const AgentView = z.object({
  address: z.string(),
  skillsCreated: z.number(),
  skillsRented: z.number(),
  totalEarned: z.string(),
  totalSpent: z.string(),
  avgQualityScoreAsCreator: z.number().nullable(),
  firstSeenAt: z.number(),
  lastActiveAt: z.number(),
});
export type AgentView = z.infer<typeof AgentView>;

export const HealthView = z.object({
  ok: z.boolean(),
  lastBlocks: z.record(z.string(), z.string().nullable()),
  chainId: z.number(),
  skillsIndexed: z.number(),
});
export type HealthView = z.infer<typeof HealthView>;

// ---------------------------------------------------------------------------
// row → view mappers. Live here to keep the shape conversion in one place.
// ---------------------------------------------------------------------------

import type { SkillRow, RentalRow, AgentRow } from '../db/queries.js';

export function skillRowToView(r: SkillRow): SkillView {
  return {
    tokenId: r.token_id,
    creator: r.creator,
    name: r.name,
    description: r.description,
    category: r.category,
    pricePerUse: r.price_per_use,
    qualityScore: r.quality_score,
    totalRentals: r.total_rentals,
    storageURI: r.storage_uri,
    dataHash: r.data_hash,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rentalRowToView(r: RentalRow): RentalView {
  return {
    rentalId: r.rental_id,
    skillTokenId: r.skill_token_id,
    renter: r.renter,
    creator: r.creator,
    amount: r.amount,
    state: r.state,
    workProofHash: r.work_proof_hash,
    qualityScore: r.quality_score,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  };
}

export function agentRowToView(r: AgentRow): AgentView {
  return {
    address: r.address,
    skillsCreated: r.skills_created,
    skillsRented: r.skills_rented,
    totalEarned: r.total_earned,
    totalSpent: r.total_spent,
    avgQualityScoreAsCreator: r.avg_quality_score_as_creator,
    firstSeenAt: r.first_seen_at,
    lastActiveAt: r.last_active_at,
  };
}
