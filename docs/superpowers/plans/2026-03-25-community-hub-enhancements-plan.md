# Community Hub Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stats (member/strain counts, newest strain), Admin Quick Actions, and org-strain Activity Feed to the Community Hub page.

**Architecture:** Two new API endpoints (`/api/organizations/[orgId]/stats` and `/api/organizations/[orgId]/activities`) + extracted UI components (`OrgInfoCard`, `ActivityFeed`, `ActivityItem`). Activity feed uses existing `user_activities` table plus a new `strain_created` activity type from a DB trigger.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), TypeScript, Tailwind.

---

## File Structure

```
src/
  app/
    community/
      page.tsx                              # Modify — wire up data fetching + new components
    api/
      organizations/
        [organizationId]/
          stats/
            route.ts                        # Create — member/strain counts + newest strain
          activities/
            route.ts                        # Create — org-strain activity feed
  components/
    community/
      org-info-card.tsx                     # Create — stats + admin quick action buttons
      activity-feed.tsx                      # Create — activity list container
      activity-item.tsx                     # Create — single activity row
supabase/migrations/
  [timestamp]_strain_created_activity.sql    # Create — add strain_created activity type + trigger
src/
  lib/
    types.ts                                # Modify — add SocialFeedItem variant + ActivityFeed types
```

---

## Task 1: DB Migration — `strain_created` Activity Type + Trigger

**Files:**
- Create: `supabase/migrations/[timestamp]_strain_created_activity.sql`

**Steps:**

- [ ] **Step 1: Write migration**

```sql
-- Enable UUID extension if not already enabled (usually already present)
-- Add strain_created to the activity_type check constraint
ALTER TABLE user_activities DROP CONSTRAINT IF EXISTS user_activities_activity_type_check;
ALTER TABLE user_activities ADD CONSTRAINT user_activities_activity_type_check
  CHECK (activity_type IN ('rating', 'grow_started', 'grow_completed', 'badge_earned', 'favorite_added', 'strain_created'));

-- Create trigger function for strain_created activity
CREATE OR REPLACE FUNCTION create_strain_created_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.organization_id IS NOT NULL THEN
    INSERT INTO user_activities (user_id, activity_type, target_id, target_name, target_image_url, metadata)
    VALUES (
      NEW.created_by,
      'strain_created',
      NEW.id,
      NEW.name,
      NEW.image_url,
      jsonb_build_object('type', NEW.type, 'organization_id', NEW.organization_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to strains table (AFTER INSERT, for new strains with org_id)
DROP TRIGGER IF EXISTS on_strain_created ON strains;
CREATE TRIGGER on_strain_created
  AFTER INSERT ON strains
  FOR EACH ROW EXECUTE FUNCTION create_strain_created_activity();
```

> Note: `created_by` column on strains must exist. If it doesn't, the trigger should use `NEW.created_by` or fall back to `auth.uid()` — verify against current strains schema first.

- [ ] **Step 2: Run migration**

Run: `supabase db push`
Expected: Migration applies cleanly

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/[timestamp]_strain_created_activity.sql
git commit -m "feat(org): add strain_created activity trigger for org-strain feed"
```

---

## Task 2: Add `strain_created` to TypeScript Types

**Files:**
- Modify: `src/lib/types.ts`

**Steps:**

- [ ] **Step 1: Find and update SocialFeedItem type**

Locate `SocialFeedItem` type and add `'strain_created'` to the `activity_type` union.

```typescript
// In src/lib/types.ts — find the SocialFeedItem type and add strain_created
export type SocialFeedItem = {
  id: string;
  user_id: string;
  activity_type: 'rating' | 'grow_started' | 'grow_completed' | 'badge_earned' | 'favorite_added' | 'strain_created';
  target_id: string;
  target_name: string;
  target_image_url?: string | null;
  metadata: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  // joins
  user?: Profile;
};
```

- [ ] **Step 2: Add OrgActivityFeed types**

Add to `src/lib/types.ts`:

```typescript
// Org community hub stats
export interface OrgStats {
  memberCount: number;
  strainCount: number;
  newestStrain: { id: string; name: string; slug: string } | null;
}

