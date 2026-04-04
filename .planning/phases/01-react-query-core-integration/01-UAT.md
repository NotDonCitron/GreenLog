---
status: testing
phase: 01-react-query-core-integration
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
  - 01-05-SUMMARY.md
  - 01-06-SUMMARY.md
started: 2026-04-04T07:00:00Z
updated: 2026-04-04T07:00:00Z
---

## Current Test

number: 1
name: Strains page filter refetch
expected: |
  Visit /strains. Change a filter (e.g., THC range, flavor, or source tab).
  The list should automatically refetch and show filtered results.
awaiting: user response

## Tests

### 1. Strains page filter refetch
expected: |
  Visit /strains. Change a filter (e.g., THC range, flavor, or source tab).
  The list should automatically refetch and show filtered results.
result: [pending]

### 2. Strains page demo mode
expected: |
  When Supabase is not connected (demo mode), /strains loads with mock strains
  (Gorilla Glue #4, Sour Diesel, Blue Dream) without errors.
result: [pending]

### 3. Strain detail page loading (no crash)
expected: |
  Visit a strain detail page (e.g., /strains/gorilla-glue).
  The page loads and displays strain information via useQuery.
result: [pending]

### 4. Strain detail page invalid slug (no crash)
expected: |
  Visit /strains/invalid-slug-12345. The page shows "Strain not found" UI
  instead of crashing with "TypeError: can't access property image_url".
result: [pending]

### 5. Rating invalidates strain cache
expected: |
  On a strain detail page, rate the strain. After saving,
  the UI reflects the new rating immediately without a full page refresh.
result: [pending]

### 6. FollowButton fetches status via useQuery
expected: |
  Visit a profile page with a FollowButton.
  The button correctly shows "Following", "Follow", or "Requested" based on actual relationship.
result: [pending]

### 7. Follow mutations invalidate queries
expected: |
  Follow someone from their profile. After confirming,
  the button immediately shows "Following" and any follower counts update.
result: [pending]

### 8. Unfollow invalidates follow-status query
expected: |
  Click "Following" to unfollow a user. The button immediately reverts to "Follow"
  (not stuck on "Following" due to stale cache).
result: [pending]

### 9. FollowButton unfollow — verify against old bug
expected: |
  Click "Following" on an already-followed user. The button should immediately show "Follow"
  not stay stuck as "Following". Previously broken — verify fix works.
result: [pending]

### 10. Strains page skeleton loading
expected: |
  On /strains, while strains are loading,
  skeleton placeholder cards appear in the grid.
result: [pending]

### 11. Strains page error with retry
expected: |
  If loading /strains fails, an error message appears
  with a Retry button that reloads the data when clicked.
result: [pending]

### 12. Strain detail skeleton loading
expected: |
  On a strain detail page, while loading,
  skeleton placeholders appear matching the card layout.
result: [pending]

### 13. Strain detail error with retry
expected: |
  If loading a strain detail fails, an error message appears
  with a Retry button and a back button to navigate away.
result: [pending]

### 14. Progress counter shows stable total
expected: |
  On /strains with infinite scroll, the progress counter shows collectedIds.length / totalCount
  (e.g. 5 / 470). As you scroll and more strains load, the denominator stays stable
  (not growing with loaded strains).
result: [pending]

## Summary

total: 14
passed: 0
issues: 0
pending: 14
skipped: 0
blocked: 0

## Gaps

[none yet]
