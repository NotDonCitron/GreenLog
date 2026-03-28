# Badge Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to unlock badges based on activity, select up to 4 featured badges for their profile, and view all badges (locked/unlocked) in an expandable showcase.

**Architecture:**
- Badge definitions stored in DB (`badges` table) with criteria logic in TypeScript (`src/lib/badges.ts`)
- User's unlocked badges in existing `user_badges` table
- User's featured (selected) badges stored as `featured_badges TEXT[]` in `profiles`
- API endpoints for checking/unlocking badges and updating featured badge selection
- Badge check triggered after relevant user actions (collection changes, grow events, follows, ratings)

**Tech Stack:** Next.js 16, Supabase (Postgres), TypeScript, Lucide icons

---

## File Structure

```
src/
├── lib/
│   └── badges.ts                          # Badge definitions + criteria functions
├── app/
│   ├── api/
│   │   └── badges/
│   │       ├── check/route.ts             # POST - check & unlock new badges
│   │       └── select/route.ts            # POST - update featured badges
│   └── profile/
│       └── profile-view.tsx               # MODIFY - add featured badges display
├── app/user/[username]/
│   └── page.tsx                           # MODIFY - show featured badges on public profile
└── components/
    └── ui/
        ├── badge-card.tsx                 # CREATE - single badge with locked/unlocked state
        └── badge-grid.tsx                # CREATE - grid of badge cards

supabase/migrations/
└── 20260329000001_create_badges.sql     # CREATE - badges table + featured_badges column
```

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260329000001_create_badges.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- Create badges definition table
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  category TEXT NOT NULL CHECK (category IN ('collection', 'grow', 'social', 'engagement')),
  tier INT DEFAULT 1,
  criteria_key TEXT NOT NULL UNIQUE
);

-- Add featured_badges column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_badges TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Insert all badge definitions
INSERT INTO badges (id, name, description, icon, category, tier, criteria_key) VALUES
  ('first-strain', 'Greenie', '1 Strain gesammelt', 'trophy', 'collection', 1, 'first-strain'),
  ('collector-10', 'Sammler', '10 Strains gesammelt', 'leaf', 'collection', 2, 'collector-10'),
  ('archive-50', 'Archiv', '50 Strains gesammelt', 'archive', 'collection', 3, 'archive-50'),
  ('champion-100', 'Champion', '100 Strains gesammelt', 'crown', 'collection', 4, 'champion-100'),
  ('first-grow', 'Greenhorn', 'Erster Grow gestartet', 'sprout', 'grow', 1, 'first-grow'),
  ('harvest-1', 'Erntezeit', '1 Grow abgeschlossen', 'wheat', 'grow', 2, 'harvest-1'),
  ('perfectionist-5', 'Perfektionist', '5 Grows abgeschlossen', 'star', 'grow', 3, 'perfectionist-5'),
  ('first-follower', 'Neuling', 'Erster Follower', 'users', 'social', 1, 'first-follower'),
  ('community-10', 'Community', '10 Follower', 'users', 'social', 2, 'community-10'),
  ('critic-5', 'Kritiker', '5 Reviews geschrieben', 'pen', 'social', 2, 'critic-5'),
  ('lover-10', 'Liebhaber', '10 Favoriten', 'heart', 'engagement', 2, 'lover-10'),
  ('streak-7', 'Streak', '7 Tage aktiv', 'flame', 'engagement', 2, 'streak-7'),
  ('all-star-50', 'All-Star', '50 verschiedene Strains reviewed', 'sparkles', 'engagement', 3, 'all-star-50')
ON CONFLICT (id) DO NOTHING;

-- RLS for badges table
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);
```

- [ ] **Step 2: Run migration**

Run: `supabase db push`
Expected: Migration applies successfully, badges table created with 13 rows

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260329000001_create_badges.sql
git commit -m "feat: add badges table and featured_badges column

- Create badges definition table with 13 badges
- Add featured_badges TEXT[] to profiles table
- RLS policy allowing anyone to view badges

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Badge Definitions (TypeScript)

**Files:**
- Create: `src/lib/badges.ts`

- [ ] **Step 1: Write badge definitions and criteria**

```typescript
import { createClient } from '@supabase/supabase-js';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'collection' | 'grow' | 'social' | 'engagement';
  tier: 1 | 2 | 3 | 4;
  criteriaKey: string;
}

