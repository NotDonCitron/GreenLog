# useCollection Hook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered collection state, fetching, and mutations across three files with a single `useCollection` hook + lightweight `useCollectionIds` hook.

**Architecture:** Two React Query hooks sharing a mutation layer. `useCollectionIds` does a cheap list-only query; `useCollection` does a full join. Both auto-subscribe to visibility changes and the event bus. Mutations use optimistic updates with rollback.

**Tech Stack:** React Query (`@tanstack/react-query`), Supabase JS client, existing `QueryProvider` already in tree.

---

## File Map

| File | Role |
|------|------|
| `src/hooks/useCollection.ts` | New — full hook with queries + mutations |
| `src/hooks/useCollectionIds.ts` | New — lightweight ID-only hook |
| `src/app/strains/page.tsx` | Modify — replace manual fetch + subscription with `useCollectionIds()` |
| `src/app/collection/CollectionPageClient.tsx` | Modify — replace manual useQuery + subscription with `useCollection()` |
| `src/app/strains/[slug]/StrainDetailPageClient.tsx` | Modify — replace manual emit + badge check with `toggleCollect()` |
| `src/lib/collection-events.ts` | Modify — add deprecation comment |

---

## Task 1: Create `src/hooks/useCollection.ts`

**Files:**
- Create: `src/hooks/useCollection.ts`
- Test: visual verification via `/collection` and `/strains` pages

- [ ] **Step 1: Create the hook file**

