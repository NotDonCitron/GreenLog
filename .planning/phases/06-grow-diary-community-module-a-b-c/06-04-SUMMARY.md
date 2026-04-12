---
phase: 06-grow-diary-community-module-a-b-c
plan: "04"
subsystem: api
tags: [grow-diary, next-og, api-routes, supabase, kcanG]

# Dependency graph
requires:
  - phase: 06-01
    provides: Grow-diary TypeScript types and server actions
  - phase: 06-03
    provides: Grow-diary pages with plant tracking and comments
provides:
  - Harvest certificate OG image generation via next/og
  - grow_comments API (GET/POST/DELETE) for grow entry comments
  - grow_follows API (POST/DELETE) for following public grows
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - next/og ImageResponse for server-side OG image generation
    - authenticateRequest + getAuthenticatedClient for Bearer token auth
    - jsonSuccess/jsonError response helpers

key-files:
  created:
    - src/app/api/grows/[id]/harvest-report/route.tsx - OG harvest certificate
    - src/app/api/grows/[id]/comments/route.ts - Comments API
    - src/app/api/grows/[id]/follow/route.ts - Follow/unfollow API

key-decisions:
  - "Harvest certificate uses edge runtime for fast OG image generation"
  - "Comments API uses grow_entry_id (not grow_id) per schema design"
  - "Follow API verifies grow is_public before allowing follow"

patterns-established:
  - "API routes use authenticateRequest with getAuthenticatedClient"
  - "Error responses use jsonError with code and message"

requirements-completed: [GROW-08, GROW-09, GROW-14]

# Metrics
duration: 140s
completed: 2026-04-12
---

# Phase 6 Plan 4 Summary: Harvest Certificate + grow_comments + grow_follows API

**Harvest certificate OG image generation, grow_comments API, and grow_follows API routes**

## Performance

- **Duration:** 2m 20s
- **Started:** 2026-04-12T06:00:14Z
- **Completed:** 2026-04-12T06:02:34Z
- **Tasks:** 3
- **Files modified:** 3 (3 created)

## Accomplishments
- Created harvest certificate route at `/api/grows/[id]/harvest-report` using next/og ImageResponse (1200x630)
- Created grow_comments API with GET (by entry_id), POST (create), DELETE (by comment_id with ownership check)
- Created grow_follows API with POST (follow public grow) and DELETE (unfollow)
- All routes use Bearer token authentication via authenticateRequest helper

## Task Commits

1. **Task 1-3: All API Routes** - `78434ed` (feat)

## Files Created/Modified
- `src/app/api/grows/[id]/harvest-report/route.tsx` - OG harvest certificate with strain name, grow type, plant count, dates, yield, and KCanG disclaimer
- `src/app/api/grows/[id]/comments/route.ts` - Comments API with GET/POST/DELETE operations
- `src/app/api/grows/[id]/follow/route.ts` - Follow/unfollow API with public grow verification

## Decisions Made
- Used edge runtime for harvest certificate (fast global image generation)
- Comments API uses grow_entry_id as primary lookup key (not grow_id) per schema
- Follow API checks grow.is_public before allowing follow action

## Deviations from Plan

None - plan executed exactly as written.

## Auto-fixed Issues

None - all acceptance criteria met on first implementation.

## Issues Encountered
None

## Next Phase Readiness
- All 3 API routes ready for integration with grow diary pages
- Comments API wired to grow_entries (entry_id), matching Phase 06-03 explore detail page structure

---
*Phase: 06-04*
*Completed: 2026-04-12*
