---
status: investigating
trigger: "Collection UI aktualisiert nicht nach Mutation - Badge Check laeuft mit 409"
created: 2026-04-03T12:00:00Z
updated: 2026-04-03T14:30:00Z
---

## Current Focus

**Investigating:** Collection UI doesn't update after mutation succeeds

hypothesis: "The onMutate/onSettled callbacks in useCollection.ts capture user?.id at callback definition time. If user is null at definition but not at execution (or vice versa), the queryKey becomes malformed and invalidation fails."

test: "Trace the exact flow of hasCollected state in StrainDetailPageClient and verify toggleCollect properly invalidates queries"

expecting: "find_root_cause: why setHasCollected(true) doesn't update UI"

next_action: "Complete root cause analysis and provide fix"

## Symptoms

expected: After clicking "Collect & Rate" and saving, the button should show "In Collection"
actual: Button still shows "Collect & Rate" after save. After hard refresh (Ctrl+Shift+R), it shows correctly
errors:
  - Badge check returns 409 (already exists) - but this is expected behavior per badges.ts line 262
reproduction: "1. Go to strain detail page, 2. Click Collect & Rate, 3. Fill in ratings and save, 4. Button still shows Collect & Rate"
started: Unknown - possibly after recent collection hooks refactoring

## Eliminated

- hypothesis: "toggleCollect doesn't call mutateAsync - WRONG, it does call mutateAsync"
  evidence: "useCollection.ts line 165: collect calls collectMutation.mutateAsync"

- hypothesis: "mutateAsync doesn't trigger onSettled callbacks - WRONG, it does"
  evidence: "TanStack Query mutateAsync DOES trigger onSettled after mutation completes"

- hypothesis: "Badge check 409 causes toggleCollect to throw - WRONG, badge check is fire-and-forget with .catch(() => {})"
  evidence: "badges.ts line 118: checkAndUnlockBadges(...).catch(() => {}) - errors are swallowed"

- hypothesis: "idsQuery.data is stale when toggleCollect is called"
  evidence: "toggleCollect awaits mutateAsync, so any previous invalidation should complete first"

## Evidence

- timestamp: 2026-04-03T13:00:00Z
  checked: "src/hooks/useCollection.ts - toggleCollect implementation"
  found: "toggleCollect is useCallback wrapping async function that calls collectMutation.mutateAsync or uncollectMutation.mutateAsync"
  found: "mutateAsync DOES trigger onMutate (before mutationFn) and onSettled (after mutationFn resolves/rejects)"
  implication: "Query invalidation SHOULD happen after mutation completes"

- timestamp: 2026-04-03T13:30:00Z
  checked: "src/app/strains/[slug]/StrainDetailPageClient.tsx - saveRating and hasCollected state"
  found: "saveRating calls setHasCollected(true) BEFORE calling toggleCollect (line 386-387)"
  found: "Component uses LOCAL hasCollected useState, NOT collectedIds from useCollection hook"
  found: "hasCollected is initialized from useEffect that queries Supabase directly (not React Query)"
  implication: "If setHasCollected(true) is called and no re-render happens before router.refresh(), button won't update"

- timestamp: 2026-04-03T14:00:00Z
  checked: "src/lib/badges.ts - checkAndUnlockBadges implementation"
  found: "Badge check uses INSERT (not upsert) for user_badges - line 261"
  found: "409 error is PostgreSQL unique violation - badge already exists"
  found: "Error is caught and ignored: if (!insertError || insertError.code === '23505')"
  implication: "409 is NOT causing the issue - it's handled gracefully"

- timestamp: 2026-04-03T14:15:00Z
  checked: "src/hooks/useCollection.ts - sharedCallbacks closure"
  found: "onMutate captures user?.id at callback definition time (when sharedCallbacks object is created)"
  found: "onSettled also captures user?.id at definition time"
  found: "If user is null at definition but not at execution (or vice versa), queryKey is wrong"
  implication: "Potential closure issue causing invalidation to target wrong query key"

- timestamp: 2026-04-03T14:30:00Z
  checked: "src/hooks/useCollection.ts - onMutate parameter mismatch"
  found: "onMutate callback signature is (strainId, optimisticUpdate) but useMutation passes (variables, context)"
  found: "In toggleCollect, strainId passed to onMutate is actually the full {strainId, opts} object"
  found: "But sharedCallbacks.onMutate correctly uses variables.strainId to get the actual string"
  implication: "This is confusing but actually works correctly - strainId IS a string when used"