```typescript
// src/hooks/useCollection.ts
"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { emitCollectionUpdate } from "@/lib/collection-events";
import { checkAndUnlockBadges } from "@/lib/badges";
import type { Strain, StrainSource } from "@/lib/types";

export type CollectionStrain = Strain & {
  collected_at?: string | null;
  created_by?: string | null;
  user_notes?: string | null;
  image_url?: string;
  avg_thc?: number;
  avg_cbd?: number;
};

type CollectionRow = {
  batch_info: string | null;
  user_notes: string | null;
  user_thc_percent: number | null;
  user_cbd_percent: number | null;
  user_image_url: string | null;
  date_added: string | null;
  strain: Strain[] | Strain | null;
};

export type CollectOptions = {
  batchInfo?: string;
  userNotes?: string;
  userThc?: number;
  userCbd?: number;
  userImageUrl?: string;
};

async function fetchFullCollection(userId: string): Promise<CollectionStrain[]> {
  const { data, error } = await supabase
    .from("user_collection")
    .select(`
      batch_info,
      user_notes,
      user_thc_percent,
      user_cbd_percent,
      user_image_url,
      date_added,
      strain:strains (*)
    `)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  if (!data) return [];

  return (data as unknown as CollectionRow[]).reduce<CollectionStrain[]>((acc, item) => {
    const rawStrain = Array.isArray(item.strain) ? item.strain[0] : item.strain;
    if (!rawStrain) return acc;

    acc.push({
      ...rawStrain,
      image_url: item.user_image_url || rawStrain.image_url || undefined,
      source: (item.batch_info || rawStrain.source) as StrainSource,
      avg_thc: item.user_thc_percent ?? rawStrain.avg_thc ?? rawStrain.thc_max ?? undefined,
      avg_cbd: item.user_cbd_percent ?? rawStrain.avg_cbd ?? rawStrain.cbd_max ?? undefined,
      user_notes: item.user_notes,
      collected_at: item.date_added,
    });
    return acc;
  }, []);
}

async function fetchCollectionIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_collection")
    .select("strain_id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { strain_id: string }) => r.strain_id);
}

export function useCollection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const collectionQuery = useQuery({
    queryKey: ["collection", user?.id],
    queryFn: () => fetchFullCollection(user!.id),
    enabled: !!user,
  });

  const idsQuery = useQuery({
    queryKey: ["collection-ids", user?.id],
    queryFn: () => fetchCollectionIds(user!.id),
    enabled: !!user,
  });

  const collectMutation = useMutation({
    mutationFn: async ({ strainId, opts }: { strainId: string; opts?: CollectOptions }) => {
      const { error } = await supabase.from("user_collection").upsert({
        user_id: user!.id,
        strain_id: strainId,
        batch_info: opts?.batchInfo,
        user_notes: opts?.userNotes,
        user_thc_percent: opts?.userThc,
        user_cbd_percent: opts?.userCbd,
        user_image_url: opts?.userImageUrl,
        date_added: new Date().toISOString(),
      }, {
        onConflict: "user_id,strain_id",
      });
      if (error) throw error;
    },
    onMutate: async ({ strainId }) => {
      await queryClient.cancelQueries({ queryKey: ["collection", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["collection-ids", user?.id] });
      const previous = queryClient.getQueryData(["collection", user?.id]);
      const previousIds = queryClient.getQueryData(["collection-ids", user?.id]);
      // Optimistic insert
      queryClient.setQueryData<CollectionStrain[]>(["collection", user?.id], (old) => {
        if (!old) return old;
        return old; // full list will be refetched
      });
      queryClient.setQueryData<string[]>(["collection-ids", user?.id], (old) => {
        if (!old) return old;
        return [...new Set([...old, strainId])];
      });
      return { previous, previousIds };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["collection", user?.id], context.previous);
      }
      if (context?.previousIds) {
        queryClient.setQueryData(["collection-ids", user?.id], context.previousIds);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["collection-ids", user?.id] });
      emitCollectionUpdate();
      if (user) {
        checkAndUnlockBadges(user.id, supabase).catch(() => {});
      }
    },
  });

  const uncollectMutation = useMutation({
    mutationFn: async ({ strainId }: { strainId: string }) => {
      const { error } = await supabase
        .from("user_collection")
        .delete()
        .eq("user_id", user!.id)
        .eq("strain_id", strainId);
      if (error) throw error;
    },
    onMutate: async ({ strainId }) => {
      await queryClient.cancelQueries({ queryKey: ["collection", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["collection-ids", user?.id] });
      const previous = queryClient.getQueryData(["collection", user?.id]);
      const previousIds = queryClient.getQueryData(["collection-ids", user?.id]);
      queryClient.setQueryData<string[]>(["collection-ids", user?.id], (old) => {
        if (!old) return old;
        return old.filter((id) => id !== strainId);
      });
      return { previous, previousIds };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["collection", user?.id], context.previous);
      }
      if (context?.previousIds) {
        queryClient.setQueryData(["collection-ids", user?.id], context.previousIds);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["collection-ids", user?.id] });
      emitCollectionUpdate();
      if (user) {
        checkAndUnlockBadges(user.id, supabase).catch(() => {});
      }
    },
  });

  const collect = useCallback(
    (strainId: string, opts?: CollectOptions) => collectMutation.mutateAsync({ strainId, opts }),
    [collectMutation]
  );

  const uncollect = useCallback(
    (strainId: string) => uncollectMutation.mutateAsync({ strainId }),
    [uncollectMutation]
  );

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

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["collection", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["collection-ids", user?.id] });
  }, [queryClient, user?.id]);

  return {
    collectedIds: idsQuery.data ?? [],
    collection: collectionQuery.data ?? [],
    isLoading: collectionQuery.isLoading || idsQuery.isLoading,
    error: collectionQuery.error ?? idsQuery.error,
    count: idsQuery.data?.length ?? 0,
    collect,
    uncollect,
    toggleCollect,
    refetch,
  };
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx tsc --noEmit src/hooks/useCollection.ts 2>&1 | head -30`
Expected: No errors related to the hook (other pre-existing errors OK)

---

## Task 2: Create `src/hooks/useCollectionIds.ts`

**Files:**
- Create: `src/hooks/useCollectionIds.ts`

- [ ] **Step 1: Create the lightweight hook**

```typescript
// src/hooks/useCollectionIds.ts
"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { onCollectionUpdate } from "@/lib/collection-events";

async function fetchCollectionIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_collection")
    .select("strain_id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { strain_id: string }) => r.strain_id);
}

export function useCollectionIds() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["collection-ids", user?.id],
    queryFn: () => fetchCollectionIds(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });

  // Auto-subscribe to refresh on visibility + event bus
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["collection-ids", user.id] });
      }
    };

    const unsubscribe = onCollectionUpdate(() => {
      queryClient.invalidateQueries({ queryKey: ["collection-ids", user.id] });
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribe();
    };
  }, [queryClient, user]);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["collection-ids", user?.id] });
  };

  return {
    collectedIds: query.data ?? [],
    isLoading: query.isLoading,
    refetch,
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/hooks/useCollectionIds.ts 2>&1 | head -10`
Expected: No new errors

---

## Task 3: Migrate `src/app/strains/page.tsx`

**Files:**
- Modify: `src/app/strains/page.tsx` (remove manual fetch + subscription, add `useCollectionIds`)

