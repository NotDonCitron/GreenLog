# Privacy-First Public Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first privacy-first public profile slice: explicit privacy matrix, public profile preferences, sanitized public profile API, profile preview UI, and per-review public sharing.

**Architecture:** Keep sensitive data out of public surfaces at the data-access boundary. Public pages load through a dedicated public-profile service/API that only returns sanitized fields, while the private profile remains powered by the existing authenticated `useProfile` flow. Optional public content is controlled by profile-level preferences and item-level `is_public` flags; always-private fields are never returned by public APIs.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase, Vitest, Testing Library.

---

## File Structure

- Create: `src/lib/privacy-matrix.ts`  
  Single source of truth for public, optional-public, and always-private field labels.

- Create: `src/lib/privacy-matrix.test.ts`  
  Unit tests that prevent sensitive field labels from drifting into public/optional groups.

- Create: `supabase/migrations/20260420090000_privacy_first_public_profile.sql`  
  Adds public preference and item-level privacy columns without exposing sensitive data.

- Modify: `src/lib/types.ts`  
  Adds typed public profile preferences and sanitized public profile response types.

- Create: `src/lib/public-profile.ts`  
  Public profile data loader and sanitizer. This is the main privacy boundary.

- Create: `src/lib/public-profile.test.ts`  
  Unit tests for sanitizer behavior, preference handling, and private field exclusion.

- Create: `src/app/api/public-profiles/[username]/route.ts`  
  Public API route wrapping `getPublicProfileByUsername`.

- Create: `tests/api/public-profiles.test.ts`  
  API route tests for not-found, private profiles, and sanitized public payloads.

- Modify: `src/app/user/[username]/page.tsx`  
  Replace direct Supabase public-profile reads with the sanitized public API.

- Create: `src/components/profile/public-profile-preview-card.tsx`  
  Reusable preview card for the private `/profile` page.

- Create: `src/components/profile/public-profile-preview-card.test.tsx`  
  Rendering tests for public/private blocks and always-private copy.

- Modify: `src/hooks/useProfile.ts`  
  Load profile public preferences for the owner profile and expose them in `ProfileViewModel`.

- Modify: `src/app/profile/profile-view.tsx`  
  Replace the simple visibility toggle with the privacy-first preview and block controls.

- Modify: `src/app/profile/profile-view.test.tsx`  
  Tests for preview copy and block controls.

- Modify: `src/app/strains/[slug]/StrainDetailPageClient.tsx`  
  Add "Öffentlich teilbar?" to the tasting log and persist `ratings.is_public`.

- Create: `src/lib/public-activity.ts`  
  Builds sanitized public activity payloads from public actions only.

- Create: `src/lib/public-activity.test.ts`  
  Verifies public activities exclude dose, charge, pharmacy, notes, and batch fields.

---

### Task 1: Privacy Matrix Constants

**Files:**
- Create: `src/lib/privacy-matrix.ts`
- Create: `src/lib/privacy-matrix.test.ts`

- [ ] **Step 1: Write the failing matrix test**

Create `src/lib/privacy-matrix.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ALWAYS_PRIVATE_FIELDS,
  OPTIONAL_PUBLIC_FIELDS,
  PUBLIC_BY_DEFAULT_FIELDS,
  isAlwaysPrivateField,
} from "./privacy-matrix";

describe("privacy matrix", () => {
  it("keeps sensitive cannabis, supply, medical, and club data always private", () => {
    expect(ALWAYS_PRIVATE_FIELDS.map((field) => field.key)).toEqual(
      expect.arrayContaining([
        "dose",
        "batch",
        "stock",
        "pharmacy",
        "dispensations",
        "exact_quantities",
        "private_notes",
        "medical_context",
        "private_grow_photos",
        "organization_inventory",
        "audit_details",
      ])
    );
  });

  it("does not classify always-private fields as public or optional public", () => {
    const publicKeys = new Set([
      ...PUBLIC_BY_DEFAULT_FIELDS.map((field) => field.key),
      ...OPTIONAL_PUBLIC_FIELDS.map((field) => field.key),
    ]);

    for (const privateField of ALWAYS_PRIVATE_FIELDS) {
      expect(publicKeys.has(privateField.key)).toBe(false);
    }
  });

  it("recognizes private fields by key", () => {
    expect(isAlwaysPrivateField("dose")).toBe(true);
    expect(isAlwaysPrivateField("pharmacy")).toBe(true);
    expect(isAlwaysPrivateField("badges")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/lib/privacy-matrix.test.ts
```

Expected: FAIL because `src/lib/privacy-matrix.ts` does not exist.

- [ ] **Step 3: Add the privacy matrix implementation**

Create `src/lib/privacy-matrix.ts`:

