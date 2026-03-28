# Badge Showcase Design

## Overview

Expand the current badge system to allow users to:
1. Unlock badges based on collection, grow, social, and engagement criteria
2. Select up to 4 badges to display prominently on their profile
3. View all unlocked badges in an expandable showcase
4. See locked badges as motivation ("coming soon")

## Data Model

### Database Changes

**New `badges` table:**
```sql
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  category TEXT NOT NULL CHECK (category IN ('collection', 'grow', 'social', 'engagement')),
  tier INT DEFAULT 1,
  criteria_key TEXT NOT NULL UNIQUE
);
```

**Extended `profiles` table:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_badges TEXT[] DEFAULT ARRAY[]::TEXT[];
```

**Existing `user_badges` table** (already exists):
```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
```

### Badge Definitions (TypeScript)

```typescript
// src/lib/badges.ts

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon key
  category: 'collection' | 'grow' | 'social' | 'engagement';
  tier: 1 | 2 | 3 | 4;
  criteriaKey: string;
  criteria: (ctx: BadgeContext) => Promise<boolean>;
}

interface BadgeContext {
  supabase: SupabaseClient;
  userId: string;
}

// Badge criteria functions return true if user qualifies
const badgeCriteria: Record<string, (ctx: BadgeContext) => Promise<boolean>> = {
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
    // Check if user has been active in the last 7 consecutive days
    // This would require an activity tracking table or check user_activities
    const { data } = await supabase
      .from('user_activities').select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(7);
    if (!data || data.length < 7) return false;
    // Check consecutive days logic here
    return true;
  },
  'all-star-50': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('ratings').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 50;
  },
};

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
```

## API Design

### `POST /api/badges/check`
Runs badge criteria check for a user and unlocks any newly earned badges.

**Request:** No body needed (uses session)

**Response:**
```json
{
  "newlyUnlocked": ["first-strain", "collector-10"],
  "totalUnlocked": 5
}
```

### `POST /api/badges/select`
Updates the user's featured badges.

**Request:**
```json
{
  "featuredBadges": ["first-strain", "collector-10", "first-grow", "harvest-1"]
}
```

**Response:**
```json
{
  "success": true
}
```

**Constraints:**
- Max 4 badges
- Badges must be unlocked by user
- Order determines display priority

## UI/UX

### Profile View (Public)
```
┌─────────────────────────────────┐
│  [Avatar]                       │
│  Username                       │
│  Bio...                         │
│                                 │
│  🥦 🌱 👑 🌿    ← Featured (max 4)
│                                 │
│  [Alle Badges (12)]            │
└─────────────────────────────────┘
```

### Expandable Badge Showcase (Modal/Sheet)
```
┌─────────────────────────────────┐
│  Deine Badges          [X]      │
│                                 │
│  Freigeschaltet (5/13)          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│  │✓🥦 │ │✓🌱 │ │ 👑 │ │ 🌿 │  │
│  │    │ │    │ │🔒  │ │    │  │
│  └────┘ └────┘ └────┘ └────┘  │
│                                 │
│  Badge auswählen (max 4)        │
│  Tippe auf ein Badge zum        │
│  Auswählen oder Abwählen        │
│                                 │
│  Noch nicht freigeschaltet:    │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│  │ 🔒 │ │ 🔒 │ │ 🔒 │ │ 🔒 │  │
│  │100 │ │ 5x │ │ 10 │ │ 7T │  │
│  └────┘ └────┘ └────┘ └────┘  │
└─────────────────────────────────┘
```

### Edit Mode (Direct on Profile)
When user clicks "Badges bearbeiten":
- Badge grid becomes interactive
- Tapping a badge toggles selection (max 4)
- Locked badges show lock icon and cannot be selected
- "Fertig" button saves changes

## Badge Unlock Triggers

Badge criteria are checked via `POST /api/badges/check` after:
- Strain added to collection
- Strain removed from collection
- Grow started
- Grow stage changed to 'harvested'
- New follower received
- Rating/review written
- Favorite added/removed
- User activity (daily)

## Component Changes

### New Components
- `BadgeGrid` - Displays badge grid (edit or view mode)
- `BadgeCard` - Individual badge with locked/unlocked state
- `BadgeShowcase` - Expandable modal showing all badges

### Modified Components
- `profile-view.tsx` - Add featured badges display + edit button
- `user/[username]/page.tsx` - Show featured badges on public profile
- `api/badges/check/route.ts` - New endpoint
- `api/badges/select/route.ts` - New endpoint

## Database Migration

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

## Implementation Order

1. **Database migration** - Create badges table, add featured_badges column
2. **Badge definitions** - Create `src/lib/badges.ts` with all badge data and criteria
3. **Badge check API** - Implement `/api/badges/check` endpoint
4. **Badge select API** - Implement `/api/badges/select` endpoint
5. **Profile view updates** - Show featured badges on own profile
6. **Public profile updates** - Show featured badges on `/user/[username]`
7. **Badge showcase modal** - Expandable view with all badges
8. **Edit mode** - Interactive badge selection on profile
9. **Trigger integration** - Call badge check after relevant actions