**What to remove (lines ~245-260):**
```typescript
// Remove from imports: onCollectionUpdate
// Remove from imports: supabase (only used for collection fetch now)
// Remove useEffect that fetches userCollection (lines ~245-260)
// Remove visibilitychange + onCollectionUpdate subscription (lines ~274-311)
```

**What to add:**
```typescript
// Add to imports:
import { useCollectionIds } from "@/hooks/useCollectionIds";

// Replace the userCollection state + fetch + subscription with:
const { collectedIds } = useCollectionIds();

// Replace userCollection.includes(strain.id) with collectedIds.includes(strain.id)
// throughout the JSX
```

- [ ] **Step 1: Edit imports — remove `onCollectionUpdate` and `supabase` from direct imports**

Edit `src/app/strains/page.tsx`:
- Remove: `import { onCollectionUpdate } from "@/lib/collection-events";`
- Remove: `import { supabase } from "@/lib/supabase/client";`
- Add: `import { useCollectionIds } from "@/hooks/useCollectionIds";`

- [ ] **Step 2: Remove `userCollection` state and its useEffect (lines ~75-76 and ~245-260)**

Find and remove:
```typescript
const [userCollection, setUserCollection] = useState<string[]>([]);
```
And the entire useEffect that fetches from `supabase.from("user_collection")`.

- [ ] **Step 3: Remove visibilitychange + onCollectionUpdate subscription (lines ~274-311)**

Remove the useEffect containing `handleVisibilityChange` and `handleCollectionUpdate`. The hook now handles this.

- [ ] **Step 4: Add `useCollectionIds()` call inside `StrainsPageContent` function**

Add after `const router = useRouter();`:
```typescript
const { collectedIds } = useCollectionIds();
```

- [ ] **Step 5: Replace `userCollection.includes` with `collectedIds.includes`**

In the JSX map for filtered strains (around line ~496):
```typescript
const isCollected = collectedIds.includes(strain.id);
```

- [ ] **Step 6: Verify — `supabase` is no longer imported in this file**

Run: `grep -n "from \"@/lib/supabase/client\"" src/app/strains/page.tsx`
Expected: No results (supabase import removed)

- [ ] **Step 7: Visual test**

Run dev server if not running, navigate to `/strains`, verify:
- Strain cards show correct collected/uncollected state
- Right-click "Add to compare" works

---

## Task 4: Migrate `src/app/collection/CollectionPageClient.tsx`

**Files:**
- Modify: `src/app/collection/CollectionPageClient.tsx` (replace manual useQuery + subscription with `useCollection`)

**What to change:**
- Remove: `useQuery` import (will use from `useCollection`)
- Remove: `supabase` import (now inside hook)
- Remove: `useQueryClient` import (now inside hook)
- Remove: `onCollectionUpdate` import
- Remove: `SearchParamsSync` component (keep the filters, they stay local)
- Remove: the `visibilitychange` + `onCollectionUpdate` useEffect
- Remove: the manual `useQuery({ queryKey: ['collection', user?.id], ... })`
- Add: `useCollection` from `@/hooks/useCollection`

- [ ] **Step 1: Update imports**

Remove: `useQuery, useQueryClient` from `@tanstack/react-query`
Remove: `supabase` from `@/lib/supabase/client`
Remove: `onCollectionUpdate` from `@/lib/collection-events`
Add: `useCollection` from `@/hooks/useCollection`

- [ ] **Step 2: Replace the useQuery with `useCollection()`**

Replace:
```typescript
const { data: rawCollection, isLoading: loading, error } = useQuery({
  queryKey: ['collection', user?.id],
  queryFn: async () => { /* full inline fetch */ },
  enabled: !authLoading && !!user,
});
```
With:
```typescript
const { collection: rawCollection, isLoading: loading, error } = useCollection();
```

- [ ] **Step 3: Remove the visibilitychange + onCollectionUpdate useEffect**

Remove the entire useEffect (around lines 137-154) that handles:
- `handleVisibilityChange`
- `handleCollectionUpdate`
- `document.addEventListener`
- `onCollectionUpdate`

The hook now handles auto-subscription.

- [ ] **Step 4: Rename `rawCollection` to just use the destructured `collection`**

After the change, `rawCollection` is gone — it's already destructured as `collection` above. Remove any `const strains = rawCollection || []` line and use `collection` directly.

- [ ] **Step 5: Verify file compiles**

