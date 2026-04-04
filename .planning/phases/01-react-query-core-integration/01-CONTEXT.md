# Phase 1: React Query Core Integration - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning
**Source:** Requirements + codebase analysis

<domain>
## Phase Boundary

Replace all `useEffect + supabase.from` data-fetching patterns with `@tanstack/react-query`'s `useQuery`. Add centralized query key management and consistent cache invalidation after mutations. The MVP is stable — this is an architectural improvement, not a feature launch.

</domain>

<decisions>
## Implementation Decisions

### Query Key Strategy
- All query keys defined in `src/lib/query-keys.ts` as exported functions
- Pattern: `['strains', filters]`, `['strain', slug]`, `['collection', userId]`
- Existing collection hooks already use this pattern — align everything to it

### Strains Page
- Replace `useEffect` at lines 195-254 with `useQuery(['strains', { activeTab, activeOrganization, sourceOverridesReady }])`
- Filter state (effects, thc, cbd, flavors) becomes part of query key for automatic refetch
- `keepPreviousData` for pagination to prevent layout flash (pagination TBD but prepare for it)
- Collection settings merge (lines 221-234) stays in the query function

### Collection Page
- `CollectionPageClient.tsx` uses `useCollection` hook which already has React Query
- Verify it uses `['collection', userId]` as query key — if not, align it
- Collect/uncollect mutations already invalidate correctly via existing hooks

### Strain Detail
- `StrainDetailPageClient.tsx` already has `queryClient.invalidateQueries` at line 266
- Check if it's using `useQuery` for the strain fetch — if not, convert it

### Social Mutations
- Follow/unfollow API calls need to invalidate `['following', userId]` and `['followers', targetUserId]`
- Follow requests need `['follow-requests']` invalidation
- Check `FollowButton` component and API routes

### Loading/Error States
- Skeleton loading already exists on strains page (lines 426-434)
- Error state already exists (lines 420-424)
- Make these consistent across all pages: use `isLoading` for skeleton, `isError` for error with retry

### Demo Mode
- Must work without Supabase connection
- `useCollection` and `useCollectionIds` already handle demo mode
- New `useQuery` calls must also check `isDemoMode` and return mock data

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `src/components/providers/query-provider.tsx` — existing QueryProvider config (don't change)
- `src/hooks/useCollection.ts` — existing React Query pattern to match
- `src/hooks/useCollectionIds.ts` — lightweight ID-only pattern
- `src/app/strains/page.tsx` — primary target: replace useEffect at lines 195-254
- `src/app/collection/CollectionPageClient.tsx` — verify React Query usage
- `src/app/strains/[slug]/StrainDetailPageClient.tsx` — convert to useQuery
- `src/components/social/follow-button.tsx` — follow mutation invalidation

</canonical_refs>

<specifics>
## Specific Notes from Codebase

### Strains Page Current Pattern (lines 195-254)
```typescript
useEffect(() => {
  if (!sourceOverridesReady) return;
  async function fetchData() {
    setLoading(true);
    // supabase.from("strains").select("*")
    // also fetches user_collection for source overrides
    setStrains(normalizedStrains);
  }
  fetchData();
}, [user, isDemoMode, sourceOverridesReady, activeTab]);
```

### Existing React Query Pattern (useCollection.ts)
```typescript
const collectionQuery = useQuery({
  queryKey: ["collection", user?.id],
  queryFn: async () => { /* fetch */ },
});
```

### QueryProvider Config (don't change)
- staleTime: 60s
- gcTime: 5min
- retry: 1
- refetchOnWindowFocus: true

</specifics>

<deferred>
## Deferred Ideas

None — all items in scope for Phase 1

</deferred>
