# GreenLog Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4 verbleibende Refactoring-Tasks umsetzen: API Error Handling, Loading Skeletons, Query-Keys Aktivierung, profile-view.tsx React Query

**Architecture:** 4 unabhängige Tasks — können parallel oder sequentiell implementiert werden. Jeder Task liefert funktionierende Software.

**Tech Stack:** React Query, TypeScript, Supabase, Next.js Pages Router

---

## File Structure (nach Änderungen)

### Unverändert (bleibt so)
- `src/lib/query-keys.ts` — Query Keys Factory (bestehend)
- `src/hooks/useFollowStatus.ts` — Follow Status Hook (bestehend)
- `src/hooks/useFollow.ts` — Follow Mutation Hook (bestehend)
- `src/hooks/useFollowRequests.ts` — Follow Requests Hook (bestehend)

### Geändert
- `src/app/api/follow-request/manage/route.ts:6` — `return auth || jsonError(...)` → explizite Return-Statements
- `src/app/api/notifications/route.ts:37-44` — try/catch um `sendPushToUser`
- `src/app/community/[id]/page.tsx` — Loading Skeleton hinzufügen
- `src/hooks/useFollowStatus.ts` — String-Keys durch `followingKeys`, `followersKeys` ersetzen
- `src/hooks/useFollow.ts` — String-Keys durch Query-Keys Factory ersetzen
- `src/hooks/useFollowRequests.ts` — String-Keys durch `followRequestsKeys` ersetzen
- `src/hooks/useCommunity.ts` — Exportierte Interfaces verschieben (bereits erledigt)

---

## Task 1: API Error Handling Fix

**Files:**
- Modify: `src/app/api/follow-request/manage/route.ts:6` (GET handler)
- Modify: `src/app/api/notifications/route.ts:37-44` (sendPushToUser call)
- Test: API Calls mit fehlender Auth → korrekte 401 Response

### GET Handler — follow-request/manage/route.ts

**Problem:** Line 6:
```typescript
if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
```
Wenn `auth` `null` ist (nicht Response), gibt `auth || jsonError(...)` `null` zurück statt einen Error-Response.

**Fix:**

- [ ] **Step 1: Fix GET Handler Return Statement**

In `src/app/api/follow-request/manage/route.ts` Zeile 6 ändern:

```typescript
// VON:
if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
// ZU:
if (!auth) return jsonError("Unauthorized", 401);
if (auth instanceof Response) return auth;
```

**Erklärung:** Klare Trennung — erst `null`-Check, dann Response-Check.

- [ ] **Step 2: Fix PUT Handler — gleiche Pattern**

Line 28 hat identisches Problem:
```typescript
if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
```

Ändern zu:
```typescript
if (!auth) return jsonError("Unauthorized", 401);
if (auth instanceof Response) return auth;
```

- [ ] **Step 3: Verify mit `npx tsc --noEmit`**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | head -10`
Erwartet: Keine Fehler in `follow-request/manage/route.ts`

- [ ] **Step 4: Commit**
```bash
git add src/app/api/follow-request/manage/route.ts
git commit -m "fix: follow-request/manage route - explizite null checks statt shortcut evaluation"
```

---

### notifications/route.ts — Silent Push Failure

**Problem:** Zeilen 37-44 — `sendPushToUser` wird ohne try/catch aufgerufen. Wenn Push fehlschlägt, wird nicht geloggt.

**Fix:**

- [ ] **Step 1: Wrap sendPushToUser in try/catch**

In `src/app/api/notifications/route.ts` Zeilen 36-44 ändern:

```typescript
// VON:
for (const notif of toPush) {
    await sendPushToUser(supabaseAdmin, user.id, {
        title: notif.title,
        body: notif.message || "Neue Benachrichtigung",
        tag: notif.type,
        data: notif.data || {},
    });
}

// ZU:
for (const notif of toPush) {
    try {
        await sendPushToUser(supabaseAdmin, user.id, {
            title: notif.title,
            body: notif.message || "Neue Benachrichtigung",
            tag: notif.type,
            data: notif.data || {},
        });
    } catch (pushErr) {
        console.error(`[Push] Failed to send notification ${notif.id}:`, pushErr);
    }
}
```

- [ ] **Step 2: Verify mit `npx tsc --noEmit`**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | head -10`
Erwartet: Keine Fehler in `notifications/route.ts`

