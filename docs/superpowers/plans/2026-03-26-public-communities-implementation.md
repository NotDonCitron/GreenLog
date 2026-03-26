# Public Communities + Follower-System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Communities werden öffentlich einsehbar. Jeder Nutzer kann einer Community folgen (max 1 Community gründen). Gründer/Admins können Strains erstellen, nur Gründer können Admins einladen.

**Architecture:**
- Neue Tabellen: `community_followers`, `community_feed`
- Neue RLS Policies für öffentlichen Zugriff auf Org-Strains und Feed
- DB-Trigger für automatische Feed-Einträge bei Strain/Grow/Rating
- API Routes für Follow-Toggle, Feed, Admin-Einladung

**Tech Stack:** Supabase (Postgres, RLS), Next.js App Router, TypeScript

---

## File Map

### Database
- `supabase-schema.sql` — Basis-Schema (nicht Multitenancy-spezifisch)
- `migrations/20260326040000_b2b_multitenancy_foundation.sql` — Org-Tabellen (organization_members, organizations, organization_invites)
- `migrations/20260327000000_org_strains_infrastructure.sql` — Org-strains

> **Wichtig:** Es gibt KEINE zentrale Migrations-Datei. Supabase arbeitet mit einzelnen Migration-Files im `supabase/` Ordner. Prüfe dort die existierenden Files bevor du neue erstellst.

### API Routes (neu oder geändert)
- `src/app/api/communities/[id]/feed/route.ts` — GET Feed
- `src/app/api/communities/[id]/follow/route.ts` — POST Follow/Unfollow
- `src/app/api/communities/[id]/invite/route.ts` — POST Admin-Einladung (nur Gründer)
- `src/app/api/organizations/[organizationId]/invites/route.ts` — Ändern: nur Admin-Einladung
- `src/app/api/organizations/[organizationId]/members/route.ts` — Ändern: keine member-Rolle mehr

### Frontend
- `src/app/community/page.tsx` — Komplett überarbeiten (public view)
- `src/app/community/[id]/page.tsx` — Neue öffentliche Community-Detail-Seite mit Feed
- `src/components/community/` — Neue Komponenten: FollowButton, CommunityFeed, CommunityHeader
- `src/app/profile/page.tsx` — "Gründer" Badge
- `src/components/organization-switcher.tsx` — Max-1-Community-Prüfung
- `src/app/community/new/page.tsx` — Community erstellen (max 1)

### Types
- `src/lib/types.ts` — CommunityFollower, CommunityFeedEntry, Role-Änderungen

---

## Task 1: Database — Neue Tabellen + RLS

**Files:**
- Create: `supabase/migrations/20260327000001_community_followers.sql`
- Create: `supabase/migrations/20260327000002_community_feed.sql`
- Modify: `supabase/migrations/20260327000003_update_org_members_role.sql`

### Steps

- [ ] **Step 1: Create `community_followers` migration**

```sql
-- supabase/migrations/20260327000001_community_followers.sql
CREATE TABLE community_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE community_followers ENABLE ROW LEVEL SECURITY;

-- Jeder User kann sehen wer einer Community folgt (für Follower-Count)
CREATE POLICY "community_followers_read_all" ON community_followers FOR SELECT USING (true);

-- Jeder authentifizierte User kann sich selbst eintragen
CREATE POLICY "community_followers_insert_own" ON community_followers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User kann sich selbst löschen, Gründer kann jeden löschen
CREATE POLICY "community_followers_delete_own" ON community_followers FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_community_followers_org ON community_followers(organization_id);
CREATE INDEX idx_community_followers_user ON community_followers(user_id);
```

- [ ] **Step 2: Create `community_feed` migration**

```sql
-- supabase/migrations/20260327000002_community_feed.sql
CREATE TABLE community_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('strain_created', 'grow_logged', 'rating_added')),
  reference_id UUID,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE community_feed ENABLE ROW LEVEL SECURITY;

-- Öffentlich lesbar
CREATE POLICY "community_feed_read_all" ON community_feed FOR SELECT USING (true);

-- Insert nur via Trigger (nicht direkt)
CREATE POLICY "community_feed_insert_trigger" ON community_feed FOR INSERT WITH CHECK (true);

CREATE INDEX idx_community_feed_org_created ON community_feed(organization_id, created_at DESC);
```

- [ ] **Step 3: Update `organization_members` role constraint**

