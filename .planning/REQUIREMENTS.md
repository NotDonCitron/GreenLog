# Requirements: GreenLog — React Query Integration

**Defined:** 2026-04-04
**Core Value:** Reliable strain data management with fast, consistent UI — mutations reflect immediately everywhere via centralized cache invalidation.

## v1 Requirements

### React Query — Strains Page

- [ ] **RQ-01**: Strains page (`src/app/strains/page.tsx`) fetches strain list via `useQuery(['strains', filters])` instead of `useEffect + supabase.from`
- [ ] **RQ-02**: Filter changes (flavor, THC, CBD) update query key → automatic refetch
- [ ] **RQ-03**: Pagination via React Query `keepPreviousData` to prevent layout flash

### React Query — Collection Page

- [ ] **RQ-04**: Collection page uses `useQuery(['collection', userId])` with existing `useCollection` hook pattern
- [ ] **RQ-05**: Collection mutations (collect/uncollect) invalidate `['collection', userId]` and `['collection-ids', userId]`

### React Query — Strain Detail

- [ ] **RQ-06**: Strain detail fetches via `useQuery(['strain', slug])`
- [ ] **RQ-07**: Rating mutations invalidate `['strain', slug]`
- [ ] **RQ-08**: User relation mutations (favorite, wishlist) invalidate `['strain', slug]`

### React Query — Social

- [ ] **RQ-09**: Follow button mutations invalidate `['following', userId]` and `['followers', targetUserId]`
- [ ] **RQ-10**: Follow requests invalidate `['follow-requests']`

### React Query — Cross-Cutting

- [ ] **RQ-11**: All pages show consistent loading states (skeleton/shimmer) during `isLoading`
- [ ] **RQ-12**: All pages show consistent error states with retry option during `isError`
- [x] **RQ-13**: Query keys defined in central `src/lib/query-keys.ts` for consistency
- [ ] **RQ-14**: No regression in demo mode (simulated data without Supabase)

## v2 Requirements

### Performance

- **RQ-15**: Prefetch strain details on hover (race condition safe)
- **RQ-16**: Infinite scroll / cursor pagination for strain list

### Advanced

- **RQ-17**: Offline support via React Query persistence
- **RQ-18**: Optimistic updates for follow/unfollow (already done for collect)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full migration of all pages | MVP stable — only pages with active development need React Query |
| Server Components | Pages Router doesn't support them |
| Real-time WebSocket sync | Using 30s polling — not blocking |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RQ-01 | Phase 1 | Pending |
| RQ-02 | Phase 1 | Pending |
| RQ-03 | Phase 1 | Pending |
| RQ-04 | Phase 1 | Pending |
| RQ-05 | Phase 1 | Pending |
| RQ-06 | Phase 1 | Pending |
| RQ-07 | Phase 1 | Pending |
| RQ-08 | Phase 1 | Pending |
| RQ-09 | Phase 1 | Pending |
| RQ-10 | Phase 1 | Pending |
| RQ-11 | Phase 1 | Pending |
| RQ-12 | Phase 1 | Pending |
| RQ-13 | Phase 1 | Complete |
| RQ-14 | Phase 1 | Pending |
| RQ-15 | Phase 2 | Pending |
| RQ-16 | Phase 2 | Pending |
| RQ-17 | Phase 2 | Pending |
| RQ-18 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after initial definition*
