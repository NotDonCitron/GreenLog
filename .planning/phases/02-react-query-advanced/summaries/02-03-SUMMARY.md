---
phase: 02-react-query-advanced
plan: "03"
status: complete
completed: "2026-04-04"
wave: 2
---

## Plan 02-03: FollowButton Optimistic Updates

**Objective:** Add optimistic updates to FollowButton — UI updates immediately on click, reverts on error.

### Changes Made

**Task 1: Add optimistic status snapshot**
- Added `useRef` import
- Added `previousStatusRef = useRef<FollowStatus | null>(null)` — tracks previous status for rollback
- Saved `previousStatusRef.current = computedStatus` at the START of handleFollow before any async work

**Task 2: Apply optimistic UI update immediately**
- Added `optimisticStatus` state: `useState<FollowStatus | null>(null)`
- Modified `computedStatus` to use `optimisticStatus ?? fetchedStatus ?? initialStatus`
- Added optimistic updates in each mutation block:
  - Unfollow: `setOptimisticStatus({ ...computedStatus, is_following: false })`
  - Cancel request: `setOptimisticStatus({ ...computedStatus, has_pending_request: false })`
  - Follow (public): `setOptimisticStatus({ ...computedStatus, is_following: true, has_pending_request: false })`
  - Follow request (private): `setOptimisticStatus({ ...computedStatus, has_pending_request: true, is_following: false })`
- Demo mode clears optimistic status on complete

**Task 3: Add rollback on error with alert**
- In catch block: `setOptimisticStatus(previousStatusRef.current)` to rollback
- Added `alert("Aktion fehlgeschlagen. Bitte versuche es erneut.")` in catch block
- Success paths call `setOptimisticStatus(null)` to confirm the change

### Verification

| Criterion | Evidence |
|-----------|----------|
| `previousStatusRef` tracks previous status | grep: "previousStatusRef" ✓ |
| `optimisticStatus` state added | grep: "optimisticStatus" ✓ |
| Unfollow applies optimistic update | grep in handleFollow ✓ |
| Follow applies optimistic update | grep in handleFollow ✓ |
| Rollback on error | `setOptimisticStatus(previousStatusRef.current)` in catch ✓ |
| Error alert shown | `alert(...)` in catch ✓ |
| Success clears optimistic status | `setOptimisticStatus(null)` in success paths ✓ |

### Self-Check
No issues found. All 3 tasks complete.

### Files Modified
- `src/components/social/follow-button.tsx`
