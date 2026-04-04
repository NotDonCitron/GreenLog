# Roadmap: GreenLog — React Query Integration

**Phase count:** 2 | **Requirements:** 14 v1 + 4 v2 | **Generated:** 2026-04-04

## Phase 1: React Query Core Integration

**Goal:** Replace all `useEffect + supabase.from` patterns with `useQuery`, add centralized query keys and consistent invalidation.

**Plans:** 5/5 plans executed

### Plans:

- [x] 01-01-PLAN.md — Create centralized query-keys.ts
- [x] 01-02-PLAN.md — Convert strains page to useQuery
- [x] 01-03-PLAN.md — Convert strain detail page to useQuery
- [x] 01-04-PLAN.md — Convert FollowButton to useQuery with cache invalidation
- [x] 01-05-PLAN.md — Consistent loading/error states across pages

### Requirements (RQ-01 — RQ-14)

| ID | Requirement |
|----|-------------|
| RQ-01 | Strains page fetches via useQuery |
| RQ-02 | Filter changes trigger refetch via query key |
| RQ-03 | Pagination via keepPreviousData |
| RQ-04 | Collection page uses useQuery |
| RQ-05 | Collect/uncollect invalidates collection queries |
| RQ-06 | Strain detail fetches via useQuery |
| RQ-07 | Rating mutations invalidate strain queries |
| RQ-08 | User relation mutations invalidate strain queries |
| RQ-09 | Follow mutations invalidate follow queries |
| RQ-10 | Follow requests invalidate follow-requests |
| RQ-11 | Consistent loading states (skeleton/shimmer) |
| RQ-12 | Consistent error states with retry |
| RQ-13 | Centralized query-keys.ts |
| RQ-14 | No demo mode regression |

### Success Criteria

1. Strains page (`/strains`) loads via `useQuery(['strains', filters])` — no useEffect pattern
2. Collection page (`/collection`) uses `useQuery(['collection', userId])` — existing hooks still work
3. Strain detail (`/strains/[slug]`) loads via `useQuery(['strain', slug])`
4. Collect button → collection queries invalidated + UI updates within 1 second
5. Follow button → follow queries invalidated + feed updates
6. All pages show skeleton loading states during fetch
7. All pages show error state with retry button on failure
8. `src/lib/query-keys.ts` exports all query key factories
9. Demo mode (no Supabase) works without errors

---

## Phase 2: React Query Advanced

**Goal:** Prefetching, infinite scroll, offline support.

**Plans:** 0/3 plans ready

### Plans:

- [ ] 02-01-PLAN.md — Verify Collection page React Query (RQ-04, RQ-05)
- [ ] 02-02-PLAN.md — Infinite scroll for strains list (RQ-16)
- [ ] 03-01-PLAN.md — Optimistic updates for follow/unfollow (RQ-18)

### Requirements (RQ-15 — RQ-18)

| ID | Requirement |
|----|-------------|
| RQ-15 | Prefetch strain details on hover |
| RQ-16 | Infinite scroll / cursor pagination for strains |
| RQ-17 | Offline support via persistence |
| RQ-18 | Optimistic updates for follow/unfollow |

### Phase 2 Success Criteria

1. Collection page verified using useQuery with centralized query keys
2. Strains list uses `useInfiniteQuery` for cursor pagination
3. User scrolls down → more strains load automatically
4. Filter changes → infinite scroll resets to first page
5. Follow button updates immediately on click (optimistic)
6. Follow error → button reverts, user sees error alert
7. Demo mode continues to work without errors

---

## Out of Scope

| Item | Reason |
|------|--------|
| Grows/Eigenanbau-Tracker | Legal clarification in Germany pending |
| PWA / App-Store | Not started, deferred post-React-Query |
| Real-time WebSocket | 30s polling sufficient for MVP |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RQ-01, RQ-02, RQ-03, RQ-14 | Phase 1 | Done (01-02) |
| RQ-04 — RQ-05 | Phase 1 | Done (verify in 02-01) |
| RQ-06, RQ-07, RQ-08 | Phase 1 | Done (01-03) |
| RQ-09, RQ-10, RQ-14 | Phase 1 | Done (01-04) |
| RQ-11, RQ-12 | Phase 1 | Done (01-05) |
| RQ-13 | Phase 1 | Done (01-01) |
| RQ-15 | Phase 2+ | Deferred |
| RQ-16 | Phase 2 | Planned (02-02) |
| RQ-17 | Phase 2+ | Deferred |
| RQ-18 | Phase 2 | Planned (02-03) |

**Overall v1 coverage:** 14/14 requirements mapped ✓
**Phase 2 coverage:** 2/4 requirements planned (R-15, R-17 deferred)
