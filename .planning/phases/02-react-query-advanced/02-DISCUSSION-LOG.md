# Phase 2: React Query Advanced - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 02-react-query-advanced
**Areas discussed:** Collection Page, Optimistic Follow, Infinite Scroll, Prefetch on Hover, Offline Support

---

## Area 1: Collection Page (RQ-04/RQ-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Verify + align | Check CollectionPageClient uses query-keys.ts, align if needed | ✓ |
| Full rewrite | Rewrite to new pattern regardless of existing | |

**User's choice:** Verify + align (minimal change, existing hook works)
**Notes:** Collection page already uses useCollection with React Query — just needs alignment to query-keys.ts

---

## Area 2: Optimistic Follow/Unfollow (RQ-18)

| Option | Description | Selected |
|--------|-------------|----------|
| Add optimistic | Follow button shows result immediately, rollback on error | ✓ |
| Keep invalidation only | Keep current Phase 1 pattern (invalidate after response) | |

**User's choice:** Add optimistic updates — mirrors existing collect/uncollect pattern
**Notes:** Phase 1 did this for collect/uncollect; follow should be consistent

---

## Area 3: Infinite Scroll (RQ-16)

| Option | Description | Selected |
|--------|-------------|----------|
| Replace pagination | Use useInfiniteQuery, load more on scroll | ✓ |
| Keep pagination | Keep existing page-based navigation | |

**User's choice:** Infinite scroll — better browsing UX
**Notes:** Replaces keepPreviousData pagination pattern

---

## Area 4: Prefetch on Hover (RQ-15)

| Option | Description | Selected |
|--------|-------------|----------|
| Skip | Too complex, minimal UX gain | ✓ |
| Implement | Prefetch strain detail on card hover | |

**User's choice:** Skip — not worth the complexity
**Notes:** Deferred to Phase 3+

---

## Area 5: Offline Support (RQ-17)

| Option | Description | Selected |
|--------|-------------|----------|
| Skip | Write queue complexity too high for browse app | ✓ |
| Implement | persistQueryClient + mutation queue | |

**User's choice:** Skip — low priority
**Notes:** Deferred to Phase 3+

---

## Summary

All areas discussed and decisions made. Phase 2 scope confirmed:
- Collection Page (RQ-04/05)
- Optimistic Follow (RQ-18)
- Infinite Scroll (RQ-16)
- Prefetch on Hover → deferred
- Offline Support → deferred