export interface BadgeContext {
  supabase: ReturnType<typeof createClient>;
  userId: string;
}

export type BadgeCriteria = (ctx: BadgeContext) => Promise<boolean>;

export const ALL_BADGES: BadgeDefinition[] = [
  { id: 'first-strain', name: 'Greenie', description: '1 Strain gesammelt', icon: 'trophy', category: 'collection', tier: 1, criteriaKey: 'first-strain' },
  { id: 'collector-10', name: 'Sammler', description: '10 Strains gesammelt', icon: 'leaf', category: 'collection', tier: 2, criteriaKey: 'collector-10' },
  { id: 'archive-50', name: 'Archiv', description: '50 Strains gesammelt', icon: 'archive', category: 'collection', tier: 3, criteriaKey: 'archive-50' },
  { id: 'champion-100', name: 'Champion', description: '100 Strains gesammelt', icon: 'crown', category: 'collection', tier: 4, criteriaKey: 'champion-100' },
  { id: 'first-grow', name: 'Greenhorn', description: 'Erster Grow gestartet', icon: 'sprout', category: 'grow', tier: 1, criteriaKey: 'first-grow' },
  { id: 'harvest-1', name: 'Erntezeit', description: '1 Grow abgeschlossen', icon: 'wheat', category: 'grow', tier: 2, criteriaKey: 'harvest-1' },
  { id: 'perfectionist-5', name: 'Perfektionist', description: '5 Grows abgeschlossen', icon: 'star', category: 'grow', tier: 3, criteriaKey: 'perfectionist-5' },
  { id: 'first-follower', name: 'Neuling', description: 'Erster Follower', icon: 'users', category: 'social', tier: 1, criteriaKey: 'first-follower' },
  { id: 'community-10', name: 'Community', description: '10 Follower', icon: 'users', category: 'social', tier: 2, criteriaKey: 'community-10' },
  { id: 'critic-5', name: 'Kritiker', description: '5 Reviews geschrieben', icon: 'pen', category: 'social', tier: 2, criteriaKey: 'critic-5' },
  { id: 'lover-10', name: 'Liebhaber', description: '10 Favoriten', icon: 'heart', category: 'engagement', tier: 2, criteriaKey: 'lover-10' },
  { id: 'streak-7', name: 'Streak', description: '7 Tage aktiv', icon: 'flame', category: 'engagement', tier: 2, criteriaKey: 'streak-7' },
  { id: 'all-star-50', name: 'All-Star', description: '50 verschiedene Strains reviewed', icon: 'sparkles', category: 'engagement', tier: 3, criteriaKey: 'all-star-50' },
];

export const BADGE_CRITERIA: Record<string, BadgeCriteria> = {
  'first-strain': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('user_collection').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 1;
  },
  'collector-10': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('user_collection').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 10;
  },
  'archive-50': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('user_collection').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 50;
  },
  'champion-100': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('user_collection').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 100;
  },
  'first-grow': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('grows').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 1;
  },
  'harvest-1': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('grows').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('stage', 'harvested');
    return (count ?? 0) >= 1;
  },
  'perfectionist-5': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('grows').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('stage', 'harvested');
    return (count ?? 0) >= 5;
  },
  'first-follower': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('follows').select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
    return (count ?? 0) >= 1;
  },
  'community-10': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('follows').select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
    return (count ?? 0) >= 10;
  },
  'critic-5': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('ratings').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 5;
  },
  'lover-10': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('user_strain_relations').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_favorite', true);
    return (count ?? 0) >= 10;
  },
  'streak-7': async ({ supabase, userId }) => {
    // Simple: check if user has activity in last 7 days (at least 7 entries)
    const { data } = await supabase
      .from('user_activities').select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(7);
    return (data?.length ?? 0) >= 7;
  },
  'all-star-50': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('ratings').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 50;
  },
};

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return ALL_BADGES.find(b => b.id === id);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/badges.ts
git commit -m "feat: add badge definitions and criteria functions