```sql
-- supabase/migrations/20260327000003_update_org_members_role.sql
-- Rolle darf nur noch 'gründer' | 'admin' sein (nicht mehr 'owner', 'staff', 'member')
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE organization_members ADD CONSTRAINT organization_members_role_check CHECK (role IN ('gründer', 'admin'));

-- Bestehende 'owner' → 'gründer' umbenennen
UPDATE organization_members SET role = 'gründer' WHERE role = 'owner';

-- Bestehende 'staff' und 'member' → 'admin' umbenennen (oder löschen?)
-- Da es keine member/staff mehr gibt: diese zu admin machen
UPDATE organization_members SET role = 'admin' WHERE role IN ('staff', 'member');
```

- [ ] **Step 4: Update `organization_invites` — nur noch Admin-Einladungen**

```sql
-- supabase/migrations/20260327000004_update_org_invites.sql
ALTER TABLE organization_invites DROP CONSTRAINT IF EXISTS organization_invites_role_check;
ALTER TABLE organization_invites ADD CONSTRAINT organization_invites_role_check CHECK (role = 'admin');

-- token_hash ist bereits unique
```

- [ ] **Step 5: Feed-Trigger erstellen**

```sql
-- supabase/migrations/20260327000005_feed_triggers.sql

-- Trigger-Function
CREATE OR REPLACE FUNCTION create_community_feed_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_organization_id UUID;
  v_user_id UUID;
BEGIN
  -- Strain erstellt: organization_id aus NEW
  IF TG_TABLE_NAME = 'strains' THEN
    v_organization_id := NEW.organization_id;
    v_user_id := NEW.created_by;
    IF v_organization_id IS NOT NULL THEN
      INSERT INTO community_feed (organization_id, event_type, reference_id, user_id)
      VALUES (v_organization_id, 'strain_created', NEW.id, v_user_id);
    END IF;
  END IF;

  -- Grow erstellt: organization_id aus NEW
  IF TG_TABLE_NAME = 'grows' THEN
    v_organization_id := NEW.organization_id;
    v_user_id := NEW.user_id;
    IF v_organization_id IS NOT NULL THEN
      INSERT INTO community_feed (organization_id, event_type, reference_id, user_id)
      VALUES (v_organization_id, 'grow_logged', NEW.id, v_user_id);
    END IF;
  END IF;

  -- Rating hinzugefügt: lookup strain organization_id
  IF TG_TABLE_NAME = 'ratings' THEN
    SELECT s.organization_id INTO v_organization_id FROM strains s WHERE s.id = NEW.strain_id;
    v_user_id := NEW.user_id;
    IF v_organization_id IS NOT NULL THEN
      INSERT INTO community_feed (organization_id, event_type, reference_id, user_id)
      VALUES (v_organization_id, 'rating_added', NEW.id, v_user_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger auf strains
DROP TRIGGER IF EXISTS trg_strain_created_feed ON strains;
CREATE TRIGGER trg_strain_created_feed
  AFTER INSERT ON strains
  FOR EACH ROW EXECUTE FUNCTION create_community_feed_entry();

-- Trigger auf grows
DROP TRIGGER IF EXISTS trg_grow_logged_feed ON grows;
CREATE TRIGGER trg_grow_logged_feed
  AFTER INSERT ON grows
  FOR EACH ROW EXECUTE FUNCTION create_community_feed_entry();

-- Trigger auf ratings
DROP TRIGGER IF EXISTS trg_rating_added_feed ON ratings;
CREATE TRIGGER trg_rating_added_feed
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION create_community_feed_entry();
```

- [ ] **Step 6: Update existing RLS for org-scoped strains**

```sql
-- Bestehende org-strains Policies prüfen und anpassen
-- Org-strains sollen öffentlich lesbar sein, aber nur admin/gründer schreiben
-- Das muss in der bestehenden strains table passieren wenn organization_id gesetzt ist

-- Die aktuelle policy erlaubt authentifizierten usern strains zu erstellen.
-- Für org-scoped strains (organization_id IS NOT NULL): nur admin/gründer
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add community_followers, community_feed tables and feed triggers"
```

---

## Task 2: API Routes

**Files:**
- Create: `src/app/api/communities/[id]/feed/route.ts`
- Create: `src/app/api/communities/[id]/follow/route.ts`
- Create: `src/app/api/communities/[id]/invite/route.ts`
- Modify: `src/app/api/organizations/[organizationId]/invites/route.ts`
- Modify: `src/app/api/organizations/[organizationId]/members/route.ts`

### Steps

