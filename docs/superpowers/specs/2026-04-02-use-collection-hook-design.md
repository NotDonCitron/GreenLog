# useCollection Hook — Design Spec

## Overview

Replace the scattered collection pattern across three files with a single, well-bounded React hook that owns all collection state, fetching, and mutations.

## Current Problems

1. **3 places** independently fetch `supabase.from('user_collection').select('strain_id')`
2. **2 places** each subscribe to `onCollectionUpdate` + `visibilitychange` with identical refetch logic
3. **Strain detail** manually calls `emitCollectionUpdate()` + `checkAndUnlockBadges()` + `queryClient.invalidateQueries()` — easy to forget
4. **No caching** — `strains/page.tsx` refetches on every visibility change even when data is fresh

## Hook API

### `useCollection()` — Full collection

```typescript
type CollectionStrain = Strain & {
  collected_at?: string | null;
  user_notes?: string | null;
  image_url?: string;
  avg_thc?: number;
  avg_cbd?: number;
};

type CollectOptions = {
  batchInfo?: string;
  userNotes?: string;
  userThc?: number;
  userCbd?: number;
  userImageUrl?: string;
};

function useCollection(): {
  collectedIds: string[];
  collection: CollectionStrain[];
  isLoading: boolean;
  error: Error | null;
  count: number;
  collect(strainId: string, opts?: CollectOptions): Promise<void>;
  uncollect(strainId: string): Promise<void>;
  toggleCollect(strainId: string): Promise<void>;
  refetch(): void;
};
```

### `useCollectionIds()` — Lightweight ID-only hook

```typescript
function useCollectionIds(): {
  collectedIds: string[];
  isLoading: boolean;
  refetch(): void;
};
```

Use this on strain cards and anywhere you only need `isCollected: boolean` checks.

## Internal Architecture

### Queries

| Query Key | Fetch | Cache Time | Used By |
|-----------|-------|------------|---------|
| `['collection', userId]` | Full join (user_collection + strains) | 5 min | CollectionPage |
| `['collection-ids', userId]` | strain_id list only | 5 min | StrainCards, compare tray |

Both queries are `enabled: !!user`.

### Mutations

`collect()` and `uncollect()` use `useMutation` with optimistic updates:

1. `QueryClient.setQueryData` — update cache immediately
2. `QueryClient.cancelQueries({ queryKey: ['collection' | 'collection-ids', userId] })` — cancel in-flight refetches
3. `supabase.from('user_collection').upsert()` or `.delete()` — persist
4. On success: `emitCollectionUpdate()` + `checkAndUnlockBadges()` (once, centralized)
5. On error: rollback via `QueryClient.setQueryData` with previous data

### Auto-subscription

The hook manages its own refresh lifecycle via `useEffect`:
- Listens to `visibilitychange` → calls `queryClient.invalidateQueries`
- Subscribes to `onCollectionUpdate` → same invalidation
- Cleanup on unmount

## Migration Plan

### `src/app/strains/page.tsx`
- Remove: manual `supabase.from('user_collection').select('strain_id')` fetch
- Remove: `visibilitychange` + `onCollectionUpdate` subscription
- Add: `const { collectedIds } = useCollectionIds()`
- `isCollected` check: `collectedIds.includes(strain.id)`

### `src/app/collection/CollectionPageClient.tsx`
- Remove: `useQuery({ queryKey: ['collection', user?.id], queryFn: ... })` with manual join
- Remove: `visibilitychange` + `onCollectionUpdate` subscription
- Remove: `SearchParamsSync` (filter state — stays local to that component)
- Add: `const { collection, isLoading, error } = useCollection()`
- `filteredStrains` memo: replace `strains` with `collection`

### `src/app/strains/[slug]/StrainDetailPageClient.tsx`
- Remove: `emitCollectionUpdate()` call after rating/collect
- Remove: `checkAndUnlockBadges()` call after rating/collect
- Remove: `queryClient.invalidateQueries({ queryKey: ['collection', user.id] })`
- Add: `const { toggleCollect } = useCollection()` or `collect/uncollect` directly
- After rating: call `toggleCollect(strain.id, { batchInfo, userNotes, userThc, userCbd })`

### `src/lib/collection-events.ts`
- Keep the file and exports for now (other potential consumers or future work)
- Deprecate comments added

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useCollection.ts` | New — full hook with queries + mutations |
| `src/app/strains/page.tsx` | Migrate to `useCollectionIds()` |
| `src/app/collection/CollectionPageClient.tsx` | Migrate to `useCollection()` |
| `src/app/strains/[slug]/StrainDetailPageClient.tsx` | Migrate to `toggleCollect()` |
| `src/lib/collection-events.ts` | Add deprecation comments |

## Test Scenarios

1. Fresh load of `/strains` — strain cards show correct `isCollected` state
2. Collect a strain on detail page — card on `/strains` updates immediately (optimistic)
3. Uncollect a strain — card removes collected indicator without page refresh
4. Switch tabs on collection page — count reflects actual collection size
5. Open app after 10min away — collection counts refetched on visibility
6. Network failure on collect — UI rolls back, no error state left behind