// Org activity feed item
export interface OrgActivityItem {
  id: string;
  type: 'strain_created' | 'rating';
  user: { displayName: string; username: string };
  strain: { id: string; name: string; slug: string };
  rating?: number;
  createdAt: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "types: add strain_created activity type and OrgStats/OrgActivityItem types"
```

---

## Task 3: API — `GET /api/organizations/[organizationId]/stats`

**Files:**
- Create: `src/app/api/organizations/[organizationId]/stats/route.ts`

**Steps:**

- [ ] **Step 1: Write the route**

```typescript
import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

type RouteParams = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { organizationId } = await params;
    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAuthenticatedClient(accessToken);

    // Verify user is org member
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role, membership_status")
      .eq("organization_id", organizationId)
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .eq("membership_status", "active")
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch member count
    const { count: memberCount } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("membership_status", "active");

    // Fetch strain count + newest strain
    const { data: strainData } = await supabase
      .from("strains")
      .select("id, name, slug")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1);

    const newestStrain = strainData && strainData.length > 0
      ? { id: strainData[0].id, name: strainData[0].name, slug: strainData[0].slug }
      : null;

    return NextResponse.json({
      memberCount: memberCount ?? 0,
      strainCount: strainData?.length ?? 0, // total count needs separate query if needed
      newestStrain,
    });

  } catch (error) {
    console.error("Error fetching org stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

> Note: `strainCount` above is incorrect — it only gets 1 row. Use a count query instead:

```typescript
const { count: strainCount } = await supabase
  .from("strains")
  .select("*", { count: "exact", head: true })
  .eq("organization_id", organizationId);
```

- [ ] **Step 2: Test with curl**

Run dev server first: `npm run dev`
Then: `curl -H "Authorization: Bearer <token>" http://localhost:3000/api/organizations/<orgId>/stats`
Expected: `{"memberCount": 3, "strainCount": 8, "newestStrain": {"id": "...", "name": "Gorilla Glue", "slug": "gorilla-glue"}}`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/organizations/[organizationId]/stats/route.ts
git commit -m "feat(org): add GET /api/organizations/[orgId]/stats endpoint"
```

---

## Task 4: API — `GET /api/organizations/[organizationId]/activities`

**Files:**
- Create: `src/app/api/organizations/[organizationId]/activities/route.ts`

**Steps:**

- [ ] **Step 1: Write the route**

```typescript
import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

type RouteParams = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { organizationId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "5", 10), 20);

    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAuthenticatedClient(accessToken);

    // Verify user is org member
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role, membership_status")
      .eq("organization_id", organizationId)
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .eq("membership_status", "active")
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch org-strain activities
    const { data: activities, error: activitiesError } = await supabase
      .from("user_activities")
      .select(`
        id,
        activity_type,
        created_at,
        strain_id:target_id,
        user_id,
        metadata,
        user:profiles!user_id(id, display_name, username)
      `)
      .eq("activity_type", "strain_created")
      .eq("metadata->>organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Fetch ratings on org strains (activity_type = 'rating')
    const { data: ratedActivities } = await supabase
      .from("user_activities")
      .select(`
        id,
        activity_type,
        created_at,
        target_id,
        user_id,
        metadata,
        user:profiles!user_id(id, display_name, username)
      `)
      .eq("activity_type", "rating")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter ratedActivities to only those where the strain belongs to this org
    const orgStrainIds = await supabase
      .from("strains")
      .select("id")
      .eq("organization_id", organizationId);

    const orgStrainIdSet = new Set((orgStrainIds.data ?? []).map(s => s.id));

    const filteredRatings = (ratedActivities ?? []).filter(a =>
      orgStrainIdSet.has(a.target_id as string)
    );

    // Merge and sort
    const allActivities = [
      ...(activities ?? []).map(a => ({
        id: a.id,
        type: a.activity_type as 'strain_created',
        user: {
          displayName: (a.user as { display_name?: string } | null)?.display_name ?? "",
          username: (a.user as { username?: string } | null)?.username ?? "",
        },
        strain: { id: a.target_id, name: a.target_name, slug: "" }, // slug not in activities
        createdAt: a.created_at,
      })),
      ...filteredRatings.map(a => ({
        id: a.id,
        type: 'rating' as const,
        user: {
          displayName: (a.user as { display_name?: string } | null)?.display_name ?? "",
          username: (a.user as { username?: string } | null)?.username ?? "",
        },
        strain: { id: a.target_id, name: a.target_name, slug: "" },
        rating: (a.metadata as { rating?: number })?.rating ?? null,
        createdAt: a.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({ activities: allActivities });

  } catch (error) {
    console.error("Error fetching org activities:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

> **Note on slug:** The `user_activities` table does not store `slug`. For `strain_created` activities, fetch the slug from the `strains` table in a follow-up query, or store it in `target_name` (not ideal). A better approach: join `strains` to get the slug for each activity's `target_id`.

Revised approach — use a proper JOIN via RPC or a more targeted query:

```typescript
// After fetching activities, map strain slugs
const strainIds = allActivities.map(a => a.strain.id);
const { data: strainSlugs } = await supabase
  .from("strains")
  .select("id, slug")
  .in("id", strainIds);

const slugMap = new Map((strainSlugs ?? []).map(s => [s.id, s.slug]));
const withSlugs = allActivities.map(a => ({
  ...a,
  strain: { ...a.strain, slug: slugMap.get(a.strain.id) ?? "" },
}));
```

- [ ] **Step 2: Test with curl**

Run dev server first: `npm run dev`
Then: `curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/organizations/<orgId>/activities?limit=5"`
Expected: `{"activities": [...]}`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/organizations/[organizationId]/activities/route.ts
git commit -m "feat(org): add GET /api/organizations/[orgId]/activities endpoint"
```

---

## Task 5: Component — `OrgInfoCard`

**Files:**
- Create: `src/components/community/org-info-card.tsx`

**Steps:**

- [ ] **Step 1: Write the component**

```typescript
"use client";

import Link from "next/link";
import { Building2, Crown, Plus, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OrgStats } from "@/lib/types";

interface OrgInfoCardProps {
  orgName: string;
  orgType: string | null;
  isAdmin: boolean;
  stats: OrgStats;
}

export function OrgInfoCard({ orgName, orgType, isAdmin, stats }: OrgInfoCardProps) {
  const orgTypeLabel = orgType === "club" ? "Club" : orgType === "pharmacy" ? "Apotheke" : orgType;

  return (
    <Card className="bg-[#1e3a24] border-white/10 p-6 rounded-3xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-14 h-14 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0">
            <Building2 size={24} className="text-[#00F5FF]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-lg truncate">{orgName}</p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  <Crown size={8} />
                  Admin
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
              {orgTypeLabel}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <span className="text-[#00F5FF]">👥</span>
                {stats.memberCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[#2FF801]">🌿</span>
                {stats.strainCount}
              </span>
            </div>
            {stats.newestStrain && (
              <p className="text-[10px] text-white/40 mt-1">
                Neueste:{" "}
                <Link
                  href={`/strains/${stats.newestStrain.slug}`}
                  className="text-[#2FF801] hover:underline"
                >
                  {stats.newestStrain.name}
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Admin Quick Actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/settings/organization/strains"
              className="w-9 h-9 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/20 flex items-center justify-center hover:bg-[#2FF801]/20 transition-colors"
              title="Eigene Sorte erstellen"
            >
              <Plus size={16} className="text-[#2FF801]" />
            </Link>
            <Link
              href="/settings/organization/invites"
              className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center hover:bg-purple-500/20 transition-colors"
              title="Einladung senden"
            >
              <Mail size={16} className="text-purple-400" />
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/community/org-info-card.tsx
git commit -m "feat(community): add OrgInfoCard component with stats and admin quick actions"
```

---

## Task 6: Component — `ActivityItem`

**Files:**
- Create: `src/components/community/activity-item.tsx`

**Steps:**

- [ ] **Step 1: Write a relative time utility**

First create a helper (put in `src/lib/dates.ts` or inline in the component):

```typescript
// Relative time formatter
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays === 1) return "gestern";
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}
```

- [ ] **Step 2: Write the component**

```typescript
"use client";

import Link from "next/link";
import { Leaf } from "lucide-react";
import { OrgActivityItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/dates";

interface ActivityItemProps {
  item: OrgActivityItem;
}

export function ActivityItem({ item }: ActivityItemProps) {
  const isCreated = item.type === "strain_created";

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/20 flex items-center justify-center shrink-0 mt-0.5">
        <Leaf size={14} className="text-[#2FF801]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/80 leading-snug">
          <span className="font-semibold text-white">{item.user.displayName || item.user.username}</span>
          {" hat "}
          <Link
            href={`/strains/${item.strain.slug}`}
            className="text-[#2FF801] hover:underline font-medium"
          >
            {item.strain.name}
          </Link>
          {isCreated ? " erstellt" : " bewertet"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {!isCreated && item.rating && (
            <span className="text-xs text-white/60">
              {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
            </span>
          )}
          {isCreated && (
            <span className="text-[10px] text-[#2FF801] font-medium">+Neue Sorte</span>
          )}
          <span className="text-[10px] text-white/40">
            • {formatRelativeTime(item.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/dates.ts src/components/community/activity-item.tsx
git commit -m "feat(community): add formatRelativeTime utility and ActivityItem component"
```

---

## Task 7: Component — `ActivityFeed`

**Files:**
- Create: `src/components/community/activity-feed.tsx`

**Steps:**

- [ ] **Step 1: Write the component**

```typescript
"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { OrgActivityItem } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { ActivityItem } from "./activity-item";

interface ActivityFeedProps {
  organizationId: string;
}

export function ActivityFeed({ organizationId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<OrgActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      setIsLoading(true);
      setError(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          setError("Nicht eingeloggt");
          return;
        }

        const res = await fetch(
          `/api/organizations/${organizationId}/activities?limit=5`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          throw new Error("Fehler beim Laden der Aktivitäten");
        }

        const data = await res.json();
        setActivities(data.activities ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      } finally {
        setIsLoading(false);
      }
    }

    void fetchActivities();
  }, [organizationId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-white/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-xs text-white/40">
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-white/40">
        Noch keine Strain-Aktivitäten
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {activities.map(activity => (
        <ActivityItem key={activity.id} item={activity} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/community/activity-feed.tsx
git commit -m "feat(community): add ActivityFeed component"
```

---

## Task 8: Update `CommunityPage` — Wire Everything Together

**Files:**
- Modify: `src/app/community/page.tsx`

**Steps:**

- [ ] **Step 1: Read the current file**

Read the current `community/page.tsx` to understand what to change.

- [ ] **Step 2: Add data fetching**

Add state for `orgStats` and `isLoading`:

```typescript
const [orgStats, setOrgStats] = useState<OrgStats | null>(null);
const [isLoadingStats, setIsLoadingStats] = useState(true);
```

Add `useEffect` after auth check:

```typescript
useEffect(() => {
  async function fetchStats() {
    if (!activeOrganization || !session?.access_token) return;

    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization.organization_id}/stats`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setOrgStats(data);
      }
    } catch (e) {
      console.error("Failed to load org stats", e);
    } finally {
      setIsLoadingStats(false);
    }
  }

  void fetchStats();
}, [activeOrganization, session?.access_token]);
```

- [ ] **Step 3: Replace the Org-Info Card JSX**

Replace the current static Org-Info Card section with:

```tsx
<OrgInfoCard
  orgName={orgName}
  orgType={orgType}
  isAdmin={isAdmin}
  stats={orgStats ?? { memberCount: 0, strainCount: 0, newestStrain: null }}
/>
```

- [ ] **Step 4: Add ActivityFeed**

Add import:

```typescript
import { ActivityFeed } from "@/components/community/activity-feed";
import { OrgInfoCard } from "@/components/community/org-info-card";
```

After the Org-Info Card and before the Navigation Cards section:

```tsx
{/* Activity Feed */}
<div className="mt-2">
  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2 px-1">
    Letzte Aktivitäten
  </p>
  <Card className="bg-[#1e3a24] border-white/10 p-4 rounded-3xl">
    <ActivityFeed organizationId={activeOrganization.organization_id} />
  </Card>
</div>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/app/community/page.tsx
git commit -m "feat(community): wire up OrgInfoCard, ActivityFeed, and stats API"
```

---

## Task 9: Push and Verify

- [ ] **Step 1: Push all commits**

```bash
git push
```

- [ ] **Step 2: Verify on Vercel**

1. Go to `/community` as org member — should see org stats on the card
2. As admin — should see `+` and `✉️` quick action buttons
3. Should see activity feed with recent strain-created and strain-rated items
4. Test as non-admin — quick actions should be hidden
