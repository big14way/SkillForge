import type { MemoryClient, SkillForgeClient, Hex } from '@skillforge/sdk';

export interface AgentProfile {
  displayName: string;
  bio?: string;
  registeredSkills?: bigint[];
  updatedAt: number;
}

export interface ReputationStats {
  totalRentals: number;
  avgQualityScore: number;
  totalEarnings: bigint;
  totalSpent: bigint;
  updatedAt: number;
}

export interface RentalHistoryEntry {
  rentalId: string;
  skillTokenId: string;
  role: 'creator' | 'renter';
  amount: string;
  qualityScore: number;
  completedAt: number;
}

export interface InvocationMemory {
  rentalId: string;
  input: string;
  output: string;
  score?: number;
  ts: number;
}

/**
 * High-level per-agent memory API over the raw KV client. Keys follow the
 * conventions documented in `MemoryClient`. We wrap bigints to strings for
 * JSON-safety on the way out and back.
 */
export class MemoryService {
  private readonly kv: MemoryClient;

  constructor(sdk: SkillForgeClient, private readonly agent: Hex) {
    if (!sdk.memory) {
      throw new Error(
        'MemoryService requires a configured MemoryClient (set OG_KV_STREAM_ID + OG_KV_NODE_RPC + OG_FLOW_CONTRACT_ADDRESS)',
      );
    }
    this.kv = sdk.memory;
  }

  private key(suffix: string): string {
    return `agent:${this.agent.toLowerCase()}:${suffix}`;
  }

  async getProfile(): Promise<AgentProfile | null> {
    return this.kv.get<AgentProfile>(this.key('profile'));
  }

  async updateProfile(updates: Partial<AgentProfile>): Promise<void> {
    const current = (await this.getProfile()) ?? { displayName: '', updatedAt: 0 };
    const next: AgentProfile = {
      ...current,
      ...updates,
      updatedAt: Date.now(),
    };
    await this.kv.set(this.key('profile'), next);
  }

  async getReputation(): Promise<ReputationStats> {
    const r = await this.kv.get<ReputationStats>(this.key('reputation'));
    return (
      r ?? {
        totalRentals: 0,
        avgQualityScore: 0,
        totalEarnings: 0n,
        totalSpent: 0n,
        updatedAt: 0,
      }
    );
  }

  async recordRental(entry: RentalHistoryEntry): Promise<void> {
    await this.kv.append(this.key('history'), entry);
    // Also roll the summary stats forward.
    const current = await this.getReputation();
    const n = current.totalRentals + 1;
    const nextAvg = Math.round(
      (current.avgQualityScore * current.totalRentals + entry.qualityScore) / n,
    );
    const updated: ReputationStats = {
      totalRentals: n,
      avgQualityScore: nextAvg,
      totalEarnings:
        entry.role === 'creator' ? current.totalEarnings + BigInt(entry.amount) : current.totalEarnings,
      totalSpent:
        entry.role === 'renter' ? current.totalSpent + BigInt(entry.amount) : current.totalSpent,
      updatedAt: Date.now(),
    };
    await this.kv.set(this.key('reputation'), {
      ...updated,
      totalEarnings: updated.totalEarnings.toString(),
      totalSpent: updated.totalSpent.toString(),
    });
  }

  async getHistory(limit = 50): Promise<RentalHistoryEntry[]> {
    const rows = await this.kv.list(this.key('history'), limit);
    return rows.map((r) => r.value as RentalHistoryEntry);
  }

  async rememberInvocation(tokenId: bigint, entry: InvocationMemory): Promise<void> {
    await this.kv.append(`skill:${tokenId.toString()}:invocations`, entry);
  }

  async recallInvocations(tokenId: bigint, limit = 20): Promise<InvocationMemory[]> {
    const rows = await this.kv.list(`skill:${tokenId.toString()}:invocations`, limit);
    return rows.map((r) => r.value as InvocationMemory);
  }
}
