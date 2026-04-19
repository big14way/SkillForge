'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api-client';

const STALE = 30_000;

export function useSkills(params: Parameters<typeof api.listSkills>[0] = {}) {
  return useQuery({
    queryKey: ['skills', params],
    queryFn: () => api.listSkills(params),
    staleTime: STALE,
  });
}

export function useSkill(tokenId: string | undefined) {
  return useQuery({
    queryKey: ['skill', tokenId],
    queryFn: () => api.getSkill(tokenId!),
    enabled: !!tokenId,
    staleTime: STALE,
  });
}

export function useRental(rentalId: string | undefined) {
  return useQuery({
    queryKey: ['rental', rentalId],
    queryFn: () => api.getRental(rentalId!),
    enabled: !!rentalId,
    staleTime: STALE,
    refetchInterval: 10_000, // rentals change state — poll while the page is open
  });
}

export function useAgent(address: string | undefined) {
  return useQuery({
    queryKey: ['agent', address],
    queryFn: () => api.getAgent(address!),
    enabled: !!address,
    staleTime: STALE,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['indexer-health'],
    queryFn: () => api.health(),
    staleTime: 60_000,
    retry: false,
  });
}