- [ ] **Step 3: Commit**
```bash
git add src/app/api/notifications/route.ts
git commit -m "fix: notifications route - push errors werden jetzt geloggt statt still verschluckt"
```

---

## Task 2: Loading Skeleton — community/[id]/page.tsx

**Files:**
- Modify: `src/app/community/[id]/page.tsx`
- Test: Community-Detailseite zeigt Skeleton beim Laden

### Aktueller Code Check

- [ ] **Step 1: Read community/[id]/page.tsx — erste 80 Zeilen**

Lese `src/app/community/[id]/page.tsx` — identifiziere wo Loading-State verwendet wird.

- [ ] **Step 2: Skeleton Component erstellen**

Falls nicht vorhanden, erstelle `src/components/ui/skeleton.tsx`:

```typescript
// src/components/ui/skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-[var(--muted)] rounded-xl ${className || ""}`} />
    );
}
```

ODER nutze bestehende Skeleton-Variante in `src/components/ui/card.tsx` falls vorhanden.

- [ ] **Step 3: Loading State mit Skeleton ersetzen**

Finde im `community/[id]/page.tsx` wo `loading` State verwendet wird:

```typescript
// VON (sinngemäß):
if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin" /></div>;
}

// ZU:
if (loading) {
    return (
        <div className="space-y-4 p-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
    );
}
```

- [ ] **Step 4: Commit**
```bash
git add src/components/ui/skeleton.tsx src/app/community/[id]/page.tsx
git commit -m "feat: community detail page loading skeleton"
```

---

## Task 3: Query-Keys Aktivierung

**Files:**
- Modify: `src/hooks/useFollowStatus.ts` — String-Keys durch `followingKeys`/`followersKeys` ersetzen
- Modify: `src/hooks/useFollow.ts` — String-Keys durch Query-Keys Factory ersetzen
- Modify: `src/hooks/useFollowRequests.ts` — String-Keys durch `followRequestsKeys` ersetzen
- Test: `npm run lint` fehlerfrei

### Problem

In `useFollowStatus.ts` werden String-Literale als Query-Keys verwendet statt die Factory-Funktionen aus `query-keys.ts`:

```typescript
// useFollowStatus.ts — aktuell:
queryKey: ['follow-status', userId] as const

// sollte sein:
queryKey: followersKeys.list(userId)
```

### Fix-Strategie

**Hinweis:** Die Query-Keys in `query-keys.ts` sind NICHT `readonly` tuples (da sie `as const` nur lokal nutzen). Die Keys müssen zusammengeführt werden können. Die Factory-Funktionen geben `readonly` Arrays zurück.

- [ ] **Step 1: useFollowStatus.ts — Query Keys korrigieren**

In `src/hooks/useFollowStatus.ts`:

```typescript
// IMPORT HINZUFÜGEN:
import { followingKeys, followersKeys } from "@/lib/query-keys";

// queryKey ÄNDERN:
// VON: queryKey: ['follow-status', userId] as const
// ZU: queryKey: followersKeys.list(userId)
```

**Wichtig:** Der Key `['follow-status', userId]` ist für die lokale Follow-Status-Cache-Invalidation im FollowButton. Diesen Key behalten wir als zusätzlichen Key — die Factory-Keys sind für die Listen.

Inkonsistenz-Analysis:
- `followingKeys.list(user.id)` — eigene Following-Liste
- `followersKeys.list(userId)` — Follower-Liste des Targets
- `['follow-status', userId]` — lokaler Status-Cache (brauchen wir für FollowButton invalidation)

**Lösung:** Beide Keys behalten — Factory für Listen, String-Literal für FollowButton-Cache.

```typescript
// useFollowStatus.ts — finale Version:
queryKey: ['follow-status', userId] as const,  // keep for FollowButton cache invalidation
```

```typescript
// useFollow.ts — invalidate mit Factory:
onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: followingKeys.all });
    queryClient.invalidateQueries({ queryKey: followersKeys.all });
},
```

```typescript
// useFollowRequests.ts — Query Key via Factory:
queryKey: followRequestsKeys.list(),
```

- [ ] **Step 2: useFollow.ts — Query Keys korrigieren**

In `src/hooks/useFollow.ts`:

```typescript
import { followingKeys, followersKeys } from "@/lib/query-keys";

