"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { buildPublicProfileBlocks, withDefaultPublicPreferences } from "@/lib/public-profile";
import type {
  ProfileBadge,
  ProfileFavorite,
  ProfileIdentity,
  ProfileStats,
  ProfileViewModel,
  PublicProfilePreferences,
} from "@/lib/types";

// Re-export types for consumers
export type { ProfileBadge, ProfileFavorite, ProfileIdentity, ProfileStats, ProfileViewModel };

type CollectionEntry = {
  strain_id: string;
  user_image_url: string | null;
};

type UserStrainRelation = {
  strain_id: string;
  position: number | null;
  strains: {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
    type: string;
    avg_thc: number | null;
    thc_max: number | null;
  } | null;
};

type QueryResult<T> = {
  data: T;
  count?: number | null;
  error: Error | null;
};

const PROFILE_QUERY_TIMEOUT_MS = process.env.NODE_ENV === "test" ? 25 : 10_000;

function getInitials(value: string) {
  const cleaned = value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return cleaned || "CU";
}

function formatThcDisplay(strain: { avg_thc?: number | null; thc_max?: number | null } | null | undefined) {
  if (!strain) return "Keine Daten";
  return `${strain.avg_thc || strain.thc_max || "—"}% THC`;
}

function createFallbackViewModel(): ProfileViewModel {
  const isBrowser = typeof window !== "undefined";
  const storedDisplayName = isBrowser ? localStorage.getItem("cannalog_demo_display_name") : null;
  const storedUsername = isBrowser ? localStorage.getItem("cannalog_demo_username") : null;
  const storedBio = isBrowser ? localStorage.getItem("cannalog_demo_bio") : null;

  const publicPreferences = withDefaultPublicPreferences("guest", null);
  const publicBlocks = buildPublicProfileBlocks(publicPreferences);

  const stats: ProfileStats = {
    totalStrains: 0,
    totalGrows: 0,
    favoriteCount: 0,
    unlockedBadgeCount: 0,
    xp: 0,
    level: 1,
    progressToNextLevel: 0,
    followers: 0,
    following: 0,
  };
  return {
    identity: {
      email: null,
      username: storedUsername ? `@${storedUsername}` : "@guest",
      displayName: storedDisplayName || "Guest",
      initials: getInitials(storedDisplayName || "Guest"),
      profileVisibility: "private",
      tagline: "",
      bio: storedBio || null,
    },
    stats,
    favorites: [],
    badges: [],
    featuredBadgeIds: [],
    activity: [],
    preview: { title: "Privat", description: "", chips: [] },
    publicPreferences,
    publicBlocks,
  };
}

export const profileKeys = {
  all: ["profile"] as const,
  detail: (userId: string) => ["profile", userId] as const,
};

function createTimeoutError(label: string) {
  return new Error(`${label} timed out after ${PROFILE_QUERY_TIMEOUT_MS}ms`);
}

