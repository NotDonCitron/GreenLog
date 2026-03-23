# GreenLog Implementation Plan - Phase 1

## Goal: Fix Broken Data Layer & Complete MVP Core Features

---

## Task 1: Fix User Collection Query in Home Page

**File:** `src/app/page.tsx`

### Problem
- Home page queries `user_collection` table that doesn't exist
- Falls back to demo data for logged-in users

### Solution
Option A: Create `user_collection` table  
Option B: Modify Home page to query `ratings` table with strain data

### Steps
1. [ ] Update Supabase query in `src/app/page.tsx` to use `ratings` table
2. [ ] Include strain data via join
3. [ ] Add user_notes and batch_info fallback
4. [ ] Test with authenticated user

---

## Task 2: Add profile_visibility to Profiles Table

**File:** `supabase-schema.sql`

### Problem
- TypeScript has `profile_visibility` field
- Supabase schema doesn't have this column

### Steps
1. [ ] Add migration: `ALTER TABLE profiles ADD COLUMN profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private'));`
2. [ ] Create RLS policy for public profile queries
3. [ ] Update profile page to respect visibility setting
4. [ ] Add UI toggle in profile settings

---

## Task 3: Implement Favorites/Wishlist System

**New File:** `supabase-schema.sql` (update)

### Problem
- Heart buttons on strain cards don't work
- No way to save favorites

### Steps
1. [ ] Create `user_strain_relations` table:
```sql
CREATE TABLE user_strain_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  is_wishlist BOOLEAN DEFAULT false,
  favorite_rank SMALLINT CHECK (favorite_rank BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, strain_id)
);
```
2. [ ] Add RLS policies
3. [ ] Create Supabase query functions for favorites
4. [ ] Update strain card component with click handler
5. [ ] Add favorites list to profile page

---

## Task 4: Complete Badge Trigger System

**Files:** `src/app/profile/page.tsx`, `supabase-schema.sql`

### Problem
- Badges display in profile but don't unlock based on actions

### MVP Badge Triggers
| Badge | Trigger |
|-------|---------|
| Starter | First strain rated |
| Connoisseur | 10 unique strains rated |
| Highflyer | 5 star rating given |
| Leaf | First grow started |
| DNA | Added 5 strains to wishlist |

### Steps
1. [ ] Create `user_badges` table:
```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
```
2. [ ] Create badge trigger function in Supabase
3. [ ] Update profile page to fetch and display earned badges
4. [ ] Add badge unlock notification (toast)

---

## Task 5: Standardize THC/CBD Fields

**Files:** `supabase-schema.sql`, `src/lib/types.ts`

### Problem
- Schema has `thc_min/max`, types expect `avg_thc/avg_cbd`

### Steps
1. [ ] Add computed column or view for avg calculations
2. [ ] Update TypeScript types to support both formats
3. [ ] Add helper function for display formatting

---

## Execution Order

```
1. Fix Home page query (quick win - immediate improvement)
2. Add profile_visibility column (schema change)
3. Create user_strain_relations table (new feature)
4. Create user_badges table (new feature)
5. Update components with new functionality
6. Add badge trigger logic
7. Standardize cannabinoid display
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase-schema.sql` | Add columns, tables, RLS policies |
| `src/app/page.tsx` | Fix collection query |
| `src/app/profile/page.tsx` | Add favorites list, badge display |
| `src/lib/types.ts` | Standardize types |
| `src/components/strain-card.tsx` | Add favorite toggle |

---

## Verification Checklist

- [ ] Home page shows real user collection (not demo data)
- [ ] Heart button toggles favorite state
- [ ] Profile shows favorite strains
- [ ] Badges unlock when criteria met
- [ ] Public/Private toggle works in profile
- [ ] No console errors on collection pages
