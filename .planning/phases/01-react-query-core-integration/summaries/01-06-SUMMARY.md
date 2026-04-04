---
phase: 01-react-query-core-integration
plan: '06'
subsystem: ui
tags: [react-query, null-guard, cache-invalidation, tanstack]

# Dependency graph
requires:
  - phase: 01-react-query-core-integration
    provides: React Query Provider, useCollection hooks, centralized query-keys
provides:
  - Defensive null guard on strain detail page
  - FollowButton follow-status cache invalidation on unfollow
  - Stable totalCount denominator in strains page progress counter
affects: [02-react-query-advanced]

# Tech tracking
tech-stack:
  added: []
  patterns: [defensive null check, query invalidation after mutation]

key-files:
  modified:
    - src/app/strains/[slug]/StrainDetailPageClient.tsx
    - src/components/social/follow-button.tsx
    - src/app/strains/page.tsx

key-decisions:
  - "fetchStrains returns totalCount from Supabase count, stored in component state via useEffect"

patterns-established:
  - "Mutation handlers invalidate both list and status query keys for consistency"

requirements-completed: [RQ-01, RQ-09]

# Metrics
duration: 8min
completed: 2026-04-04
---

# Phase 01-react-query-core-integration, Plan 06 Summary

**3 UAT gap closures: strain detail null guard, FollowButton cache invalidation, progress counter totalCount**

## Performance

- **Duration:** ~8 min
- **Completed:** 2026-04-04
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- BLOCKER fixed: strain detail page shows "Strain not found" UI instead of crashing when slug is invalid (defensive `!strain` guard added to existing `!detailData?.strain` check)
- MAJOR fixed: FollowButton now invalidates `['follow-status', userId]` query after unfollow success, preventing stale cache from reverting UI to "Following"
- MINOR fixed: strains page progress counter now shows stable catalog total (e.g. `5 / 470`) instead of growing denominator as more strains are loaded

## Task Commits

Each task committed atomically:

1. **Task 1: Gap 1 — strain null guard** - `94f3ca0` (fix)
2. **Task 2: Gap 2 — FollowButton invalidation** - `63583cb` (fix)
3. **Task 3: Gap 3 — totalCount progress counter** - `91c9ced` (fix)

## Files Created/Modified

- `src/app/strains/[slug]/StrainDetailPageClient.tsx` - Added `!strain` to early-return guard (line 496)
- `src/components/social/follow-button.tsx` - Added `queryClient.invalidateQueries({ queryKey: ['follow-status', userId] })` after unfollow success
- `src/app/strains/page.tsx` - Updated `fetchStrains` return type to include `totalCount`, added `totalStrainCount` state + useEffect + updated progress counter denominator

## Decisions Made

- None - plan executed exactly as written. All three gaps were independent and addressed with minimal, targeted changes per the plan specification.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

Phase 01 (react-query-core-integration) plan 06 complete. All gap_closure tasks for this plan executed and committed atomically.

---
*Phase: 01-react-query-core-integration*
*Plan: 06*
*Completed: 2026-04-04*