async function withQueryTimeout<T>(promise: PromiseLike<{ data: T; count?: number | null; error: unknown }>, fallback: QueryResult<T>, label: string): Promise<QueryResult<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(promise).then((result) => ({
        data: result.data,
        count: result.count ?? null,
        error: result.error instanceof Error ? result.error : result.error ? new Error(String(result.error)) : null,
      })),
      new Promise<QueryResult<T>>((resolve) => {
        timeoutId = setTimeout(() => {
          resolve({
            ...fallback,
            error: createTimeoutError(label),
          });
        }, PROFILE_QUERY_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    return {
      ...fallback,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function fetchPublicPreferences(
  accessToken: string | null | undefined,
  userId: string
): Promise<PublicProfilePreferences> {
  if (!accessToken) {
    return withDefaultPublicPreferences(userId, null);
  }

  try {
    const response = await fetch("/api/profile/public-preferences", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return withDefaultPublicPreferences(userId, null);
    }

    return withDefaultPublicPreferences(
      userId,
      (payload?.data as Partial<PublicProfilePreferences> | null | undefined) ?? null
    );
  } catch {
    return withDefaultPublicPreferences(userId, null);
  }
}

async function fetchProfileData(
  userId: string,
  userEmail: string | null,
  userMetadata: Record<string, unknown> | undefined,
  accessToken?: string | null
): Promise<ProfileViewModel> {
  const [profileDbRes, collCount, followersRes, followingRes, favsRes, badgesRes] = await Promise.all([
    withQueryTimeout(
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      { data: null, error: null },
      "profile lookup"
    ),
    withQueryTimeout(
      supabase.from("user_collection").select("id", { count: "exact", head: true }).eq("user_id", userId),
      { data: null, count: 0, error: null },
      "collection count"
    ),
    withQueryTimeout(
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
      { data: null, count: 0, error: null },
      "followers count"
    ),
    withQueryTimeout(
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
      { data: null, count: 0, error: null },
      "following count"
    ),
    withQueryTimeout(
      supabase
        .from("user_strain_relations")
        .select("*, strains:strain_id (*)")
        .eq("user_id", userId)
        .eq("is_favorite", true)
        .order("position", { ascending: true })
        .limit(5),
      { data: [], error: null },
      "favorite strains"
    ),
    withQueryTimeout(
      supabase.from("user_badges").select("badge_id, unlocked_at").eq("user_id", userId),
      { data: [], error: null },
      "badges"
    ),
  ]);

  let profileData = profileDbRes.data;

  // Auto-create profile for new users if it doesn't exist in Supabase
  if (!profileData && !profileDbRes.error && userId) {
    const fallbackUsername = userEmail
      ? userEmail.split("@")[0] + "_" + Math.floor(Math.random() * 1000)
      : `user_${userId.slice(-6)}`;
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        username: fallbackUsername,
        display_name: (userMetadata?.full_name as string) || "CannaLog User",
      })
      .select()
      .maybeSingle();

    if (newProfile) {
      profileData = newProfile;
    } else {
      console.error("Failed to automatically create missing profile:", insertError);
    }
  }

  const favoriteIds = (favsRes.data || []).map((f: UserStrainRelation) => f.strains?.id).filter(Boolean);

  let collectionData: CollectionEntry[] | null = null;
  if (favoriteIds.length > 0) {
    const { data } = await withQueryTimeout(
      supabase
        .from("user_collection")
        .select("strain_id, user_image_url")
        .eq("user_id", userId)
        .in("strain_id", favoriteIds),
      { data: [] as CollectionEntry[], error: null },
      "favorite collection images"
    );
    collectionData = data as CollectionEntry[] | null;
  }

  const stats: ProfileStats = {
    totalStrains: collCount.count ?? 0,
    totalGrows: 0,
    favoriteCount: favsRes.data?.length ?? 0,
    unlockedBadgeCount: badgesRes.data?.length ?? 0,
    xp: (collCount.count ?? 0) * 50,
    level: Math.floor(((collCount.count ?? 0) * 50) / 100) + 1,
    progressToNextLevel: ((collCount.count ?? 0) * 50) % 100,
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };

  const favorites: ProfileFavorite[] = (favsRes.data || []).map((f) => {
    const s = f.strains;
    if (!s) return null;

    const customImage = collectionData?.find((c: CollectionEntry) => c.strain_id === f.strain_id)?.user_image_url;

    return {
      relationId: f.strain_id,
      id: s.id,
      name: s.name,
      slug: s.slug,
      imageUrl: customImage || s.image_url || null,
      type: s.type,
      thcDisplay: formatThcDisplay(s),
      position: f.position,
    };
  }).filter((f): f is ProfileFavorite => !!f);

  const badges: ProfileBadge[] = (badgesRes.data || []).map((b) => {
    const badgeId = (b as { badge_id: string }).badge_id;
    if (!badgeId) return null;
    return {
      id: badgeId,
      name: badgeId.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      description: "Achievement unlocked",
      iconKey: "starter",
      rarity: "common",
    };
  }).filter((b): b is ProfileBadge => b !== null);

  const featuredBadges: string[] = profileData?.featured_badges || [];
  const publicPreferences = await fetchPublicPreferences(accessToken, userId);
  const publicBlocks = buildPublicProfileBlocks(publicPreferences);

  const identity: ProfileIdentity = {
    email: userEmail ?? null,
    username: `@${profileData?.username || "user"}`,
    displayName: profileData?.display_name || (userMetadata?.full_name as string) || "CannaLog User",
    initials: getInitials(profileData?.display_name || (userMetadata?.full_name as string) || "CU"),
    avatarUrl: profileData?.avatar_url || (userMetadata?.avatar_url as string) || null,
    profileVisibility: profileData?.profile_visibility || "private",
    tagline: "",
    bio: profileData?.bio || null,
  };

  const viewModel: ProfileViewModel = {
    identity,
    stats,
    favorites,
    badges,
    featuredBadgeIds: featuredBadges,
    activity: [],
    preview: { title: "", description: "", chips: [] },
    publicPreferences,
    publicBlocks,
  };

  return viewModel;
}

export function useProfile() {
  const { user, session, loading, isDemoMode } = useAuth();

  return useQuery({
    queryKey: profileKeys.detail(user?.id ?? ""),
    queryFn: async (): Promise<ProfileViewModel> => {
      // Demo mode: return fallback
      if (isDemoMode || !user) {
        return createFallbackViewModel();
      }
      return fetchProfileData(user.id, user.email ?? null, user.user_metadata, session?.access_token);
    },
    enabled: !loading,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
