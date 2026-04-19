import { env } from './env';

/**
 * Thin fetch wrapper for the indexer API. Throws on !ok so react-query's
 * error boundary surfaces the failure. We deliberately don't add retry here
 * — react-query handles that.
 */

export interface ApiSkill {
  tokenId: string;
  creator: string;
  name: string;
  description: string;
  category: string;
  pricePerUse: string;
  qualityScore: number;
  totalRentals: number;
  storageURI: string;
  dataHash: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ApiRental {
  rentalId: string;
  skillTokenId: string;
  renter: string;
  creator: string;
  amount: string;
  state: string;
  workProofHash: string | null;
  qualityScore: number | null;
  createdAt: number;
  completedAt: number | null;
}

export interface ApiAgent {
  address: string;
  skillsCreated: number;
  skillsRented: number;
  totalEarned: string;
  totalSpent: string;
  avgQualityScoreAsCreator: number | null;
  firstSeenAt: number;
  lastActiveAt: number;
}

export interface ApiHealth {
  ok: boolean;
  lastBlocks: Record<string, string | null>;
  chainId: number;
  skillsIndexed: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${env.indexerUrl}${path}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`indexer ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => get<ApiHealth>('/api/health'),

  listSkills: (params: {
    category?: string;
    creator?: string;
    sort?: 'quality' | 'recent' | 'popular';
    limit?: number;
    offset?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.creator) q.set('creator', params.creator);
    if (params.sort) q.set('sort', params.sort);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    const qs = q.toString();
    return get<{
      items: ApiSkill[];
      page: { limit: number; offset: number; count: number };
    }>(`/api/skills${qs ? `?${qs}` : ''}`);
  },

  getSkill: (tokenId: string) =>
    get<{ skill: ApiSkill; recentRentals: ApiRental[] }>(`/api/skills/${tokenId}`),

  getRental: (rentalId: string) => get<{ rental: ApiRental }>(`/api/rentals/${rentalId}`),

  getAgent: (address: string) =>
    get<{ agent: ApiAgent; recent: { asRenter: ApiRental[]; asCreator: ApiRental[] } }>(
      `/api/agents/${address}`,
    ),
};