```ts
export type PrivacyFieldKey =
  | "username"
  | "avatar"
  | "display_name"
  | "bio"
  | "badges"
  | "follow_counts"
  | "favorites"
  | "tried_strains"
  | "star_ratings"
  | "review_text"
  | "activity_feed"
  | "club_membership_label"
  | "dose"
  | "batch"
  | "stock"
  | "pharmacy"
  | "dispensations"
  | "exact_quantities"
  | "private_notes"
  | "medical_context"
  | "private_grow_photos"
  | "organization_inventory"
  | "audit_details";

export type PrivacyField = {
  key: PrivacyFieldKey;
  label: string;
  reason: string;
};

export const PUBLIC_BY_DEFAULT_FIELDS: PrivacyField[] = [
  { key: "username", label: "Username", reason: "Required for social profiles" },
  { key: "avatar", label: "Avatar", reason: "User-controlled profile identity" },
  { key: "display_name", label: "Display name", reason: "User-controlled profile identity" },
  { key: "bio", label: "Bio", reason: "User-controlled public profile text" },
  { key: "badges", label: "Badges", reason: "Low sensitivity and strong social value" },
  { key: "follow_counts", label: "Follower counts", reason: "Counts only, not private records" },
];

export const OPTIONAL_PUBLIC_FIELDS: PrivacyField[] = [
  { key: "favorites", label: "Favoriten", reason: "Taste signal controlled by profile settings" },
  { key: "tried_strains", label: "Probiert", reason: "Taste signal controlled by profile settings" },
  { key: "star_ratings", label: "Bewertungen", reason: "Per-rating or default sharing control" },
  { key: "review_text", label: "Reviews", reason: "Per-review sharing control" },
  { key: "activity_feed", label: "Aktivitäten", reason: "Derived only from public source data" },
  { key: "club_membership_label", label: "Club-Zugehörigkeit", reason: "Requires user and organization opt-in" },
];

export const ALWAYS_PRIVATE_FIELDS: PrivacyField[] = [
  { key: "dose", label: "Dosis", reason: "Sensitive consumption or health-adjacent data" },
  { key: "batch", label: "Charge", reason: "Supply and compliance data" },
  { key: "stock", label: "Bestand", reason: "Sensitive possession data" },
  { key: "pharmacy", label: "Apotheke", reason: "Health and supply context" },
  { key: "dispensations", label: "CSC-Abgaben", reason: "Club compliance data" },
  { key: "exact_quantities", label: "Exakte Mengen", reason: "Compliance and personal risk" },
  { key: "private_notes", label: "Private Notizen", reason: "Explicitly private user expectation" },
  { key: "medical_context", label: "Medizinischer Kontext", reason: "Special-category risk" },
  { key: "private_grow_photos", label: "Private Grow-Bilder", reason: "Location and identity risk" },
  { key: "organization_inventory", label: "Organisationsbestand", reason: "B2B compliance data" },
  { key: "audit_details", label: "Audit-Details", reason: "Organization-internal compliance data" },
];

const ALWAYS_PRIVATE_KEYS = new Set(ALWAYS_PRIVATE_FIELDS.map((field) => field.key));

export function isAlwaysPrivateField(key: string): key is Extract<PrivacyFieldKey, typeof ALWAYS_PRIVATE_FIELDS[number]["key"]> {
  return ALWAYS_PRIVATE_KEYS.has(key as PrivacyFieldKey);
}
```

- [ ] **Step 4: Run the matrix test**

Run:

```bash
npm test -- src/lib/privacy-matrix.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/privacy-matrix.ts src/lib/privacy-matrix.test.ts
git commit -m "feat: add privacy matrix"
```

---

### Task 2: Database Migration and Types

**Files:**
- Create: `supabase/migrations/20260420090000_privacy_first_public_profile.sql`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260420090000_privacy_first_public_profile.sql`:

```sql
-- Privacy-first public profile preferences and item-level sharing.