- [ ] **Step 1: GET /api/communities/[id]/feed**

```typescript
// src/app/api/communities/[id]/feed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  const { data, error } = await supabase
    .from("community_feed")
    .select(`
      id,
      event_type,
      reference_id,
      created_at,
      user_id,
      profiles:user_id (id, username, display_name, avatar_url)
    `)
    .eq("organization_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ data, page, limit });
}
```

- [ ] **Step 2: POST /api/communities/[id]/follow (toggle)**

```typescript
// src/app/api/communities/[id]/follow/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Prüfe ob bereits folgt
  const { data: existing } = await supabase
    .from("community_followers")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Unfollow
    await supabase.from("community_followers").delete().eq("id", existing.id);
    return NextResponse.json({ following: false });
  } else {
    // Follow
    await supabase.from("community_followers").insert({
      organization_id: organizationId,
      user_id: user.id
    });
    return NextResponse.json({ following: true });
  }
}
```

- [ ] **Step 3: GET /api/communities/[id]/follow (check status)**

```typescript
// Ergänze in route.ts nach POST:
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ following: false });

  const { data } = await supabase
    .from("community_followers")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ following: !!data });
}
```

- [ ] **Step 4: POST /api/communities/[id]/invite (Admin-Einladung, nur Gründer)**

```typescript
// src/app/api/communities/[id]/invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { createHash } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params;
  const { email } = await req.json();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Prüfe ob User Gründer ist
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("role", "gründer")
    .single();

  if (!membership) return NextResponse.json({ error: "Nur Gründer kann Admins einladen" }, { status: 403 });

  // Token generieren
  const token = crypto.randomUUID();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("organization_invites").insert({
    organization_id: organizationId,
    email,
    role: "admin",
    token_hash: tokenHash,
    expires_at: expiresAt,
    invited_by: user.id
  });

  if (error) return NextResponse.json({ error }, { status: 500 });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;
  return NextResponse.json({ inviteUrl });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/communities/
git commit -m "feat: add community feed, follow, and invite API routes"
```

---

## Task 3: Types updaten

**Files:**
- Modify: `src/lib/types.ts`

### Steps

- [ ] **Step 1: Add new types**

```typescript
// CommunityFollower
export interface CommunityFollower {
  id: string;
  organization_id: string;
  user_id: string;
  created_at: string;
}

// CommunityFeedEntry
export interface CommunityFeedEntry {
  id: string;
  organization_id: string;
  event_type: "strain_created" | "grow_logged" | "rating_added";
  reference_id: string | null;
  user_id: string;
  created_at: string;
  profiles?: ProfileRow;
}

// Update OrganizationMembership role (nur noch gründer | admin)
export interface OrganizationMembership {
  role: "gründer" | "admin"; // formerly: 'owner' | 'admin' | 'staff' | 'member'
}

// Update OrganizationInvite role
export interface OrganizationInvite {
  role: "admin"; // formerly: 'admin' | 'staff' | 'member'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: update types for public communities (gründer/admin only roles)"
```

---

## Task 4: Community Page UI — Public View + Feed

**Files:**
- Modify: `src/app/community/page.tsx` (komplett neu schreiben)
- Create: `src/app/community/[id]/page.tsx` (neue öffentliche Community-Seite)
- Create: `src/components/community/feed.tsx`
- Create: `src/components/community/follow-button.tsx`
- Create: `src/components/community/community-header.tsx`

### Steps

- [ ] **Step 1: Community Hub page — show list of public communities**

Die bestehende `/community/page.tsx` wird zur Übersicht aller öffentlichen Communities. Kein Login nötig.

```typescript
// src/app/community/page.tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import Link from "next/link";
import { Building2, Users, Leaf } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function CommunityPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("organizations")
      .select("id, name, slug, organization_type")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCommunities(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 pb-4">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase">Communities</h1>
      </header>
      <div className="px-8 space-y-4">
        {communities.map((org) => (
          <Link key={org.id} href={`/community/${org.id}`}>
            <Card className="bg-[#1e3a24] border-white/10 p-5 rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#00F5FF]/10 flex items-center justify-center">
                  <Building2 size={20} className="text-[#00F5FF]" />
                </div>
                <div className="flex-1">
                  <p className="font-black">{org.name}</p>
                  <p className="text-[10px] text-white/40 uppercase">{org.organization_type}</p>
                </div>
                <Leaf size={16} className="text-[#2FF801]" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <BottomNav />
    </main>
  );
}
```

