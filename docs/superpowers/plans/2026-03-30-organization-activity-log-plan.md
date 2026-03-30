# Organization Activity Log – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins und Gründern einer Organization einen transparenten Audit-Trail bieten: Wer hat welche Strains hinzugefügt, wer wurde eingeladen, welche Rollen-Änderungen gab es.

**Architecture:** Neue `organization_activities` Tabelle mit RLS, GET API Route, und Frontend Page. Activities werden bei Strain/Member-Operationen in bestehenden Routes geschrieben.

**Tech Stack:** Next.js API Routes, Supabase (PostgreSQL + RLS), TypeScript, existing UI components

---

## File Map

### Create:
- `supabase/migrations/20260330120000_organization_activities.sql` – Table + RLS + Indexes
- `src/lib/organization-activities.ts` – Helper to write activity records
- `src/app/api/organizations/[organizationId]/activities/route.ts` – GET endpoint
- `src/app/settings/organization/activities/page.tsx` – Frontend page

### Modify:
- `src/lib/types.ts` – Add `OrganizationActivity` interface
- `src/app/api/strains/route.ts` – Write `strain_added` activity
- `src/app/api/organizations/[organizationId]/invites/route.ts` – Write `invite_sent` activity
- `src/app/api/organizations/[organizationId]/members/route.ts` – Write `member_joined`, `role_changed`, `member_removed` activities

---

## Tasks

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260330120000_organization_activities.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Organization Activity Log Migration
-- Migration: 20260330120000

CREATE TABLE IF NOT EXISTS organization_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  target_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organization_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Org admins (gründer, admin) can view
CREATE POLICY "Org admins see activities"
  ON organization_activities FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_activities.organization_id
      AND user_id = auth.uid()
      AND role IN ('gründer', 'admin')
      AND membership_status = 'active'
    )
  );

-- Policy: Authenticated users can insert (controlled by API routes)
CREATE POLICY "Org members can insert activities"
  ON organization_activities FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Indexes
CREATE INDEX idx_org_activities_org ON organization_activities(organization_id);
CREATE INDEX idx_org_activities_type ON organization_activities(event_type);
CREATE INDEX idx_org_activities_created ON organization_activities(created_at DESC);
CREATE INDEX idx_org_activities_org_created ON organization_activities(organization_id, created_at DESC);
```

- [ ] **Step 2: Run migration**

Run: `supabase db push`
Expected: Tables created without errors

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260330120000_organization_activities.sql
git commit -m "feat: add organization_activities table with RLS"
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `src/lib/types.ts` – Add `OrganizationActivity` interface

- [ ] **Step 1: Add types to types.ts**

Add at the end of `src/lib/types.ts`:

```typescript
export type OrganizationActivityEventType =
  | 'strain_added'
  | 'strain_updated'
  | 'strain_removed'
  | 'member_joined'
  | 'member_removed'
  | 'role_changed'
  | 'invite_sent'
  | 'invite_accepted'
  | 'invite_revoked';

export type OrganizationActivityTargetType =
  | 'strain'
  | 'member'
  | 'invite'
  | 'role'
  | 'organization';

export interface OrganizationActivity {
  id: string;
  organization_id: string;
  user_id: string | null;
  event_type: OrganizationActivityEventType;
  target_type: OrganizationActivityTargetType | null;
  target_id: string | null;
  target_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined
  user?: ProfileRow;
}

