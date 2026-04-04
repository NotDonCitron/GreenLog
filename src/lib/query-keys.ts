// src/lib/query-keys.ts
// Centralized query key factory functions for React Query
// All query keys across the app should be defined here

// Strains
export const strainKeys = {
  all: ['strains'] as const,
  list: (filters?: StrainsFilters) => ['strains', 'list', filters ?? {}] as const,
  detail: (slug: string) => ['strain', slug] as const,
};

// Collection
export const collectionKeys = {
  all: ['collection'] as const,
  list: (userId: string) => ['collection', userId] as const,
  ids: (userId: string) => ['collection-ids', userId] as const,
};

// Social
export const followingKeys = {
  all: ['following'] as const,
  list: (userId: string) => ['following', userId] as const,
};

export const followersKeys = {
  all: ['followers'] as const,
  list: (userId: string) => ['followers', userId] as const,
};

export const followRequestsKeys = {
  all: ['follow-requests'] as const,
  list: () => ['follow-requests'] as const,
};

export type StrainsFilters = {
  activeTab?: 'catalog' | 'org';
  organizationId?: string | null;
  effects?: string[];
  thcMin?: number;
  thcMax?: number;
  cbdMin?: number;
  cbdMax?: number;
  flavors?: string[];
  sourceFilter?: string;
  search?: string;
};