Run: `npx tsc --noEmit src/app/collection/CollectionPageClient.tsx 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 6: Visual test**

Navigate to `/collection`, verify:
- Collection items load correctly
- Count matches actual items
- Source filters work

---

## Task 5: Migrate `src/app/strains/[slug]/StrainDetailPageClient.tsx`

**Files:**
- Modify: `src/app/strains/[slug]/StrainDetailPageClient.tsx` (replace manual emit + badge + invalidation with `toggleCollect`)

First, find the exact lines to change:
- Where `emitCollectionUpdate()` is called
- Where `checkAndUnlockBadges()` is called
- Where `queryClient.invalidateQueries` is called

- [ ] **Step 1: Find and read the mutation call sites**

Search for `emitCollectionUpdate` in this file to find the exact context.

```bash
grep -n "emitCollectionUpdate\|checkAndUnlockBadges\|queryClient.invalidateQueries" /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/strains/\[slug\]/StrainDetailPageClient.tsx
```

- [ ] **Step 2: Add imports**

Add to imports:
```typescript
import { useCollection } from "@/hooks/useCollection";
```

- [ ] **Step 3: Add `toggleCollect` to component**

Inside the component that has `user`, add:
```typescript
const { toggleCollect } = useCollection();
```

- [ ] **Step 4: Replace manual emit + badge + invalidation calls**

Find the block where `emitCollectionUpdate()` is called after collection changes (around lines 388-395). Replace the sequence:
```typescript
checkAndUnlockBadges(user.id, supabase).catch(() => {});
emitCollectionUpdate();
try {
  queryClient.invalidateQueries({ queryKey: ['collection', user.id] });
} catch {}
```
With just:
```typescript
await toggleCollect(strain.id, {
  batchInfo: ...,
  userNotes: ...,
  userThc: ...,
  userCbd: ...,
});
```

The exact fields depend on the existing code — use whatever variables are already available in that scope.

- [ ] **Step 5: Remove now-unused imports**

After replacing, check if any of these are no longer used in the file:
- `emitCollectionUpdate`
- `checkAndUnlockBadges`
- `queryClient` (from `useQueryClient`)

- [ ] **Step 6: Verify — `emitCollectionUpdate` is not called directly anymore**

Run: `grep -n "emitCollectionUpdate" /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/strains/\[slug\]/StrainDetailPageClient.tsx`
Expected: No results

- [ ] **Step 7: Visual test**

Navigate to a strain detail page, collect/uncollect a strain, verify:
- Collection page count updates
- Strains page card shows collected state
- No console errors

---

## Task 6: Deprecate `src/lib/collection-events.ts`

**Files:**
- Modify: `src/lib/collection-events.ts`

- [ ] **Step 1: Add deprecation comment**

Edit `src/lib/collection-events.ts` to add at the top:
```typescript
/**
 * @deprecated Use useCollection() hook instead. This event bus is only
 * retained for potential cross-route notifications and will be removed
 * once useCollection is verified stable across all consumers.
 */
```

---

## Task 7: Final verification

- [ ] **Step 1: Run TypeScript compiler on entire src directory**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors from our changes

- [ ] **Step 2: Dev server smoke test**

Navigate to these pages, verify no console errors:
- `/` (home)
- `/strains` — verify collection indicators
- `/collection` — verify collection loads
- `/strains/[any-real-slug]` — collect a strain, verify it appears in collection

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCollection.ts src/hooks/useCollectionIds.ts src/app/strains/page.tsx src/app/collection/CollectionPageClient.tsx "src/app/strains/[slug]/StrainDetailPageClient.tsx" src/lib/collection-events.ts
git commit -m "$(cat <<'EOF'
feat(hooks): add useCollection and useCollectionIds hooks

Centralizes collection state, fetching, and mutations:
- useCollection: full collection with notes/images, collect/uncollect/toggleCollect
- useCollectionIds: lightweight ID-only hook for isCollected checks
- Both auto-subscribe to visibility + event bus updates
- Mutations use optimistic updates with rollback
- Migrates strains page, collection page, and strain detail page

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| `useCollection()` with full collection + mutations | Task 1 |
| `useCollectionIds()` lightweight hook | Task 2 |
| Optimistic updates with rollback | Task 1 |
| Auto-subscribe to visibility + event bus | Tasks 1 + 2 |
| Centralized badge check on mutations | Task 1 |
| Migrate strains/page.tsx | Task 3 |
| Migrate collection/CollectionPageClient.tsx | Task 4 |
| Migrate strain detail page | Task 5 |
| Deprecate event bus | Task 6 |
