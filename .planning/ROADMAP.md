# Roadmap: GreenLog — React Query Integration

**Phase count:** 1 | **Requirements:** 14 v1 + 4 v2 | **Generated:** 2026-04-04

## Phase 1: React Query Core Integration

**Goal:** Replace all `useEffect + supabase.from` patterns with `useQuery`, add centralized query keys and consistent invalidation.

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

## Phase 2: React Query Advanced (Future)

**Goal:** Prefetching, infinite scroll, offline support.

- RQ-15: Prefetch strain details on hover
- RQ-16: Infinite scroll / cursor pagination for strains
- RQ-17: Offline support via persistence
- RQ-18: Optimistic updates for follow/unfollow

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
| RQ-01 — RQ-14 | Phase 1 | Pending |
| RQ-15 — RQ-18 | Phase 2 | Pending |

**Overall v1 coverage:** 14/14 requirements mapped ✓