CREATE TABLE IF NOT EXISTS user_public_preferences (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  show_badges BOOLEAN NOT NULL DEFAULT true,
  show_favorites BOOLEAN NOT NULL DEFAULT false,
  show_tried_strains BOOLEAN NOT NULL DEFAULT false,
  show_reviews BOOLEAN NOT NULL DEFAULT false,
  show_activity_feed BOOLEAN NOT NULL DEFAULT false,
  show_follow_counts BOOLEAN NOT NULL DEFAULT true,
  default_review_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_public_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own public preferences" ON user_public_preferences;
CREATE POLICY "Users can view own public preferences"
  ON user_public_preferences FOR SELECT
  USING (requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can insert own public preferences" ON user_public_preferences;
CREATE POLICY "Users can insert own public preferences"
  ON user_public_preferences FOR INSERT
  WITH CHECK (requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can update own public preferences" ON user_public_preferences;
CREATE POLICY "Users can update own public preferences"
  ON user_public_preferences FOR UPDATE
  USING (requesting_user_id() = user_id)
  WITH CHECK (requesting_user_id() = user_id);

ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS public_review_text TEXT;

CREATE INDEX IF NOT EXISTS idx_ratings_public_user
  ON ratings(user_id, is_public)
  WHERE is_public = true;

ALTER TABLE user_strain_relations
  ADD COLUMN IF NOT EXISTS public_status TEXT NOT NULL DEFAULT 'private'
  CHECK (public_status IN ('private', 'tried', 'favorite'));

CREATE INDEX IF NOT EXISTS idx_user_strain_relations_public_status
  ON user_strain_relations(user_id, public_status)
  WHERE public_status <> 'private';

ALTER TABLE user_activities
  ADD COLUMN IF NOT EXISTS public_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE user_activities
  ADD COLUMN IF NOT EXISTS private_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_activities_unique_public_target
  ON user_activities(user_id, activity_type, target_id)
  WHERE is_public = true;

UPDATE ratings
SET public_review_text = review
WHERE is_public = true
  AND public_review_text IS NULL
  AND review IS NOT NULL;

UPDATE user_activities
SET public_payload = metadata
WHERE is_public = true
  AND public_payload = '{}'::jsonb
  AND metadata IS NOT NULL;
```

- [ ] **Step 2: Update shared types**

Modify `src/lib/types.ts` by adding these interfaces near `PublicProfilePreview`:

```ts
export interface PublicProfilePreferences {
  user_id: string;
  show_badges: boolean;
  show_favorites: boolean;
  show_tried_strains: boolean;
  show_reviews: boolean;
  show_activity_feed: boolean;
  show_follow_counts: boolean;
  default_review_public: boolean;
}

export type PublicProfileBlockKey =
  | "profile"
  | "badges"
  | "favorites"
  | "tried_strains"
  | "reviews"
  | "activity";

export interface PublicProfileBlockState {
  key: PublicProfileBlockKey;
  label: string;
  state: "public" | "private";
  description: string;
}

export interface PublicProfileFavorite {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
}

export interface PublicProfileRating {
  id: string;
  strain_id: string;
  strain_name: string;
  strain_slug: string;
  overall_rating: number;
  public_review_text: string | null;
  created_at: string;
}

export interface SanitizedPublicProfile {
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    created_at: string;
  };
  preferences: PublicProfilePreferences;
  blocks: PublicProfileBlockState[];
  counts: {
    followers: number;
    following: number;
    ratings: number;
  };
  badges: ProfileBadge[];
  favorites: PublicProfileFavorite[];
  triedStrains: PublicProfileFavorite[];
  reviews: PublicProfileRating[];
  activities: UserActivity[];
}
```

Also extend `RatingRow` and `UserStrainRelation`:

```ts
export interface UserStrainRelation {
  user_id: string;
  strain_id: string;
  is_favorite: boolean;
  is_wishlisted: boolean;
  favorite_rank: number | null;
  position: number | null;
  public_status?: "private" | "tried" | "favorite";
  created_at?: string;
}
```

```ts
export interface RatingRow {
  id: string;
  strain_id: string;
  user_id: string;
  overall_rating: number;
  taste_rating: number | null;
  effect_rating: number | null;
  look_rating: number | null;
  review: string | null;
  consumption_method: string | null;
  location: string | null;
  image_url: string | null;
  is_public: boolean;
  public_review_text?: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Run typecheck via build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260420090000_privacy_first_public_profile.sql src/lib/types.ts
git commit -m "feat: add public profile privacy schema"
```

---

### Task 3: Sanitized Public Profile Service and API

**Files:**
- Create: `src/lib/public-profile.ts`
- Create: `src/lib/public-profile.test.ts`
- Create: `src/app/api/public-profiles/[username]/route.ts`
- Create: `tests/api/public-profiles.test.ts`

- [ ] **Step 1: Write sanitizer tests**

Create `src/lib/public-profile.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_PROFILE_PREFERENCES,
  buildPublicProfileBlocks,
  sanitizePublicActivity,
  sanitizePublicRating,
} from "./public-profile";

describe("public profile sanitizer", () => {
  it("defaults optional public blocks to private", () => {
    const blocks = buildPublicProfileBlocks(DEFAULT_PUBLIC_PROFILE_PREFERENCES);

    expect(blocks.find((block) => block.key === "badges")?.state).toBe("public");
    expect(blocks.find((block) => block.key === "favorites")?.state).toBe("private");
    expect(blocks.find((block) => block.key === "reviews")?.state).toBe("private");
    expect(blocks.find((block) => block.key === "activity")?.state).toBe("private");
  });

  it("removes private fields from public ratings", () => {
    const sanitized = sanitizePublicRating({
      id: "rating-1",
      strain_id: "strain-1",
      overall_rating: 4,
      public_review_text: "Clear taste and calm effect",
      review: "Private note with pharmacy details",
      dose: "0.2g",
      batch: "ABC-123",
      pharmacy: "Private Apotheke",
      created_at: "2026-04-20T08:00:00.000Z",
      strains: {
        name: "Wedding Cake",
        slug: "wedding-cake",
      },
    });

    expect(sanitized).toEqual({
      id: "rating-1",
      strain_id: "strain-1",
      strain_name: "Wedding Cake",
      strain_slug: "wedding-cake",
      overall_rating: 4,
      public_review_text: "Clear taste and calm effect",
      created_at: "2026-04-20T08:00:00.000Z",
    });
    expect(JSON.stringify(sanitized)).not.toContain("Private Apotheke");
    expect(JSON.stringify(sanitized)).not.toContain("ABC-123");
    expect(JSON.stringify(sanitized)).not.toContain("0.2g");
  });

  it("uses public_payload and ignores raw private metadata for activities", () => {
    const sanitized = sanitizePublicActivity({
      id: "activity-1",
      user_id: "user-1",
      activity_type: "rating",
      target_id: "strain-1",
      target_name: "Wedding Cake",
      target_image_url: null,
      metadata: { pharmacy: "Private Apotheke", dose: "0.2g" },
      public_payload: { rating: 4, strain_slug: "wedding-cake" },
      private_payload: { batch: "ABC-123" },
      is_public: true,
      created_at: "2026-04-20T08:00:00.000Z",
    });

    expect(sanitized.metadata).toEqual({ rating: 4, strain_slug: "wedding-cake" });
    expect(JSON.stringify(sanitized)).not.toContain("Private Apotheke");
    expect(JSON.stringify(sanitized)).not.toContain("ABC-123");
    expect(JSON.stringify(sanitized)).not.toContain("0.2g");
  });
});
```

- [ ] **Step 2: Run sanitizer tests to verify failure**

Run:

```bash
npm test -- src/lib/public-profile.test.ts
```

Expected: FAIL because `src/lib/public-profile.ts` does not exist.

- [ ] **Step 3: Implement the sanitizer and loader**

Create `src/lib/public-profile.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProfileBadge,
  PublicProfileBlockState,
  PublicProfilePreferences,
  PublicProfileRating,
  SanitizedPublicProfile,
  UserActivity,
} from "@/lib/types";

export const DEFAULT_PUBLIC_PROFILE_PREFERENCES: PublicProfilePreferences = {
  user_id: "",
  show_badges: true,
  show_favorites: false,
  show_tried_strains: false,
  show_reviews: false,
  show_activity_feed: false,
  show_follow_counts: true,
  default_review_public: false,
};

export function withDefaultPublicPreferences(
  userId: string,
  preferences?: Partial<PublicProfilePreferences> | null
): PublicProfilePreferences {
  return {
    ...DEFAULT_PUBLIC_PROFILE_PREFERENCES,
    ...preferences,
    user_id: userId,
  };
}

export function buildPublicProfileBlocks(preferences: PublicProfilePreferences): PublicProfileBlockState[] {
  return [
    {
      key: "profile",
      label: "Profilinfo",
      state: "public",
      description: "Username, Avatar, Anzeigename und Bio.",
    },
    {
      key: "badges",
      label: "Abzeichen",
      state: preferences.show_badges ? "public" : "private",
      description: "Freigeschaltete Badges ohne private Konsumdaten.",
    },
    {
      key: "favorites",
      label: "Favoriten",
      state: preferences.show_favorites ? "public" : "private",
      description: "Öffentliche Lieblingsstrains ohne Bestand, Charge oder Apotheke.",
    },
    {
      key: "tried_strains",
      label: "Probiert",
      state: preferences.show_tried_strains ? "public" : "private",
      description: "Öffentlich markierte probierte Strains.",
    },
    {
      key: "reviews",
      label: "Reviews",
      state: preferences.show_reviews ? "public" : "private",
      description: "Nur Reviews, die du öffentlich freigibst.",
    },
    {
      key: "activity",
      label: "Aktivität",
      state: preferences.show_activity_feed ? "public" : "private",
      description: "Nur aus öffentlichen Aktionen erzeugte Aktivitäten.",
    },
  ];
}

type RawPublicRating = {
  id: string;
  strain_id: string;
  overall_rating: number;
  public_review_text: string | null;
  created_at: string;
  strains?: {
    name: string | null;
    slug: string | null;
  } | null;
};

export function sanitizePublicRating(rating: RawPublicRating): PublicProfileRating {
  return {
    id: rating.id,
    strain_id: rating.strain_id,
    strain_name: rating.strains?.name || "Unbekannter Strain",
    strain_slug: rating.strains?.slug || rating.strain_id,
    overall_rating: rating.overall_rating,
    public_review_text: rating.public_review_text || null,
    created_at: rating.created_at,
  };
}

type RawPublicActivity = UserActivity & {
  public_payload?: Record<string, unknown> | null;
  private_payload?: Record<string, unknown> | null;
};

export function sanitizePublicActivity(activity: RawPublicActivity): UserActivity {
  return {
    id: activity.id,
    user_id: activity.user_id,
    activity_type: activity.activity_type,
    target_id: activity.target_id,
    target_name: activity.target_name,
    target_image_url: activity.target_image_url,
    metadata: activity.public_payload || {},
    is_public: activity.is_public,
    created_at: activity.created_at,
  };
}

export async function getPublicProfileByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<SanitizedPublicProfile | null> {
  const normalizedUsername = username.replace(/^@/, "");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, profile_visibility, created_at, featured_badges")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (profileError || !profile || profile.profile_visibility !== "public") {
    return null;
  }

  const { data: preferencesData } = await supabase
    .from("user_public_preferences")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();

  const preferences = withDefaultPublicPreferences(profile.id, preferencesData);
  const blocks = buildPublicProfileBlocks(preferences);

  const [
    followersRes,
    followingRes,
    ratingsCountRes,
    badgesRes,
    favoritesRes,
    triedRes,
    reviewsRes,
    activitiesRes,
  ] = await Promise.all([
    preferences.show_follow_counts
      ? supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profile.id)
      : Promise.resolve({ count: 0 }),
    preferences.show_follow_counts
      ? supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profile.id)
      : Promise.resolve({ count: 0 }),
    supabase.from("ratings").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_public", true),
    preferences.show_badges
      ? supabase.from("user_badges").select("badge_id, unlocked_at").eq("user_id", profile.id)
      : Promise.resolve({ data: [] }),
    preferences.show_favorites
      ? supabase
          .from("user_strain_relations")
          .select("strain_id, strains:strain_id (id, name, slug, image_url)")
          .eq("user_id", profile.id)
          .eq("public_status", "favorite")
          .limit(12)
      : Promise.resolve({ data: [] }),
    preferences.show_tried_strains
      ? supabase
          .from("user_strain_relations")
          .select("strain_id, strains:strain_id (id, name, slug, image_url)")
          .eq("user_id", profile.id)
          .eq("public_status", "tried")
          .limit(12)
      : Promise.resolve({ data: [] }),
    preferences.show_reviews
      ? supabase
          .from("ratings")
          .select("id, strain_id, overall_rating, public_review_text, created_at, strains:strain_id (name, slug)")
          .eq("user_id", profile.id)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    preferences.show_activity_feed
      ? supabase
          .from("user_activities")
          .select("id, user_id, activity_type, target_id, target_name, target_image_url, metadata, public_payload, private_payload, is_public, created_at")
          .eq("user_id", profile.id)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  const toPublicStrain = (row: any) => {
    const strain = Array.isArray(row.strains) ? row.strains[0] : row.strains;
    if (!strain) return null;
    return {
      id: strain.id,
      name: strain.name,
      slug: strain.slug,
      image_url: strain.image_url || null,
    };
  };

  const badges: ProfileBadge[] = ((badgesRes as any).data || []).map((badge: any) => ({
    id: badge.badge_id,
    name: String(badge.badge_id).replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    description: "Freigeschaltet",
    iconKey: "trophy",
    rarity: "common",
    unlockedAt: badge.unlocked_at,
  }));

  return {
    profile: {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      created_at: profile.created_at,
    },
    preferences,
    blocks,
    counts: {
      followers: (followersRes as any).count ?? 0,
      following: (followingRes as any).count ?? 0,
      ratings: (ratingsCountRes as any).count ?? 0,
    },
    badges,
    favorites: (((favoritesRes as any).data || []).map(toPublicStrain).filter(Boolean)),
    triedStrains: (((triedRes as any).data || []).map(toPublicStrain).filter(Boolean)),
    reviews: (((reviewsRes as any).data || []) as RawPublicRating[]).map(sanitizePublicRating),
    activities: (((activitiesRes as any).data || []) as RawPublicActivity[]).map(sanitizePublicActivity),
  };
}
```

- [ ] **Step 4: Add the public profile API route**

Create `src/app/api/public-profiles/[username]/route.ts`:

```ts
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getPublicProfileByUsername } from "@/lib/public-profile";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { username } = await context.params;

  try {
    const profile = await getPublicProfileByUsername(getSupabaseAdmin(), username);
    if (!profile) return jsonError("Public profile not found", 404);

    return jsonSuccess({ profile });
  } catch (error) {
    console.error("Public profile route error:", error);
    return jsonError("Failed to load public profile", 500);
  }
}
```

- [ ] **Step 5: Write API route tests**

Create `tests/api/public-profiles.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/public-profiles/[username]/route";

