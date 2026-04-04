# Phase 2: React Query Advanced - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 completes the React Query core migration (Collection page) and adds advanced features: optimistic updates for follow/unfollow and infinite scroll for the strains list.

**Included:**
- RQ-04: Collection page uses React Query with consistent query keys
- RQ-05: Collect/uncollect invalidates collection queries
- RQ-16: Infinite scroll / cursor pagination for strains
- RQ-18: Optimistic updates for follow/unfollow

**Explicitly deferred to Phase 3+:**
- RQ-15: Prefetch strain details on hover (complexity vs. benefit)
- RQ-17: Offline support via persistence (significant complexity, low priority for browse app)

</domain>

<decisions>
## Implementation Decisions

### Collection Page (RQ-04/RQ-05)
- `CollectionPageClient.tsx` already uses `useCollection` hook with React Query
- Task: Verify it uses `['collection', userId]` as query key — align to centralized query-keys.ts if not
- Collect/uncollect mutations already invalidate correctly via existing hooks
- No structural change needed — just verification and alignment

### Optimistic Follow/Unfollow (RQ-18)
- FollowButton currently invalidates queries after server response (Phase 1 conversion)
- Add optimistic UI: set UI state immediately on click, rollback on error
- Pattern mirrors existing optimistic updates in useCollection hook (Phase 1)
- On error: show toast/alert and revert button state

### Infinite Scroll (RQ-16)
- Replace current pagination (`keepPreviousData`) with infinite scroll using `useInfiniteQuery`
- Strain list should load more items as user scrolls down
- Keep existing filter state — filters reset the infinite scroll
- Loading state: show skeleton cards at bottom while fetching
- Empty state when all items loaded

### Deferred
- Prefetch on Hover (RQ-15): Too complex for marginal UX gain
- Offline Support (RQ-17): Would need write queue management — not critical for browse app

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### React Query Patterns
- `src/lib/query-keys.ts` — centralized query key factories (Phase 1)
- `src/components/providers/query-provider.tsx` — existing QueryProvider config
- `src/hooks/useCollection.ts` — existing optimistic update pattern to mirror

### Files to Modify
- `src/app/collection/CollectionPageClient.tsx` — verify/align query keys
- `src/components/social/follow-button.tsx` — add optimistic updates
- `src/app/strains/page.tsx` — convert to infinite scroll with useInfiniteQuery

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useCollection` hook: Shows optimistic update pattern (cancel, rollback on error)
- `strainKeys.list(filters)` from query-keys.ts for strain list queries
- Existing skeleton loading on strains page — reusable for infinite scroll bottom loading

### Established Patterns
- Query invalidation after mutations (Phase 1 patterns)
- Demo mode handling in useCollection
- keepPreviousData currently used for pagination — replace with infinite scroll

### Integration Points
- Strains page → infinite query connects to filter state
- FollowButton → optimistic update needs rollback on error (toast notification)

</code_context>

<specifics>
## Specific Notes

### Optimistic Follow Pattern (from useCollection.ts)
```typescript
// Cancel + rollback on error pattern exists:
onMutate: async () => { cancel(queryClient); /* snapshot */ },
onError: (err, vars, context) => { rollback(context); }
```

### Infinite Query Pattern
```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: strainKeys.list(filters),
  queryFn: fetchPage,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

</specifics>

<deferred>
## Deferred Ideas

### Phase 3+ (Future)
- **RQ-15: Prefetch on hover** — Race-condition-safe implementation is complex; current detail loading is fast enough
- **RQ-17: Offline support** — Would require write queue ( mutations that happened offline need sync on reconnect); significant complexity for a browse-focused app

</deferred>

---

*Phase: 02-react-query-advanced*
*Context gathered: 2026-04-04*