export interface OrganizationActivityResponse {
  activities: OrganizationActivity[];
  total: number;
  has_more: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add OrganizationActivity types"
```

---

### Task 3: Activity Write Helper

**Files:**
- Create: `src/lib/organization-activities.ts`

- [ ] **Step 1: Create the helper module**

```typescript
import { createClient } from '@supabase/supabase-js';
import type { OrganizationActivityEventType, OrganizationActivityTargetType } from './types';

type ActivityTarget = {
  id?: string;
  name?: string;
};

interface WriteActivityParams {
  supabase: ReturnType<typeof createClient>;
  organizationId: string;
  userId: string | null;
  eventType: OrganizationActivityEventType;
  targetType: OrganizationActivityTargetType;
  target?: ActivityTarget;
  metadata?: Record<string, unknown>;
}

/**
 * Writes an activity record to the organization_activities table.
 * Called from API routes after successful mutations.
 */
export async function writeOrganizationActivity({
  supabase,
  organizationId,
  userId,
  eventType,
  targetType,
  target,
  metadata = {},
}: WriteActivityParams): Promise<void> {
  const { error } = await supabase.from('organization_activities').insert({
    organization_id: organizationId,
    user_id: userId,
    event_type: eventType,
    target_type: targetType,
    target_id: target?.id ?? null,
    target_name: target?.name ?? null,
    metadata,
  });

  if (error) {
    // Log but don't throw - activity writing is non-critical
    console.error('Failed to write organization activity:', error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/organization-activities.ts
git commit -m "feat: add writeOrganizationActivity helper"
```

---

### Task 4: GET API Route

**Files:**
- Create: `src/app/api/organizations/[organizationId]/activities/route.ts`

- [ ] **Step 1: Create the GET endpoint**

```typescript
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { OrganizationActivity } from '@/lib/types';

type RouteParams = { params: Promise<{ organizationId: string }> };

const EVENT_TYPE_LABELS: Record<string, string> = {
  strain_added: 'hat Strain hinzugefügt',
  strain_updated: 'hat Strain bearbeitet',
  strain_removed: 'hat Strain entfernt',
  member_joined: 'ist der Organisation beigetreten',
  member_removed: 'wurde aus der Organisation entfernt',
  role_changed: 'Rolle geändert',
  invite_sent: 'hat eine Einladung verschickt',
  invite_accepted: 'Einladung angenommen',
  invite_revoked: 'Einladung widerrufen',
};

// GET /api/organizations/[organizationId]/activities
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { organizationId } = await params;
    const supabase = await createServerSupabaseClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check membership + role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('membership_status', 'active')
      .single();

    if (!membership || !['gründer', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50);
    const offset = parseInt(url.searchParams.get('offset') ?? '0');
    const eventType = url.searchParams.get('event_type');

    // Build query
    let query = supabase
      .from('organization_activities')
      .select(`
        id,
        organization_id,
        user_id,
        event_type,
        target_type,
        target_id,
        target_name,
        metadata,
        created_at,
        user:profiles!user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: activities, count, error } = await query;

    if (error) {
      console.error('Error fetching organization activities:', error);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    const typedActivities = (activities ?? []) as OrganizationActivity[];
    const total = count ?? 0;

    return NextResponse.json({
      activities: typedActivities,
      total,
      has_more: offset + limit < total,
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/organizations/[organizationId]/activities/route.ts
git commit -m "feat: add GET /api/organizations/[orgId]/activities endpoint"
```

---

### Task 5: Integrate Activities into Existing Routes

**Files:**
- Modify: `src/app/api/strains/route.ts`
- Modify: `src/app/api/organizations/[organizationId]/invites/route.ts`
- Modify: `src/app/api/organizations/[organizationId]/members/route.ts`

**Note:** First read each file to find the right insertion points. The activity writes go AFTER successful mutations.

- [ ] **Step 1: Add strain_added to POST /api/strains**

In `src/app/api/strains/route.ts`, after the successful strain insert:

```typescript
// Add after successful strain creation (after line with .insert() and .select())
import { writeOrganizationActivity } from '@/lib/organization-activities';

// Inside the POST handler, after successful insert:
if (newStrain && payload.organization_id) {
  await writeOrganizationActivity({
    supabase,
    organizationId: payload.organization_id,
    userId: user.id,
    eventType: 'strain_added',
    targetType: 'strain',
    target: { id: newStrain.id, name: newStrain.name },
    metadata: { type: payload.type, thc_max: payload.thc_max },
  });
}
```

**Important:** Use `getAuthenticatedClient` or create a supabase client with the user's access token for writing activities (RLS requires auth).

- [ ] **Step 2: Add member_invite to POST /api/organizations/[orgId]/invites**

In `src/app/api/organizations/[organizationId]/invites/route.ts`, after successful invite insert:

```typescript
// After successful invite creation
if (invite && invite.id) {
  await writeOrganizationActivity({
    supabase,
    organizationId,
    userId: user.id,
    eventType: 'invite_sent',
    targetType: 'invite',
    target: { id: invite.id, name: invite.email },
    metadata: { role: body.role, invited_email: invite.email },
  });
}
```

- [ ] **Step 3: Add member_joined to PATCH /api/organizations/[orgId]/invites (accept)**

When an invite is accepted (PATCH updates status to 'accepted'):

```typescript
// After successful status update to 'accepted'
if (body.status === 'accepted') {
  await writeOrganizationActivity({
    supabase,
    organizationId,
    userId: user.id,
    eventType: 'invite_accepted',
    targetType: 'invite',
    target: { id: inviteId, name: invite.email },
  });
}
```

- [ ] **Step 4: Add role_changed and member_removed to PUT /api/organizations/[orgId]/members**

When a member role changes or member is removed:

```typescript
// After successful role update
if (updates.role && oldRole !== updates.role) {
  await writeOrganizationActivity({
    supabase,
    organizationId,
    userId: user.id,
    eventType: 'role_changed',
    targetType: 'member',
    target: { id: memberId, name: memberProfile?.username ?? memberId },
    metadata: { old_role: oldRole, new_role: updates.role },
  });
}

// After successful member removal
if (body.action === 'remove') {
  await writeOrganizationActivity({
    supabase,
    organizationId,
    userId: user.id,
    eventType: 'member_removed',
    targetType: 'member',
    target: { id: memberId, name: memberProfile?.username ?? memberId },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/strains/route.ts src/app/api/organizations/[organizationId]/invites/route.ts src/app/api/organizations/[organizationId]/members/route.ts
git commit -m "feat: write organization_activities on strain/member/invite changes"
```

---

### Task 6: Frontend Page

**Files:**
- Create: `src/app/settings/organization/activities/page.tsx`

- [ ] **Step 1: Create the activities page**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { ChevronLeft, Loader2, Leaf, Users, Mail, Shield } from "lucide-react";
import type { OrganizationActivity } from "@/lib/types";

const EVENT_CONFIG: Record<string, { icon: typeof Leaf; color: string; label: string }> = {
  strain_added: { icon: Leaf, color: "#2FF801", label: "hat Strain hinzugefügt" },
  strain_updated: { icon: Leaf, color: "#2FF801", label: "hat Strain bearbeitet" },
  strain_removed: { icon: Leaf, color: "#ff716c", label: "hat Strain entfernt" },
  member_joined: { icon: Users, color: "#00F5FF", label: "ist beigetreten" },
  member_removed: { icon: Users, color: "#ff716c", label: "wurde entfernt" },
  role_changed: { icon: Shield, color: "#ffd76a", label: "Rolle geändert" },
  invite_sent: { icon: Mail, color: "#ffd76a", label: "Einladung verschickt" },
  invite_accepted: { icon: Mail, color: "#2FF801", label: "Einladung angenommen" },
  invite_revoked: { icon: Mail, color: "#ff716c", label: "Einladung widerrufen" },
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "gerade eben";
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  return `vor ${diffDays} T.`;
}

export default function OrgActivitiesPage() {
  const { activeOrganization, session, isDemoMode } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<OrganizationActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!activeOrganization || !session?.access_token) return;

    const fetchActivities = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "20", offset: String(offset) });
        if (filter) params.set("event_type", filter);

        const res = await fetch(
          `/api/organizations/${activeOrganization.organization_id}/activities?${params}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );

        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setActivities(offset === 0 ? data.activities : [...activities, ...data.activities]);
        setHasMore(data.has_more);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchActivities();
  }, [activeOrganization, session, filter, offset]);

  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
      </main>
    );
  }

  const canView = ["gründer", "admin"].includes(activeOrganization.role);
  if (!canView) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--muted-foreground)]">Kein Zugriff</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 flex items-center gap-4 relative z-10">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
            {activeOrganization.organizations?.name}
          </p>
          <h1 className="text-2xl font-black italic uppercase font-display">Aktivitäten</h1>
        </div>
      </header>

      {/* Filter */}
      <div className="px-6 py-3 flex gap-2 overflow-x-auto relative z-10">
        {[
          { key: null, label: "Alle" },
          { key: "strain_added", label: "Strains" },
          { key: "member_joined", label: "Members" },
          { key: "invite_sent", label: "Einladungen" },
        ].map(({ key, label }) => (
          <button
            key={String(key)}
            onClick={() => { setFilter(key); setOffset(0); setActivities([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap ${
              filter === key
                ? "bg-[#2FF801] text-black"
                : "bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="px-6 space-y-3 relative z-10">
        {activities.length === 0 && !loading ? (
          <div className="text-center py-20 text-[var(--muted-foreground)]">
            Noch keine Aktivitäten
          </div>
        ) : (
          activities.map((activity) => {
            const config = EVENT_CONFIG[activity.event_type] ?? EVENT_CONFIG.strain_added;
            const Icon = config.icon;
            const userName = activity.user?.display_name || activity.user?.username || "System";

            return (
              <div
                key={activity.id}
                className="bg-[var(--card)] border border-[var(--border)]/50 rounded-2xl p-4 flex items-start gap-3"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <Icon size={18} style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[var(--foreground)] truncate">{userName}</p>
                    <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                      {formatTimeAgo(activity.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {config.label}{" "}
                    {activity.target_name && (
                      <span className="text-[var(--foreground)] font-semibold">
                        "{activity.target_name}"
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[#00F5FF]" size={24} />
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={() => setOffset((o) => o + 20)}
            className="w-full py-4 text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] border border-dashed border-[var(--border)]/50 rounded-xl"
          >
            Mehr laden
          </button>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
```

- [ ] **Step 2: Add navigation item to organization settings**

Modify `src/app/settings/organization/page.tsx` to add "Aktivitäten" link alongside existing menu items (e.g., after "Admins verwalten"):

```tsx
{/* Activity Log — nach dem Admin-Card einfügen */}
<Link href="/settings/organization/activities">
  <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0">
        <Activity size={20} className="text-[#00F5FF]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black text-sm text-[var(--foreground)]">Aktivitäten</p>
        <p className="text-[10px] text-[var(--muted-foreground)]">Chronologie aller Änderungen</p>
      </div>
    </div>
  </Card>
</Link>
```

Import `Activity` from lucide-react.

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/organization/activities/page.tsx src/app/settings/organization/page.tsx
git commit -m "feat: add organization activities settings page"
```

---

## Spec Coverage Check

| Spec Section | Tasks |
|--------------|-------|
| Datenmodell (Table + RLS + Index) | Task 1 |
| Event Types | Task 1, Task 5 |
| API Route GET | Task 4 |
| Frontend Page | Task 6 |
| Activity Write Integration | Task 3, Task 5 |
| Trigger in bestehenden Routes | Task 5 |

All spec sections are covered.

## Self-Review

- No placeholders found
- Types consistent across tasks (OrganizationActivity, OrganizationActivityEventType)
- Helper function is used in Task 5, created in Task 3
- Frontend uses same API response shape defined in Task 4