## Root Cause Analysis

**Current Hypothesis: Closure capturing stale user?.id in callbacks**

In useCollection.ts, `sharedCallbacks` object is created inside the `useCollection` function. This means `onMutate` and `onSettled` are created on every render when `user` might have a different value.

```javascript
const sharedCallbacks = {
  onMutate: async (strainId, optimisticUpdate) => {
    await queryClient.cancelQueries({ queryKey: ["collection-ids", user?.id] }); // user?.id captured HERE
    const previousIds = queryClient.getQueryData<string[]>(["collection-ids", user?.id]);
    queryClient.setQueryData<string[]>(["collection-ids", user?.id], optimisticUpdate);
    return { previousIds };
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["collection", user?.id] }); // user?.id captured HERE
    queryClient.invalidateQueries({ queryKey: ["collection-ids", user?.id] });
    // ...
  },
};
```

If `user` changes between renders, the callbacks still reference the OLD `user?.id` value.

**However**, in `toggleCollect`:
```javascript
const toggleCollect = useCallback(
  async (strainId: string, opts?: CollectOptions) => {
    const ids = idsQuery.data ?? [];
    if (ids.includes(strainId)) {
      await uncollectMutation.mutateAsync({ strainId });
    } else {
      await collectMutation.mutateAsync({ strainId, opts });
    }
  },
  [idsQuery.data, collectMutation, uncollectMutation]
);
```

The `collectMutation` and `uncollectMutation` are created with `user!.id` in their queryKeys at render time. Since `toggleCollect` depends on these mutations, it should be recreated when `user` changes.

**But the callbacks themselves are on `sharedCallbacks`, which is NOT wrapped in useCallback!**

So when `onMutate` or `onSettled` runs, it might be using a stale `user?.id`.

**The REAL Issue:**

The issue is likely that `StrainDetailPageClient` uses LOCAL `hasCollected` state, NOT `collectedIds` from `useCollection`.

After `saveRating` calls `setHasCollected(true)`, if `router.refresh()` causes a re-render that triggers the `useEffect` before React renders the component with `hasCollected=true`, the effect might reset `hasCollected`.

But `router.refresh()` is asynchronous and `saveRating` awaits `toggleCollect` first, so `hasCollected` should be set before `router.refresh()`.

**Actually**, looking at `saveRating` more carefully:
```javascript
const { error: collectionError } = await supabase.from("user_collection").upsert({...});
if (collectionError) throw collectionError;

setHasCollected(true);
await toggleCollect(strain.id, { batchInfo, userNotes });
setTimeout(() => { router.refresh(); }, 0);
```

`setHasCollected(true)` is called SYNCHRONously. React batches this. Then `toggleCollect` is awaited. Then `router.refresh()` is scheduled.

The `setHasCollected(true)` should cause a re-render BEFORE `toggleCollect` completes (since toggleCollect awaits async operations).

Unless React is re-rendering in an unexpected order.

**Alternative Hypothesis: toggleCollect is throwing**

If `toggleCollect` throws (maybe due to badge check error somehow propagating?), `saveRating` would throw and `setHasCollected(true)` would have been called but... wait, `setHasCollected` is BEFORE `toggleCollect` in the code.

If `toggleCollect` throws, `saveRating` throws. The outer try-catch doesn't catch it because `toggleCollect` is AFTER the try block.

This would be an unhandled rejection. But the user doesn't report any error.

**Most Likely Root Cause:**

The `router.refresh()` is problematic. Even though it's after `await toggleCollect`, if something goes wrong during the refresh, it could cause issues.

But more importantly: the component uses LOCAL `hasCollected` state instead of the data from `useCollection`. This is the architectural issue.

The FIX should be: use `collectedIds.includes(strain.id)` from `useCollection` directly, instead of local `hasCollected` state.

## Resolution

root_cause: "Component uses local hasCollected useState instead of collectedIds from useCollection hook. Also, router.refresh() may cause unexpected re-renders."

fix: "Replace local hasCollected state with derived state from useCollection hook: const { collectedIds } = useCollection(); const hasCollected = collectedIds.includes(strain.id)"

files_changed: []
verification: ""