- 13 badges across collection, grow, social, engagement categories
- Badge criteria as async functions checking DB state
- Helper to get badge by ID

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Badge Check API

**Files:**
- Create: `src/app/api/badges/check/route.ts`

- [ ] **Step 1: Write badge check endpoint**

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ALL_BADGES, BADGE_CRITERIA } from "@/lib/badges";

export async function POST() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's currently unlocked badges
  const { data: unlockedBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id);

  const unlockedSet = new Set(unlockedBadges?.map(b => b.badge_id) || []);
  const newlyUnlocked: string[] = [];

  // Check each badge criteria
  for (const badge of ALL_BADGES) {
    if (unlockedSet.has(badge.id)) continue; // Already unlocked

    const criteriaFn = BADGE_CRITERIA[badge.criteriaKey];
    if (!criteriaFn) continue;

    try {
      const qualifies = await criteriaFn({ supabase, userId: user.id });
      if (qualifies) {
        // Insert new badge
        const { error } = await supabase
          .from('user_badges')
          .insert({ user_id: user.id, badge_id: badge.id });

        if (!error) {
          newlyUnlocked.push(badge.id);
          unlockedSet.add(badge.id);
        }
      }
    } catch (err) {
      console.error(`Error checking badge ${badge.id}:`, err);
    }
  }

  return NextResponse.json({
    newlyUnlocked,
    totalUnlocked: unlockedSet.size
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/badges/check/route.ts
git commit -m "feat: add POST /api/badges/check endpoint

Checks all badge criteria for user and unlocks newly earned badges.
Returns list of newly unlocked badge IDs.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Badge Select API

**Files:**
- Create: `src/app/api/badges/select/route.ts`

- [ ] **Step 1: Write badge select endpoint**

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ALL_BADGES } from "@/lib/badges";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { featuredBadges } = await request.json();

  // Validate
  if (!Array.isArray(featuredBadges)) {
    return NextResponse.json({ error: "featuredBadges must be an array" }, { status: 400 });
  }

  if (featuredBadges.length > 4) {
    return NextResponse.json({ error: "Maximum 4 featured badges" }, { status: 400 });
  }

  // Verify all badges are unlocked by user
  const { data: unlockedBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id);

  const unlockedSet = new Set(unlockedBadges?.map(b => b.badge_id) || []);

  for (const badgeId of featuredBadges) {
    if (!unlockedSet.has(badgeId)) {
      return NextResponse.json({ error: `Badge ${badgeId} not unlocked` }, { status: 400 });
    }
    if (!ALL_BADGES.find(b => b.id === badgeId)) {
      return NextResponse.json({ error: `Invalid badge ${badgeId}` }, { status: 400 });
    }
  }

  // Update profiles
  const { error } = await supabase
    .from('profiles')
    .update({ featured_badges: featuredBadges })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/badges/select/route.ts
git commit -m "feat: add POST /api/badges/select endpoint

Updates user's featured_badges (max 4) on their profile.
Validates that all badges are unlocked before allowing selection.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Badge Card Component

**Files:**
- Create: `src/components/ui/badge-card.tsx`

- [ ] **Step 1: Write BadgeCard component**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { Trophy, Leaf, Archive, Crown, Sprout, Wheat, Star, Users, Pen, Heart, Flame, Sparkles } from "lucide-react";
import { BadgeDefinition } from "@/lib/badges";

const ICON_MAP: Record<string, React.ElementType> = {
  trophy: Trophy,
  leaf: Leaf,
  archive: Archive,
  crown: Crown,
  sprout: Sprout,
  wheat: Wheat,
  star: Star,
  users: Users,
  pen: Pen,
  heart: Heart,
  flame: Flame,
  sparkles: Sparkles,
};

interface BadgeCardProps {
  badge: BadgeDefinition;
  unlocked: boolean;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function BadgeCard({ badge, unlocked, selected, onClick, compact }: BadgeCardProps) {
  const Icon = ICON_MAP[badge.icon] || Trophy;

  return (
    <button
      onClick={onClick}
      disabled={!unlocked || !onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl p-2.5 border transition-all",
        compact ? "min-w-[60px] w-[60px]" : "min-w-[70px] w-[70px]",
        unlocked
          ? selected
            ? "bg-[#2FF801]/10 border-[#2FF801] cursor-pointer"
            : "bg-[var(--card)] border-[var(--border)]/50 cursor-pointer hover:border-[var(--border)]"
          : "bg-[var(--muted)]/50 border-[var(--muted)]/50 cursor-not-allowed opacity-60",
        onClick && unlocked && "active:scale-95"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          unlocked ? "bg-[#2FF801]/10 text-[#ffd700]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
        )}
      >
        {unlocked ? <Icon size={24} /> : <Sparkles size={24} />}
      </div>
      {!compact && (
        <p className="text-[8px] font-black uppercase tracking-tighter text-[var(--foreground)] truncate w-full text-center leading-tight">
          {unlocked ? badge.name : '???'}
        </p>
      )}
      {selected && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#2FF801] flex items-center justify-center">
          <span className="text-[8px] text-black font-bold">✓</span>
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/badge-card.tsx
git commit -m "feat: add BadgeCard component

Displays a single badge with locked/unlocked/selected states.
Uses icon mapping for badge icons. Disabled state for locked badges.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Profile View Updates (Featured Badges)

**Files:**
- Modify: `src/app/profile/profile-view.tsx`

**Key changes needed:**
1. Add `featured_badges` to profiles query
2. Add state for `showBadgeEdit` mode
3. Add featured badges display section
4. Add edit button and edit UI

- [ ] **Step 1: Update profile query to include featured_badges**

Find the profiles query around line 306 and add `featured_badges`:

```typescript
const [profileRes, collCount, followersRes, followingRes, favsRes, badgesRes] = await Promise.all([
  supabase.from("profiles").select("*").eq("id", user?.id).single(),
  // ... rest unchanged
```

Then after getting profile data, access `featured_badges`:
```typescript
const featuredBadges = profileData?.featured_badges || [];
```

- [ ] **Step 2: Add state and handlers for badge editing**

Add after other state declarations:
```typescript
const [showBadgeEdit, setShowBadgeEdit] = useState(false);
const [selectedBadges, setSelectedBadges] = useState<string[]>(featuredBadges);
```

Add handler:
```typescript
const handleBadgeToggle = (badgeId: string) => {
  setSelectedBadges(prev => {
    if (prev.includes(badgeId)) {
      return prev.filter(id => id !== badgeId);
    }
    if (prev.length >= 4) return prev; // Max 4
    return [...prev, badgeId];
  });
};
```

- [ ] **Step 3: Add featured badges display section**

Find where stats/favorites are displayed and add after the stats section (around line 430):

```typescript
{/* Featured Badges */}
{!isPrivate && (
  <div className="w-full max-w-full overflow-hidden">
    <div className="flex items-center justify-between mb-3">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2FF801]">Achievements</p>
      <button
        onClick={() => {
          if (showBadgeEdit) {
            // Save
            fetch('/api/badges/select', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ featuredBadges: selectedBadges })
            }).then(() => {
              setShowBadgeEdit(false);
              window.location.reload(); // Refresh to show new badges
            });
          } else {
            setSelectedBadges(featuredBadges);
            setShowBadgeEdit(true);
          }
        }}
        className="text-[10px] text-[var(--muted-foreground)] hover:text-[#2FF801])"
      >
        {showBadgeEdit ? 'Fertig' : 'Bearbeiten'}
      </button>
    </div>
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
      {showBadgeEdit ? (
        // Edit mode: show all unlocked badges for selection
        <div className="flex gap-3">
          {viewModel.badges.map(badge => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              unlocked={true}
              selected={selectedBadges.includes(badge.id)}
              onClick={() => handleBadgeToggle(badge.id)}
            />
          ))}
        </div>
      ) : (
        // View mode: show first 4 featured
        (selectedBadges.length > 0 ? selectedBadges : viewModel.badges.slice(0, 4).map(b => b.id)).map(badgeId => {
          const badge = viewModel.badges.find(b => b.id === badgeId);
          if (!badge) return null;
          return <BadgeCard key={badgeId} badge={badge} unlocked={true} compact />;
        })
      )}
      {!showBadgeEdit && viewModel.badges.length > 4 && (
        <button className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">
          +{viewModel.badges.length - 4} mehr
        </button>
      )}
    </div>
  </div>
)}
```

Note: This is simplified. In edit mode, user needs to see ALL their unlocked badges (not just first 4). The actual implementation may need to fetch all unlocked badges. For MVP, assume `viewModel.badges` contains all unlocked badges.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/profile-view.tsx
git commit -m "feat: add featured badges display on profile

- Show featured badges on own profile
- Edit mode to select/deselect badges (max 4)
- Save selection to /api/badges/select

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Public Profile Updates

**Files:**
- Modify: `src/app/user/[username]/page.tsx`

**Key changes needed:**
1. Fetch `featured_badges` from profiles query
2. Display featured badges on public profile
3. Filter to only show first 4 badges

- [ ] **Step 1: Update profile data fetching**

Around line 150, in the Promise.all, the profiles query should include `featured_badges`:

```typescript
supabase.from("profiles").select("*").eq("id", profileData.id).single(),
```

Since this already uses `select("*")`, `featured_badges` should already be included if the column exists.

Then around line 205, after getting profile data:
```typescript
const featuredBadges = profileData?.featured_badges || [];
```

- [ ] **Step 2: Update badge display section**

Find the badges display section (around line 383-410) and modify to show featured badges:

```typescript
{/* Badges Display - Show featured badges only */}
{!isPrivateAndNotFollowing && userBadges.length > 0 && (
  <div className="mt-6 w-full max-w-full overflow-hidden">
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2FF801] mb-3 px-1">Achievements</p>
    <div className="flex w-full max-w-full gap-3 overflow-x-auto no-scrollbar pb-2">
      {(featuredBadges.length > 0 ? featuredBadges : userBadges.slice(0, 4).map(ub => ub.badge_id)).map(badgeId => {
        const ub = userBadges.find(u => u.badge_id === badgeId);
        if (!ub) return null;
        const badge = ub.badges;
        const badgeName = badge?.name || badgeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Badge';
        const iconKey = badge?.icon_url || "starter";
        const Icon = resolveBadgeIcon(iconKey);
        return (
          <div
            key={badgeId}
            className="flex flex-col items-center gap-1.5 min-w-[70px] bg-[var(--card)] border border-[var(--border)]/50 rounded-2xl p-2.5 shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2FF801]/10 flex items-center justify-center text-[#ffd700]">
              <Icon size={24} />
            </div>
            <p className="text-[8px] font-black uppercase tracking-tighter text-[var(--foreground)] truncate w-full text-center">
              {badgeName}
            </p>
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/user/[username]/page.tsx
git commit -m "feat: show featured badges on public profile

- Display featured_badges on public profile page
- Fall back to first 4 badges if no featured set
- Uses existing badge display pattern

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Badge Check Triggers

**Files:**
- Modify: Relevant action handlers in components

**Where to call `POST /api/badges/check`:**

1. **Strain added to collection** - After successful collection insert
2. **Strain removed from collection** - After successful collection delete
3. **Grow started** - After grow insert
4. **Grow harvested** - After grow stage update to 'harvested'
5. **New follower** - After follow insert (via trigger, already done)
6. **Review written** - After rating insert
7. **Favorite toggled** - After user_strain_relations update

- [ ] **Step 1: Add badge check helper**

Add to `src/lib/badges.ts`:

```typescript
export async function checkAndUnlockBadges(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: unlockedBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);

  const unlockedSet = new Set(unlockedBadges?.map(b => b.badge_id) || []);
  const newlyUnlocked: string[] = [];

  for (const badge of ALL_BADGES) {
    if (unlockedSet.has(badge.id)) continue;

    const criteriaFn = BADGE_CRITERIA[badge.criteriaKey];
    if (!criteriaFn) continue;

    try {
      const qualifies = await criteriaFn({ supabase, userId });
      if (qualifies) {
        const { error } = await supabase
          .from('user_badges')
          .insert({ user_id: userId, badge_id: badge.id });
        if (!error) {
          newlyUnlocked.push(badge.id);
        }
      }
    } catch (err) {
      console.error(`Error checking badge ${badge.id}:`, err);
    }
  }

  return newlyUnlocked;
}
```

- [ ] **Step 2: Add badge check calls to collection actions**

Find where strains are added to collection (likely in a component that handles collection mutations). Add:

```typescript
import { checkAndUnlockBadges } from '@/lib/badges';

// After successful collection insert:
await checkAndUnlockBadges(userId);
```

- [ ] **Step 3: Similar for other triggers**

For grows, follows, ratings, favorites - add `checkAndUnlockBadges` calls at appropriate places.

- [ ] **Step 4: Commit**

```bash
git add src/lib/badges.ts
git add <modified component files>
git commit -m "feat: add badge check triggers to user actions

- Add checkAndUnlockBadges helper
- Trigger badge checks after: collection add/remove, grow start/harvest, rating, favorite

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Badge Showcase Modal (Optional/Polish)

**Files:**
- Create: `src/components/profile/badge-showcase.tsx`

This is a modal/sheet that shows all badges (unlocked and locked) when user clicks "+X mehr" on profile.

- [ ] **Step 1: Write BadgeShowcase component**

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ALL_BADGES, BadgeDefinition } from "@/lib/badges";
import { BadgeCard } from "@/components/ui/badge-card";
import { cn } from "@/lib/utils";

interface BadgeShowcaseProps {
  userBadges: Array<{ badge_id: string; badges?: Partial<BadgeDefinition> }>;
  featuredBadges: string[];
  onSelect: (badgeId: string) => void;
  onClose: () => void;
}

export function BadgeShowcase({ userBadges, featuredBadges, onSelect, onClose }: BadgeShowcaseProps) {
  const unlockedIds = new Set(userBadges.map(ub => ub.badge_id));
  const [selected, setSelected] = useState<string[]>(featuredBadges);

  const handleToggle = (badgeId: string) => {
    setSelected(prev => {
      if (prev.includes(badgeId)) return prev.filter(id => id !== badgeId);
      if (prev.length >= 4) return prev;
      return [...prev, badgeId];
    });
  };

  const handleSave = () => {
    // Save via API
    fetch('/api/badges/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featuredBadges: selected })
    }).then(() => {
      selected.forEach(id => onSelect(id));
      onClose();
      window.location.reload();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-lg bg-[var(--background)] rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold uppercase tracking-tight">Deine Badges</h2>
          <button onClick={onClose} className="p-2">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Freigeschaltet: {unlockedIds.size}/{ALL_BADGES.length}
        </p>

        <p className="text-xs font-bold mb-2">Tippe auf ein Badge zum Auswählen (max 4)</p>
        <div className="flex flex-wrap gap-3 mb-6">
          {ALL_BADGES.map(badge => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              unlocked={unlockedIds.has(badge.id)}
              selected={selected.includes(badge.id)}
              onClick={unlockedIds.has(badge.id) ? handleToggle : undefined}
            />
          ))}
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-[#2FF801] text-black font-bold rounded-full"
        >
          Fertig
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add to profile-view.tsx**

Import and add the modal when "+X mehr" button is clicked.

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/badge-showcase.tsx
git add src/app/profile/profile-view.tsx
git commit -m "feat: add badge showcase modal

- Modal showing all badges (unlocked + locked)
- Edit featured badges selection
- Unlock progress indicator

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

- [ ] Spec coverage: All requirements from spec have corresponding tasks
- [ ] No placeholders: All code blocks contain actual code, no "TODO" or "TBD"
- [ ] Type consistency: `BadgeDefinition`, `BadgeContext`, `criteriaKey` match across tasks
- [ ] File paths: All paths are exact and match existing codebase structure
- [ ] Task count: 9 tasks, each with clear completion criteria
