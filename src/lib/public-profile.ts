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

export function buildPublicProfileBlocks(
  preferences: PublicProfilePreferences
): PublicProfileBlockState[] {
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
      description: "Nur Reviews, die öffentlich freigegeben sind.",
    },
    {
      key: "activity",
      label: "Aktivität",
      state: preferences.show_activity_feed ? "public" : "private",
      description: "Nur aus öffentlichen Aktionen erzeugte Aktivitäten.",
    },
  ];
}

type PublicRatingSource = {
  id: string;
  strain_id: string;
  overall_rating: number;
  public_review_text?: string | null;
  created_at: string;
  strains?: {
    name?: string | null;
    slug?: string | null;
  } | null;
  [key: string]: unknown;
};

export function sanitizePublicRating(rating: PublicRatingSource): PublicProfileRating {
  return {
    id: rating.id,
    strain_id: rating.strain_id,
    strain_name: rating.strains?.name || "Unbekannter Strain",
    strain_slug: rating.strains?.slug || rating.strain_id,
    overall_rating: rating.overall_rating,
    public_review_text: rating.public_review_text ?? null,
    created_at: rating.created_at,
  };
}

type PublicActivitySource = UserActivity & {
  public_payload?: Record<string, unknown> | null;
  private_payload?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export function sanitizePublicActivity(activity: PublicActivitySource): UserActivity {
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

type PublicProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_visibility: "public" | "private" | null;
  created_at: string;
};

type PublicPreferencesRow = Partial<PublicProfilePreferences> & {
  user_id?: string;
};

type PublicFavoriteRow = {
  strain_id: string;
  strains?: {
    id?: string;
    name?: string | null;
    slug?: string | null;
    image_url?: string | null;
  } | null;
};

type PublicBadgeRow = {
  badge_id: string;
  unlocked_at: string;
};

type PublicActivityRow = PublicActivitySource;
type PublicReviewRow = PublicRatingSource;

function toTitleCase(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toPublicStrain(row: PublicFavoriteRow) {
  const strain = Array.isArray(row.strains) ? row.strains[0] : row.strains;

  if (!strain?.id || !strain.name || !strain.slug) {
    return null;
  }

  return {
    id: strain.id,
    name: strain.name,
    slug: strain.slug,
    image_url: strain.image_url ?? null,
  };
}

function mapBadge(row: PublicBadgeRow): ProfileBadge {
  const name = toTitleCase(row.badge_id);

  return {
    id: row.badge_id,
    name,
    description: "Freigeschaltet",
    iconKey: "trophy",
    rarity: "common",
    unlockedAt: row.unlocked_at,
  };
}

export async function getPublicProfileByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<SanitizedPublicProfile | null> {
  const normalizedUsername = username.trim().replace(/^@/, "");

  if (!normalizedUsername) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, profile_visibility, created_at")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (profileError || !profile || (profile as PublicProfileRow).profile_visibility !== "public") {
    return null;
  }

  const { data: preferencesData } = await supabase
    .from("user_public_preferences")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();

  const preferences = withDefaultPublicPreferences(
    profile.id,
    (preferencesData as PublicPreferencesRow | null) || null
  );
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
      : Promise.resolve({ data: [] as PublicBadgeRow[] }),
    preferences.show_favorites
      ? supabase
          .from("user_strain_relations")
          .select("strain_id, strains:strain_id (id, name, slug, image_url)")
          .eq("user_id", profile.id)
          .eq("is_favorite", true)
          .limit(12)
      : Promise.resolve({ data: [] as PublicFavoriteRow[] }),
    preferences.show_tried_strains
      ? supabase
          .from("user_strain_relations")
          .select("strain_id, strains:strain_id (id, name, slug, image_url)")
          .eq("user_id", profile.id)
          .eq("public_status", "tried")
          .limit(12)
      : Promise.resolve({ data: [] as PublicFavoriteRow[] }),
    preferences.show_reviews
      ? supabase
          .from("ratings")
          .select("id, strain_id, overall_rating, public_review_text, created_at, strains:strain_id (name, slug)")
          .eq("user_id", profile.id)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as PublicReviewRow[] }),
    preferences.show_activity_feed
      ? supabase
          .from("user_activities")
          .select("id, user_id, activity_type, target_id, target_name, target_image_url, metadata, public_payload, private_payload, is_public, created_at")
          .eq("user_id", profile.id)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as PublicActivityRow[] }),
  ]);

  return {
    profile: {
      id: profile.id,
      username: profile.username ?? normalizedUsername,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      created_at: profile.created_at,
    },
    preferences,
    blocks,
    counts: {
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
      ratings: ratingsCountRes.count ?? 0,
    },
    badges: ((badgesRes.data || []) as PublicBadgeRow[]).map(mapBadge),
    favorites: ((favoritesRes.data || []) as PublicFavoriteRow[])
      .map(toPublicStrain)
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    triedStrains: ((triedRes.data || []) as PublicFavoriteRow[])
      .map(toPublicStrain)
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    reviews: ((reviewsRes.data || []) as PublicReviewRow[]).map(sanitizePublicRating),
    activities: ((activitiesRes.data || []) as PublicActivityRow[]).map(sanitizePublicActivity),
  };
}
