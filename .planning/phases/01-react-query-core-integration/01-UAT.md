---
status: resolved
phase: 01-react-query-core-integration
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
  - 01-05-SUMMARY.md
started: 2026-04-04T06:30:00Z
updated: 2026-04-04T06:35:00Z
---

## Current Test

number: 8
name: Strains page error with retry
expected: |
  If loading /strains fails, an error message appears
  with a Retry button that reloads the data when clicked.
awaiting: user response

## Tests

### 1. Strains page filter refetch
expected: Visit /strains. Change a filter (e.g., THC range, flavor, or source tab).
The list should automatically refetch and show filtered results.
result: issue
reported: "filtering works, but progress counter shows collected/loaded and grows as you scroll. Should always show collected/total (e.g., 5/470), not collected/loaded"
severity: minor

### 2. Strains page demo mode
expected: When Supabase is not connected (demo mode), /strains loads with mock strains
(Gorilla Glue #4, Sour Diesel, Blue Dream) without errors.
result: pass

### 3. Strain detail page loading
expected: Visit a strain detail page (e.g., /strains/gorilla-glue).
The page loads and displays strain information via useQuery.
result: issue
reported: "TypeError: can't access property image_url, strain is null — page crashes"
severity: blocker

### 4. Rating invalidates strain cache
expected: On a strain detail page, rate the strain. After saving,
the UI reflects the new rating immediately without a full page refresh.
result: blocked
blocked_by: prior-phase
reason: Cannot test — strain detail page crashes on load (test 3)

### 5. FollowButton fetches status via useQuery
expected: Visit a profile page with a FollowButton.
The button correctly shows "Following", "Follow", or "Requested" based on actual relationship.
result: pass

### 6. Follow mutations invalidate queries
expected: Follow someone from their profile. After confirming,
the button immediately shows "Following" and any follower counts update.
result: issue
reported: "clicking Following button doesn't unfollow — button stays as Following after clicking"
severity: major

### 7. Strains page skeleton loading
expected: On /strains, while strains are loading,
skeleton placeholder cards appear in the grid.
result: pass

### 8. Strains page error with retry
expected: If loading /strains fails, an error message appears
with a Retry button that reloads the data when clicked.
result: skipped
reason: don't know how to trigger load failure

### 9. Strain detail skeleton loading
expected: On a strain detail page, while loading,
skeleton placeholders appear matching the card layout.
result: [pending]

### 10. Strain detail error with retry
expected: If loading a strain detail fails, an error message appears
with a Retry button and a back button to navigate away.
result: [pending]

## Summary

total: 10
passed: 2
issues: 3
pending: 4
skipped: 0
blocked: 1

## Gaps

- truth: "Progress counter shows collected/total strains (e.g., 5/470), not collected/loaded so far"
  status: resolved
  reason: "Fixed in 91c9ced — fetchStrains now returns totalCount, stored in totalStrainCount state, denominator updated"
  severity: minor
  test: 1
  resolution: "src/app/strains/page.tsx lines 92, 342, 407"

- truth: "Strain detail page loads without crashing"
  status: resolved
  reason: "Fixed in 94f3ca0 — Added !strain to early-return guard at line 496"
  severity: blocker
  test: 3
  resolution: "src/app/strains/[slug]/StrainDetailPageClient.tsx line 496"

- truth: "Clicking Following button unfollows the user and button reverts to Follow"
  status: resolved
  reason: "Fixed in 63583cb — Added invalidateQueries for ['follow-status', userId] after unfollow success at line 136"
  severity: major
  test: 6
  resolution: "src/components/social/follow-button.tsx line 136"