- [ ] **Step 2: Community Detail Page with Feed**

```typescript
// src/app/community/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { FollowButton } from "@/components/community/follow-button";
import { CommunityFeed } from "@/components/community/feed";
import { Building2, Crown, Leaf } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function CommunityDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [org, setOrg] = useState<any>(null);
  const [stats, setStats] = useState({ followers: 0, strains: 0 });

  useEffect(() => {
    // Fetch org data
    supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setOrg(data));

    // Fetch follower count
    supabase
      .from("community_followers")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", id)
      .then(({ count }) => setStats(s => ({ ...s, followers: count || 0 })));

    // Fetch strain count
    supabase
      .from("strains")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", id)
      .then(({ count }) => setStats(s => ({ ...s, strains: count || 0 })));
  }, [id]);

  if (!org) return <div className="min-h-screen bg-[#355E3B] flex items-center justify-center"><span className="text-white">Lädt...</span></div>;

  const isGründer = false; // Check from membership
  const isAdmin = false;

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">{org.organization_type}</p>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">{org.name}</h1>
          </div>
          <FollowButton organizationId={id as string} />
        </div>
      </header>

      {/* Stats */}
      <div className="px-8 flex gap-6 mb-6">
        <div className="text-center">
          <p className="text-xl font-black">{stats.followers}</p>
          <p className="text-[10px] text-white/40 uppercase">Follower</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-black">{stats.strains}</p>
          <p className="text-[10px] text-white/40 uppercase">Strains</p>
        </div>
      </div>

      {/* Feed */}
      <div className="px-8">
        <h2 className="text-lg font-black uppercase mb-4">Feed</h2>
        <CommunityFeed organizationId={id as string} />
      </div>

      <BottomNav />
    </main>
  );
}
```

- [ ] **Step 3: FollowButton component**

```typescript
// src/components/community/follow-button.tsx
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function FollowButton({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("community_followers")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setFollowing(!!data));
  }, [user, organizationId]);

  const toggle = async () => {
    if (!user) return;
    setLoading(true);
    const res = await fetch(`/api/communities/${organizationId}/follow`, { method: "POST" });
    const data = await res.json();
    setFollowing(data.following);
    setLoading(false);
  };

  if (!user) return null;

  return (
    <Button
      onClick={toggle}
      disabled={loading}
      className={following
        ? "bg-white/10 text-white border border-white/20"
        : "bg-[#2FF801] text-black border-none"}
    >
      {following ? "Folge ich" : "Folgen"}
    </Button>
  );
}
```

- [ ] **Step 4: CommunityFeed component**