vi.mock("@/lib/public-profile", () => ({
  getPublicProfileByUsername: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: vi.fn() })),
}));

describe("GET /api/public-profiles/[username]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the profile is missing or private", async () => {
    const { getPublicProfileByUsername } = await import("@/lib/public-profile");
    (getPublicProfileByUsername as any).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/public-profiles/private-user"), {
      params: Promise.resolve({ username: "private-user" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns a sanitized public profile payload", async () => {
    const { getPublicProfileByUsername } = await import("@/lib/public-profile");
    (getPublicProfileByUsername as any).mockResolvedValue({
      profile: {
        id: "user-1",
        username: "green",
        display_name: "Green User",
        avatar_url: null,
        bio: "Taste profile",
        created_at: "2026-04-20T08:00:00.000Z",
      },
      preferences: {
        user_id: "user-1",
        show_badges: true,
        show_favorites: false,
        show_tried_strains: false,
        show_reviews: false,
        show_activity_feed: false,
        show_follow_counts: true,
        default_review_public: false,
      },
      blocks: [],
      counts: { followers: 1, following: 2, ratings: 3 },
      badges: [],
      favorites: [],
      triedStrains: [],
      reviews: [],
      activities: [],
    });

    const response = await GET(new Request("http://localhost/api/public-profiles/green"), {
      params: Promise.resolve({ username: "green" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.profile.profile.username).toBe("green");
    expect(JSON.stringify(json)).not.toContain("dose");
    expect(JSON.stringify(json)).not.toContain("batch");
    expect(JSON.stringify(json)).not.toContain("pharmacy");
  });
});
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- src/lib/public-profile.test.ts tests/api/public-profiles.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/public-profile.ts src/lib/public-profile.test.ts src/app/api/public-profiles/[username]/route.ts tests/api/public-profiles.test.ts
git commit -m "feat: add sanitized public profile api"
```

---

### Task 4: Public User Page Uses Sanitized API

**Files:**
- Modify: `src/app/user/[username]/page.tsx`

- [ ] **Step 1: Update the page data model**

In `src/app/user/[username]/page.tsx`, remove direct state for raw profile data that public visitors do not need (`collections`, raw `grows`, raw `userBadges`). Replace with:

```ts
import type { SanitizedPublicProfile } from "@/lib/types";

const [publicProfile, setPublicProfile] = useState<SanitizedPublicProfile | null>(null);
```

- [ ] **Step 2: Replace direct Supabase public reads**

Replace `fetchProfileData` with:

```ts
const fetchProfileData = useCallback(async () => {
  if (!username) return;

  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch(`/api/public-profiles/${encodeURIComponent(username)}`, {
      cache: "no-store",
    });
    const json = await response.json();

    if (!response.ok || !json.data?.profile) {
      throw new Error("Public profile not found");
    }

    const nextProfile = json.data.profile as SanitizedPublicProfile;
    setPublicProfile(nextProfile);
    setProfile({
      ...nextProfile.profile,
      profile_visibility: "public",
      location: null,
      website: null,
      social_links: null,
      has_completed_onboarding: true,
      date_of_birth: null,
      full_name: null,
    });
    setFeaturedBadges(nextProfile.badges.map((badge) => badge.id).slice(0, 4));
    setFollowersCount(nextProfile.counts.followers);
    setFollowingCount(nextProfile.counts.following);
    setStats({
      totalStrains: nextProfile.counts.ratings,
      totalGrows: 0,
      favoriteCount: nextProfile.favorites.length,
      unlockedBadgeCount: nextProfile.badges.length,
      xp: 0,
      level: 1,
      progressToNextLevel: 0,
      followers: nextProfile.counts.followers,
      following: nextProfile.counts.following,
    });
    setFavorites(nextProfile.favorites.map((favorite) => ({
      strain_id: favorite.id,
      user_id: nextProfile.profile.id,
      is_favorite: true,
      position: null,
      strains: {
        name: favorite.name,
        slug: favorite.slug,
        image_url: favorite.image_url,
      },
    })));
    setActivities(nextProfile.activities);
    setUserBadges(nextProfile.badges.map((badge) => ({
      id: badge.id,
      badge_id: badge.id,
      badges: {
        name: badge.name,
        icon_url: badge.iconKey,
      },
    })));
  } catch (err) {
    console.error("Error fetching public profile:", err);
    setError("User not found");
  } finally {
    setIsLoading(false);
  }
}, [username]);
```

- [ ] **Step 3: Remove collection and grow tabs for first privacy slice**

Set the tab type to:

```ts
const [activeTab, setActiveTab] = useState<"activity" | "favorites" | "reviews">("activity");
```

Remove the `Sammlung` and `Grows` tab buttons from the public profile page for this first implementation slice. Add a `Reviews` tab that renders `publicProfile?.reviews`.

Use this reviews block:

```tsx
{activeTab === "reviews" && (
  publicProfile?.reviews.length ? (
    <div className="space-y-3">
      {publicProfile.reviews.map((review) => (
        <Link key={review.id} href={`/strains/${review.strain_slug}`}>
          <div className="rounded-xl border border-[var(--border)]/50 bg-[var(--card)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-black text-[var(--foreground)]">
                {review.strain_name}
              </p>
              <span className="text-xs font-black text-[#ffd76a]">
                {review.overall_rating.toFixed(1)}/5
              </span>
            </div>
            {review.public_review_text && (
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {review.public_review_text}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  ) : (
    <div className="py-12 text-center">
      <p className="text-sm text-[var(--muted-foreground)]">Keine öffentlichen Reviews</p>
    </div>
  )
)}
```

- [ ] **Step 4: Run focused checks**

Run:

```bash
npm run lint -- src/app/user/[username]/page.tsx
npm run build
```

Expected: lint passes for the file and build passes.

- [ ] **Step 5: Commit**

```bash
git add src/app/user/[username]/page.tsx
git commit -m "feat: load public profiles through privacy api"
```

---

### Task 5: Private Profile Preview and Preferences

**Files:**
- Create: `src/components/profile/public-profile-preview-card.tsx`
- Create: `src/components/profile/public-profile-preview-card.test.tsx`
- Modify: `src/hooks/useProfile.ts`
- Modify: `src/app/profile/profile-view.tsx`
- Modify: `src/app/profile/profile-view.test.tsx`

- [ ] **Step 1: Write preview card tests**

Create `src/components/profile/public-profile-preview-card.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicProfilePreviewCard } from "./public-profile-preview-card";
import type { PublicProfileBlockState, PublicProfilePreferences } from "@/lib/types";

const preferences: PublicProfilePreferences = {
  user_id: "user-1",
  show_badges: true,
  show_favorites: false,
  show_tried_strains: false,
  show_reviews: false,
  show_activity_feed: false,
  show_follow_counts: true,
  default_review_public: false,
};

const blocks: PublicProfileBlockState[] = [
  { key: "profile", label: "Profilinfo", state: "public", description: "Username und Bio" },
  { key: "badges", label: "Abzeichen", state: "public", description: "Badges" },
  { key: "favorites", label: "Favoriten", state: "private", description: "Favoriten" },
];

describe("PublicProfilePreviewCard", () => {
  it("shows privacy-first public profile copy", () => {
    render(
      <PublicProfilePreviewCard
        username="@green"
        preferences={preferences}
        blocks={blocks}
        onPreferenceChange={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.getByText("Dein öffentliches Profil")).toBeTruthy();
    expect(screen.getByText("So sehen andere dein Profil.")).toBeTruthy();
    expect(screen.getByText(/Versorgung, Mengen, Dosis, Charge, Apotheke und Notizen bleiben privat/i)).toBeTruthy();
  });

  it("calls onPreferenceChange when a configurable block is toggled", () => {
    const onPreferenceChange = vi.fn();

    render(
      <PublicProfilePreviewCard
        username="@green"
        preferences={preferences}
        blocks={blocks}
        onPreferenceChange={onPreferenceChange}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByRole("switch", { name: /Favoriten/i }));

    expect(onPreferenceChange).toHaveBeenCalledWith("show_favorites", true);
  });
});
```

- [ ] **Step 2: Add the preview card component**

Create `src/components/profile/public-profile-preview-card.tsx`:

```tsx
"use client";

import { Eye, Lock, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { PublicProfileBlockState, PublicProfilePreferences } from "@/lib/types";

type PreferenceKey =
  | "show_badges"
  | "show_favorites"
  | "show_tried_strains"
  | "show_reviews"
  | "show_activity_feed"
  | "show_follow_counts";

const BLOCK_TO_PREFERENCE: Partial<Record<PublicProfileBlockState["key"], PreferenceKey>> = {
  badges: "show_badges",
  favorites: "show_favorites",
  tried_strains: "show_tried_strains",
  reviews: "show_reviews",
  activity: "show_activity_feed",
};

type PublicProfilePreviewCardProps = {
  username: string;
  preferences: PublicProfilePreferences;
  blocks: PublicProfileBlockState[];
  disabled: boolean;
  onPreferenceChange: (key: PreferenceKey, value: boolean) => void;
};

export function PublicProfilePreviewCard({
  username,
  preferences,
  blocks,
  disabled,
  onPreferenceChange,
}: PublicProfilePreviewCardProps) {
  return (
    <section className="rounded-2xl border border-[#00F5FF]/20 bg-[var(--card)] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#00F5FF]/10 text-[#00F5FF]">
          <Shield size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00F5FF]">
            Privacy-first
          </p>
          <h3 className="mt-1 text-lg font-black uppercase tracking-tight text-[var(--foreground)] font-display">
            Dein öffentliches Profil
          </h3>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
            So sehen andere dein Profil.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
            Versorgung, Mengen, Dosis, Charge, Apotheke und Notizen bleiben privat.
          </p>
          <a
            href={`/user/${username.replace(/^@/, "")}`}
            className="mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#2FF801]"
          >
            <Eye size={14} />
            Vorschau öffnen
          </a>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {blocks.map((block) => {
          const preferenceKey = BLOCK_TO_PREFERENCE[block.key];
          const configurable = Boolean(preferenceKey);
          const checked = preferenceKey ? Boolean(preferences[preferenceKey]) : block.state === "public";

          return (
            <div
              key={block.key}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)]/50 bg-[var(--background)]/40 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-black text-[var(--foreground)]">{block.label}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
                  {block.description}
                </p>
              </div>
              {configurable && preferenceKey ? (
                <Switch
                  aria-label={`${block.label} öffentlich anzeigen`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(value) => onPreferenceChange(preferenceKey, value)}
                />
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#2FF801]/30 bg-[#2FF801]/10 px-2 py-1 text-[9px] font-black uppercase text-[#2FF801]">
                  <Lock size={10} />
                  Basis
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Update `useProfile` to load preferences**

In `src/lib/types.ts`, extend `ProfileViewModel`:

```ts
export interface ProfileViewModel {
  identity: ProfileIdentity;
  stats: ProfileStats;
  favorites: ProfileFavorite[];
  badges: ProfileBadge[];
  featuredBadgeIds: string[];
  activity: ProfileActivityItem[];
  preview: PublicProfilePreview;
  publicPreferences: PublicProfilePreferences;
  publicBlocks: PublicProfileBlockState[];
}
```

In `src/hooks/useProfile.ts`, import:

```ts
import {
  buildPublicProfileBlocks,
  withDefaultPublicPreferences,
} from "@/lib/public-profile";
```

Add this query in the `Promise.all` inside `fetchProfileData`:

```ts
supabase.from("user_public_preferences").select("*").eq("user_id", userId).maybeSingle(),
```

Name the result `publicPreferencesRes`.

After `featuredBadges`, add:

```ts
const publicPreferences = withDefaultPublicPreferences(userId, publicPreferencesRes.data);
const publicBlocks = buildPublicProfileBlocks(publicPreferences);
```

Return them in the `viewModel`:

```ts
const viewModel: ProfileViewModel = {
  identity,
  stats,
  favorites,
  badges,
  featuredBadgeIds: featuredBadges,
  activity: [],
  preview: {
    title: identity.profileVisibility === "public" ? "Öffentlich" : "Privat",
    description: "Versorgung, Mengen, Dosis, Charge, Apotheke und Notizen bleiben privat.",
    chips: publicBlocks.filter((block) => block.state === "public").map((block) => block.label),
  },
  publicPreferences,
  publicBlocks,
};
```

Also update `createFallbackViewModel` with `publicPreferences` and `publicBlocks` from the default helpers.

- [ ] **Step 4: Wire the preview into the private profile**

In `src/app/profile/profile-view.tsx`, import:

```ts
import { PublicProfilePreviewCard } from "@/components/profile/public-profile-preview-card";
import type { PublicProfilePreferences } from "@/lib/types";
```

Add state:

```ts
const [isSavingPublicPreferences, setIsSavingPublicPreferences] = useState(false);
```

Add handler:

```ts
const handlePublicPreferenceChange = async (
  key: keyof Pick<
    PublicProfilePreferences,
    "show_badges" | "show_favorites" | "show_tried_strains" | "show_reviews" | "show_activity_feed" | "show_follow_counts"
  >,
  value: boolean
) => {
  if (!user || isDemoMode || isSavingPublicPreferences) return;

  setIsSavingPublicPreferences(true);
  try {
    const nextPreferences = {
      ...profileData.publicPreferences,
      user_id: user.id,
      [key]: value,
    };

    const { error } = await supabase
      .from("user_public_preferences")
      .upsert(nextPreferences, { onConflict: "user_id" });

    if (error) throw error;

    toastSuccess("Öffentliches Profil aktualisiert");
    await refetchProfile();
  } catch (error) {
    console.error("Public preference update error:", error);
    toastError("Öffentliches Profil konnte nicht aktualisiert werden.");
  } finally {
    setIsSavingPublicPreferences(false);
  }
};
```

Replace the existing "Profil Sichtbarkeit" section with:

```tsx
<PublicProfilePreviewCard
  username={identity.username}
  preferences={profileData.publicPreferences}
  blocks={profileData.publicBlocks}
  disabled={isSavingPublicPreferences}
  onPreferenceChange={handlePublicPreferenceChange}
/>
```

Keep `handleToggleVisibility` in place only if a separate public/private whole-profile switch remains above this preview. If it remains, label it "Profil grundsätzlich öffentlich".

- [ ] **Step 5: Update tests**

In `src/app/profile/profile-view.test.tsx`, add `publicPreferences` and `publicBlocks` to each `mockProfileData`:

```ts
publicPreferences: {
  user_id: "123",
  show_badges: true,
  show_favorites: false,
  show_tried_strains: false,
  show_reviews: false,
  show_activity_feed: false,
  show_follow_counts: true,
  default_review_public: false,
},
publicBlocks: [
  { key: "profile", label: "Profilinfo", state: "public", description: "Username und Bio" },
  { key: "badges", label: "Abzeichen", state: "public", description: "Badges" },
  { key: "favorites", label: "Favoriten", state: "private", description: "Favoriten" },
],
```

Add test:

```tsx
it("renders the privacy-first public profile preview", () => {
  const mockProfileData = {
    identity: {
      username: "@testuser",
      displayName: "Test User",
      initials: "TU",
      avatarUrl: null,
      profileVisibility: "public",
      tagline: "",
      bio: null,
    },
    stats: {
      totalStrains: 1,
      totalGrows: 0,
      favoriteCount: 0,
      unlockedBadgeCount: 0,
      xp: 0,
      level: 1,
      progressToNextLevel: 0,
      followers: 0,
      following: 0,
    },
    favorites: [],
    badges: [],
    featuredBadgeIds: [],
    activity: [],
    preview: { title: "Öffentlich", description: "", chips: [] },
    publicPreferences: {
      user_id: "123",
      show_badges: true,
      show_favorites: false,
      show_tried_strains: false,
      show_reviews: false,
      show_activity_feed: false,
      show_follow_counts: true,
      default_review_public: false,
    },
    publicBlocks: [
      { key: "profile", label: "Profilinfo", state: "public", description: "Username und Bio" },
      { key: "badges", label: "Abzeichen", state: "public", description: "Badges" },
    ],
  };

  (useAuth as any).mockReturnValue({
    user: { id: "123" },
    loading: false,
    isDemoMode: false,
  });
  (useProfile as any).mockReturnValue({
    data: mockProfileData,
    isLoading: false,
  });

  render(<ProfilePage />);

  expect(screen.getByText("Dein öffentliches Profil")).toBeTruthy();
  expect(screen.getByText(/Dosis, Charge, Apotheke und Notizen bleiben privat/i)).toBeTruthy();
});
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- src/components/profile/public-profile-preview-card.test.tsx src/app/profile/profile-view.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/profile/public-profile-preview-card.tsx src/components/profile/public-profile-preview-card.test.tsx src/hooks/useProfile.ts src/app/profile/profile-view.tsx src/app/profile/profile-view.test.tsx
git commit -m "feat: add public profile privacy preview"
```

---

### Task 6: Review Sharing Toggle and Public Activity Payload

**Files:**
- Create: `src/lib/public-activity.ts`
- Create: `src/lib/public-activity.test.ts`
- Modify: `src/app/strains/[slug]/StrainDetailPageClient.tsx`

- [ ] **Step 1: Write public activity tests**

Create `src/lib/public-activity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPublicRatingActivityPayload } from "./public-activity";

describe("public activity payloads", () => {
  it("builds rating payloads without private cannabis fields", () => {
    const payload = buildPublicRatingActivityPayload({
      rating: 4.3,
      strainSlug: "wedding-cake",
      reviewText: "Clear taste",
      dose: "0.2g",
      batch: "ABC-123",
      pharmacy: "Private Apotheke",
      privateNotes: "Do not publish",
    });

    expect(payload).toEqual({
      rating: 4.3,
      strain_slug: "wedding-cake",
      public_review_text: "Clear taste",
    });
    expect(JSON.stringify(payload)).not.toContain("0.2g");
    expect(JSON.stringify(payload)).not.toContain("ABC-123");
    expect(JSON.stringify(payload)).not.toContain("Private Apotheke");
    expect(JSON.stringify(payload)).not.toContain("Do not publish");
  });
});
```

- [ ] **Step 2: Implement public activity helper**

Create `src/lib/public-activity.ts`:

```ts
type PublicRatingActivityInput = {
  rating: number;
  strainSlug: string;
  reviewText?: string | null;
  dose?: string | null;
  batch?: string | null;
  pharmacy?: string | null;
  privateNotes?: string | null;
};

export function buildPublicRatingActivityPayload(input: PublicRatingActivityInput) {
  return {
    rating: Number(input.rating.toFixed(1)),
    strain_slug: input.strainSlug,
    public_review_text: input.reviewText?.trim() || null,
  };
}
```

- [ ] **Step 3: Add review sharing state to the strain detail page**

In `src/app/strains/[slug]/StrainDetailPageClient.tsx`, import:

```ts
import { buildPublicRatingActivityPayload } from "@/lib/public-activity";
```

Add component state near `ratings`:

```ts
const [isRatingPublic, setIsRatingPublic] = useState(false);
```

- [ ] **Step 4: Persist rating privacy and public review text**

In `saveRating`, compute:

```ts
const overallRating = (ratings.taste + ratings.effect + ratings.look) / 3;
const publicReviewText = isRatingPublic ? userNotes.trim() || null : null;
```

Replace the `ratings` upsert payload with:

```ts
const { error: rError } = await supabase.from("ratings").upsert({
  strain_id: strain.id,
  user_id: user.id,
  overall_rating: overallRating,
  taste_rating: ratings.taste,
  effect_rating: ratings.effect,
  look_rating: ratings.look,
  organization_id: isOrgStrain ? strain.organization_id : null,
  is_public: isRatingPublic,
  public_review_text: publicReviewText,
}, { onConflict: "strain_id,user_id" });
```

After the rating upsert succeeds, add public activity creation only when public:

```ts
if (isRatingPublic) {
  const publicPayload = buildPublicRatingActivityPayload({
    rating: overallRating,
    strainSlug: slug as string,
    reviewText: publicReviewText,
    batch: batchInfo,
    pharmacy: batchInfo,
    privateNotes: userNotes,
  });

  await supabase
    .from("user_activities")
    .delete()
    .eq("user_id", user.id)
    .eq("activity_type", "rating")
    .eq("target_id", strain.id);

  await supabase.from("user_activities").insert({
    user_id: user.id,
    activity_type: "rating",
    target_id: strain.id,
    target_name: strain.name,
    target_image_url: strain.image_url || null,
    metadata: publicPayload,
    public_payload: publicPayload,
    private_payload: {},
    is_public: true,
  });
}
```

- [ ] **Step 5: Add the UI toggle and privacy copy**

Inside the rating modal, after the notes textarea and before the save button, add:

```tsx
<div className="rounded-xl border border-[#00F5FF]/20 bg-[#00F5FF]/5 p-4">
  <label className="flex items-start justify-between gap-4">
    <span className="min-w-0">
      <span className="block text-xs font-black uppercase tracking-widest text-[var(--foreground)]">
        Öffentlich teilbar?
      </span>
      <span className="mt-1 block text-[10px] leading-relaxed text-[var(--muted-foreground)]">
        Andere sehen Strain, Sterne und deinen öffentlichen Review. Dosis, Charge, Apotheke und private Notizen bleiben privat.
      </span>
    </span>
    <input
      type="checkbox"
      checked={isRatingPublic}
      onChange={(event) => setIsRatingPublic(event.target.checked)}
      className="mt-1 h-5 w-5 accent-[#2FF801]"
    />
  </label>
</div>
```

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm test -- src/lib/public-activity.test.ts
npm run build
```

Expected: tests and build pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/public-activity.ts src/lib/public-activity.test.ts src/app/strains/[slug]/StrainDetailPageClient.tsx
git commit -m "feat: add public review sharing control"
```

---

### Task 7: Full Verification

**Files:**
- No planned code changes.

- [ ] **Step 1: Run unit and API tests**

Run:

```bash
npm test -- src/lib/privacy-matrix.test.ts src/lib/public-profile.test.ts src/lib/public-activity.test.ts src/components/profile/public-profile-preview-card.test.tsx src/app/profile/profile-view.test.tsx tests/api/public-profiles.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS or only pre-existing lint failures unrelated to the touched files. If failures occur in touched files, fix and rerun.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Manual browser verification**

Run:

```bash
npm run dev
```

Verify:

- `/profile` shows "Dein öffentliches Profil".
- The preview copy says sensitive data stays private.
- Toggling "Favoriten" persists and remains after refresh.
- `/user/<username>` loads public data through `/api/public-profiles/<username>`.
- Public profile JSON does not include `dose`, `batch`, `pharmacy`, `private_notes`, `user_notes`, `batch_info`, `user_thc_percent`, or `user_cbd_percent`.
- The tasting log shows "Öffentlich teilbar?".
- Saving a private tasting log does not create a public activity.
- Saving a public tasting log creates a public rating/activity without private fields.

- [ ] **Step 5: Commit any verification fixes**

If fixes were needed:

```bash
git add <fixed-files>
git commit -m "fix: polish privacy-first public profile"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- Privacy matrix: Task 1.
- Public profile preferences and item-level sharing flags: Task 2.
- Public profile API with backend-level sanitization: Task 3.
- Public profile page using sanitized data only: Task 4.
- "So sieht dein Profil für andere aus" preview: Task 5.
- Per-review "Öffentlich teilbar?" switch: Task 6.
- Public feed payload sanitization: Task 6.
- Tests for private field exclusion: Tasks 1, 3, 6, and 7.
- Club OS boundary: preserved by excluding organization/member/compliance data from this first slice.

Known scope limits for this plan:

- Follower-only visibility is not implemented in this slice.
- Public organization profiles are not implemented in this slice.
- Existing historical public `user_activities.metadata` rows are sanitized on read by `sanitizePublicActivity`; data migration cleanup is not required for this slice.