// onSuccess — bereits korrekt mit followingKeys.all und followersKeys.all
```

Nichts ändern — `useFollow.ts` nutzt bereits `followingKeys.all` und `followersKeys.all`.

- [ ] **Step 3: useFollowRequests.ts — Query Key korrigieren**

In `src/hooks/useFollowRequests.ts`:

```typescript
// IMPORT ÄNDERN:
import { followRequestsKeys } from "@/lib/query-keys";

// queryKey — bereits korrekt: followRequestsKeys.list()
```

Bereits korrekt.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | grep -E "useFollow" | head -10`
Erwartet: Keine Fehler

Run: `npm run lint 2>&1 | head -10`
Erwartet: Keine Fehler

- [ ] **Step 5: Commit**
```bash
git add src/hooks/useFollowStatus.ts src/hooks/useFollowRequests.ts
git commit -m "refactor: useFollowStatus nutzt jetzt followersKeys factory"
```

---

## Task 4: profile-view.tsx — React Query

**Files:**
- Create: `src/hooks/useProfile.ts`
- Modify: `src/app/profile/profile-view.tsx`
- Test: Profil-Seite lädt ohne manuelle useState/useEffect

### Scope

Die `profile-view.tsx` ist ~889 Zeilen. Wir extrahieren nur den **Daten-Fetching**-Teil in einen Hook. UI-State (DnD, Editing, Badges-Selektion) bleibt lokal.

### Risiko-Bewertung

- **Hoch**: 889 Zeilen, viele Abhängigkeiten, DnD-Sortierung mit Position-Save
- **Empfehlung**: Erst Kleinvieh machen (Profile-Data Hook), dann sehen wie es läuft

### Alternative für Risk-Reduktion

Falls `useProfile` Hook zu komplex wird: Nur die `user_badges` Query + `profile_visibility` Mutation in Hook extrahieren. Rest bleibt wie bisher.

### Schritte (bei Bedarf, falls Zeitrahmen es erlaubt)

- [ ] **Step 1: useProfile.ts erstellen (Minimal-Version)**

```typescript
// src/hooks/useProfile.ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

interface ProfileStats {
    totalStrains: number;
    totalGrows: number;
    favoriteCount: number;
    unlockedBadgeCount: number;
    xp: number;
    level: number;
    progressToNextLevel: number;
    followers: number;
    following: number;
}

interface ProfileData {
    identity: { email: string | null; username: string; displayName: string; initials: string; profileVisibility: string; tagline: string; bio: string | null };
    stats: ProfileStats;
    activity: unknown[];
}

async function fetchProfileData(userId: string): Promise<ProfileData> {
    // Aus profile-view.tsx useEffect extrahieren
    // Fetch: profile, badges, follows_count, collection_count
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    // ... rest aus useEffect
    return { identity, stats, activity: [] };
}

export function useProfile() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['profile', user?.id],
        queryFn: () => fetchProfileData(user!.id),
        enabled: !!user,
        staleTime: 60 * 1000,
    });
}
```

- [ ] **Step 2: profile-view.tsx umstellen**

`useEffect` + `useState` für Daten-Fetching → `useProfile()` Hook.
`isLoading` → `useProfile().isLoading`
`viewModel` → `useProfile().data`

- [ ] **Step 3: Commit**
```bash
git add src/hooks/useProfile.ts src/app/profile/profile-view.tsx
git commit -m "refactor: profile-view nutzt useProfile Hook"
```

---

## Verification

Nach jedem Task:
- `npx tsc --noEmit 2>&1 | grep -v node_modules | head -10` — keine neuen Fehler
- `npm run lint` — fehlerfrei (wenn ESLint funktioniert)
- Manuell testen: Page lädt korrekt

---

## Dependencies

- Task 1 (API Error) → keine Deps, kann sofort
- Task 2 (Loading Skeleton) → keine Deps, kann sofort
- Task 3 (Query-Keys) → keine Deps, kann sofort
- Task 4 (profile-view) → komplex, nur wenn Zeitrahmen es erlaubt

Alle Tasks sind voneinander unabhängig und können parallel von verschiedenen Subagents implementiert werden.
