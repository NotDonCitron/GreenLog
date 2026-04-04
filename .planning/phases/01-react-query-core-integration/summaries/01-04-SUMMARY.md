---
phase: 01-react-query-core-integration
plan: "04"
status: complete
started_at: "2026-04-04T03:29:28Z"
completed_at: "2026-04-04T03:40:00Z"
duration_seconds: 632
requirements:
  - RQ-09
  - RQ-10
  - RQ-14
commits:
  - hash: a9298c3
    type: feat
    message: "feat(01-04): convert FollowButton to useQuery with cache invalidation"
files_modified:
  - src/components/social/follow-button.tsx
---

# Phase 01 Plan 04: FollowButton React Query Integration

## Objective
Convert FollowButton component from useEffect-based status fetching to useQuery. Add proper cache invalidation for follow and follow-request mutations.

## Summary
FollowButton now uses React Query's `useQuery` for fetching follow status when `initialStatus` is not provided. Follow/unfollow mutations properly invalidate the following/followers query caches. Follow request mutations invalidate the follow-requests cache. Demo mode works without Supabase calls.

## One-liner
FollowButton fetches follow status via useQuery with proper cache invalidation for related queries

## Key Changes

### src/components/social/follow-button.tsx

**Imports Added:**
- `useQuery`, `useQueryClient` from `@tanstack/react-query`
- `followingKeys`, `followersKeys`, `followRequestsKeys` from `@/lib/query-keys`

**State Changes:**
- Removed `status` state (replaced with `computedStatus`)
- Removed `isInitialized` state (no longer needed)
- Added `queryClient` via `useQueryClient()` hook

**useQuery Conversion:**
- useEffect at lines 45-96 replaced with `useQuery` hook
- Query key: `['follow-status', userId]`
- Query fn fetches profile visibility and follow status
- `enabled: !!user && !initialStatus && !isDemoMode` - only runs when needed
- `staleTime: 30 * 1000` - 30 second stale time

**Computed Status:**
```typescript
const computedStatus: FollowStatus = fetchedStatus ?? {
  is_following: initialStatus?.is_following ?? false,
  is_following_me: initialStatus?.is_following_me ?? false,
  has_pending_request: initialStatus?.has_pending_request ?? false,
};
```

**Mutation Invalidation:**
- Unfollow: `followingKeys.list(user.id)` and `followersKeys.list(userId)`
- Cancel request: `followRequestsKeys.list()`
- Follow (public): `followingKeys.list(user.id)` and `followersKeys.list(userId)`
- Follow request (private): `followRequestsKeys.list()`

**Demo Mode:**
- Added early return in `handleFollow` when `isDemoMode` is true
- No Supabase calls made in demo mode

## Verification

### Automated Verification
```bash
grep -n "useQuery\|followingKeys\|followersKeys\|followRequestsKeys\|invalidateQueries" src/components/social/follow-button.tsx
```
Result: All required patterns found

### Truths Verified
- FollowButton fetches follow status via useQuery (when initialStatus not provided)
- Follow mutations invalidate ['following', userId] and ['followers', targetUserId]
- Follow request mutations invalidate ['follow-requests']
- Demo mode works without Supabase connection
- isInitialized state removed (no longer needed)

## Deviation from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Keep render condition check `!fetchedStatus && !initialStatus && !!user) && !isDemoMode` | Ensures button doesn't render until data is available or in demo mode |
| Use `['follow-status', userId]` as query key | Simple instance-specific key, not shared across components |
| 30 second stale time | Follow status changes relatively frequently |
| Keep router.refresh() alongside invalidation | Fallback mechanism, doesn't hurt to have both |

## Metrics
| Metric | Value |
|--------|-------|
| Duration | 632 seconds |
| Tasks Completed | 1 |
| Files Modified | 1 |
| Lines Changed | +58, -46 |

## Dependencies
- Phase 01 plan 01 (query-keys.ts centralized)
- React Query Provider already in tree

## Next Steps
- Phase 01 plan 05 (if any)
- Other social components could use similar pattern

---

*Created: 2026-04-04*