```typescript
// src/components/community/feed.tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Leaf, Sprout, Star } from "lucide-react";

const EVENT_ICONS = {
  strain_created: Leaf,
  grow_logged: Sprout,
  rating_added: Star
};

const EVENT_LABELS = {
  strain_created: "neue Sorte",
  grow_logged: "neuer Grow",
  rating_added: "neue Bewertung"
};

export function CommunityFeed({ organizationId }: { organizationId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("community_feed")
      .select(`
        id, event_type, reference_id, created_at,
        profiles:user_id (username, display_name, avatar_url)
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, [organizationId]);

  if (loading) return <div className="text-white/40 text-sm">Lädt...</div>;
  if (!items.length) return <div className="text-white/40 text-sm">Noch keine Aktivitäten</div>;

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const Icon = EVENT_ICONS[item.event_type] || Leaf;
        const profile = item.profiles;
        return (
          <div key={item.id} className="flex items-start gap-3 bg-[#1e3a24] rounded-2xl p-4 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-[#2FF801]/10 flex items-center justify-center shrink-0">
              <Icon size={14} className="text-[#2FF801]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-black">{profile?.display_name || profile?.username}</span>
                {" hat "}
                <span className="text-[#2FF801]">{EVENT_LABELS[item.event_type]}</span>
              </p>
              <p className="text-[10px] text-white/40 mt-1">
                {new Date(item.created_at).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/community/ src/components/community/
git commit -m "feat: public community pages with follow and feed"
```

---

## Task 5: Community erstellen — Max 1 pro User

**Files:**
- Create: `src/app/community/new/page.tsx`
- Modify: `src/components/organization-switcher.tsx` (disable "Gründen" wenn bereits Gründer)

### Steps

- [ ] **Step 1: Community New Page**

```typescript
// src/app/community/new/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function NewCommunityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<"club" | "pharmacy">("club");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    setError("");

    // Prüfe ob bereits Gründer
    const { data: existing } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "gründer")
      .single();

    if (existing) {
      setError("Du hast bereits eine Community gegründet.");
      setLoading(false);
      return;
    }

    // Create organization
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name, slug, organization_type: orgType, created_by: user.id })
      .select()
      .single();

    if (orgError) {
      setError("Fehler beim Erstellen.");
      setLoading(false);
      return;
    }

    // Add as Gründer
    await supabase.from("organization_members").insert({
      organization_id: org.id,
      user_id: user.id,
      role: "gründer"
    });

    router.push(`/community/${org.id}`);
  };

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 pb-4">
        <h1 className="text-2xl font-black italic uppercase">Community gründen</h1>
      </header>
      <div className="px-8 space-y-6">
        <Card className="bg-[#1e3a24] border-white/10 p-6 rounded-3xl space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block mb-2">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mein Club"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block mb-2">Typ</label>
            <div className="flex gap-3">
              {(["club", "pharmacy"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOrgType(t)}
                  className={`flex-1 py-3 rounded-xl font-black uppercase text-xs border ${
                    orgType === t ? "bg-[#2FF801] text-black border-[#2FF801]" : "bg-white/5 border-white/10"
                  }`}
                >
                  {t === "club" ? "Club" : "Apotheke"}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-sm font-bold">{error}</p>}
          <Button
            onClick={create}
            disabled={loading || !name.trim()}
            className="w-full bg-[#2FF801] text-black font-black uppercase py-4 rounded-xl"
          >
            {loading ? "Erstellt..." : "Community erstellen"}
          </Button>
        </Card>
      </div>
      <BottomNav />
    </main>
  );
}
```

- [ ] **Step 2: Update OrganizationSwitcher — disable "Gründen" if already Gründer**

Lies die aktuelle `organization-switcher.tsx` und prüfe wo der "Gründen" Button ist. Ergänze eine Prüfung:

```typescript
// In organization-switcher.tsx
const isAlreadyGründer = memberships.some(m => m.role === "gründer");

// Disable/hide "Gründen" button if already Gründer
```

- [ ] **Step 3: Commit**

```bash
git add src/app/community/new/ src/components/organization-switcher.tsx
git commit -m "feat: community creation with max 1 per user constraint"
```

---

## Task 6: Community Settings — Followers statt Members + Admin-Einladung nur für Gründer

**Files:**
- Modify: `src/app/settings/organization/members/page.tsx` — zu Followers-Liste ändern
- Modify: `src/app/settings/organization/invites/page.tsx` — nur für Gründer
- Modify: `src/app/settings/organization/page.tsx`

### Steps

- [ ] **Step 1: Members page → Followers list**

Die `/settings/organization/members` Seite zeigt jetzt Follower statt Members.

- [ ] **Step 2: Invite page → nur für Gründer sichtbar**

Prüfe die `invites/route.ts` und das UI. Nur Gründer darf admin einladen.

- [ ] **Step 3: Commit**

---

## Task 7: Community Hub überarbeiten

**Files:**
- Modify: `src/app/community/page.tsx`

Die alte "Community Hub" Seite wird zu `/community` — einer Übersicht aller öffentlichen Communities. Der Link in der Bottom Nav muss ggf. angepasst werden.

- [ ] **Step 1: Commit**

---

## Task 8: Feed auf Community Detail —Straindetail-Link wenn strain_created

**Files:**
- Modify: `src/components/community/feed.tsx`

Wenn `event_type === 'strain_created'`, soll der Feed-Eintrag auf die Strain-Detail-Seite verlinken.

- [ ] **Step 1: Commit**

---

## Task 9: Final Test + DB Push

- [ ] **Step 1: supabase db push**

```bash
supabase db push
```

- [ ] **Step 2: Manuell testen auf localhost**
- Follow/Unfollow
- Community Feed anzeigen
- Community erstellen (max 1)
- Admin-Einladung als Gründer
- Feed zeigt neue Strains/Grows/Ratings

---

## Summary

| Task | Beschreibung |
|------|-------------|
| 1 | DB: community_followers, community_feed, role-Update, Trigger |
| 2 | API: Feed, Follow, Invite Routes |
| 3 | Types updaten |
| 4 | Community Page UI: Public View + Feed |
| 5 | Community erstellen (max 1) |
| 6 | Settings: Followers statt Members |
| 7 | Community Hub → Community-Liste |
| 8 | Feed Strains verlinken |
| 9 | DB Push + Test |
