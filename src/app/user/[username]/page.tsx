"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, MapPin, Calendar, ArrowLeft, Shield, Lock } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { FollowButton } from "@/components/social/follow-button";
import { ActivityCard } from "@/components/social/activity-card";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";
import type { UserActivity, FollowStatus } from "@/lib/types";

interface ProfileData {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_visibility: "public" | "private" | null;
  location: string | null;
  created_at: string;
}

interface FavoriteStrain {
  id: string;
  strains: {
    name: string;
    slug: string;
    image_url: string | null;
  } | null;
}

interface GrowData {
  id: string;
  title: string;
  grow_type: string;
  status: string;
  strains: { name: string } | null;
}

interface CollectionData {
  batch_info: string | null;
  user_notes: string | null;
  user_thc_percent: number | null;
  user_cbd_percent: number | null;
  user_image_url: string | null;
  date_added: string | null;
  strain: { name: string; slug: string; image_url: string | null } | null;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [favorites, setFavorites] = useState<FavoriteStrain[]>([]);
  const [grows, setGrows] = useState<GrowData[]>([]);
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [activeTab, setActiveTab] = useState<"activity" | "favorites" | "collections" | "grows">("activity");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus>({
    is_following: false,
    is_following_me: false,
    has_pending_request: false,
  });
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);

  const isOwnProfile = user?.id === profile?.id;
  const isPrivateAndNotFollowing = profile?.profile_visibility === "private" && !isOwnProfile && !followStatus.is_following;

  const fetchProfileData = useCallback(async () => {
    if (!username) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (profileError || !profileData) throw new Error("User not found");
      setProfile(profileData);

      // Parallel data fetching
      const [
        followDataRes,
        followerCountRes,
        followingCountRes,
        ratingsCountRes,
        favoritesRes,
        growsRes,
        collectionsRes,
        activitiesRes,
      ] = await Promise.all([
        user ? supabase
          .from("follows")
          .select("*")
          .or(`and(follower_id.eq.${user.id},following_id.eq.${profileData.id}),and(follower_id.eq.${profileData.id},following_id.eq.${user.id})`)
          : Promise.resolve({ data: [] }),

        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileData.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileData.id),
        supabase.from("ratings").select("*", { count: "exact", head: true }).eq("user_id", profileData.id),

        supabase.from("user_strain_relations").select("*, strains:strain_id (*)").eq("user_id", profileData.id).eq("is_favorite", true).limit(10),
        supabase.from("grows").select("*, strains:strain_id (*)").eq("user_id", profileData.id).eq("is_public", true).limit(10),
        supabase.from("user_collection").select("*, strain:strains (*)").eq("user_id", profileData.id).order("date_added", { ascending: false }).limit(24),
        supabase.from("user_activities").select("*").eq("user_id", profileData.id).eq("is_public", true).order("created_at", { ascending: false }).limit(20),
      ]);

      // Process follow status
      if (user && followDataRes.data) {
        const isFollowing = followDataRes.data.some(f => f.follower_id === user.id && f.following_id === profileData.id);
        const isFollowingMe = followDataRes.data.some(f => f.follower_id === profileData.id && f.following_id === user.id);
        setFollowStatus({ is_following: isFollowing, is_following_me: isFollowingMe, has_pending_request: false });
      }

      setFollowersCount(followerCountRes.count ?? 0);
      setFollowingCount(followingCountRes.count ?? 0);
      setRatingsCount(ratingsCountRes.count ?? 0);
      setFavorites(favoritesRes.data ?? []);
      setGrows(growsRes.data ?? []);
      setCollections(collectionsRes.data ?? []);
      setActivities(activitiesRes.data ?? []);
    } catch {
      setError("User not found");
    } finally {
      setIsLoading(false);
    }
  }, [username, user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleFollowChange = () => {
    fetchProfileData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#999]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-black text-[#1A1A1A] mb-2">User Not Found</h1>
        <p className="text-[#666] mb-4">@{username} existiert nicht oder das Profil ist privat.</p>
        <Link href="/discover">
          <button className="px-6 py-3 bg-[#FAFAFA] border border-[#E5E5E5] text-[#1A1A1A] font-semibold rounded-xl">
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Zurück
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 w-full max-w-full bg-white/95 border-b border-[#E5E5E5] backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg px-6 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/discover" className="flex-shrink-0">
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#E5E5E5]">
                <ArrowLeft className="h-5 w-5 text-[#1A1A1A]" />
              </button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-[#1A1A1A]">
                {profile.display_name || profile.username}
              </h1>
              <p className="truncate text-xs text-[#999]">@{profile.username}</p>
            </div>
            {!isOwnProfile && (
              <FollowButton
                userId={profile.id}
                initialStatus={followStatus}
                onFollowChange={handleFollowChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mx-auto w-full max-w-lg px-6 py-6">
        {/* Owner Badge */}
        {["fabian.gebert", "lars", "lars.fieber", "test", "pascal"].includes(profile.username || "") && (
          <div className="flex justify-start mb-4">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFD700]">
              <Shield size={10} /> Owner
            </span>
          </div>
        )}

        {/* Avatar and Basic Info */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#FAFAFA] border-2 border-[#E5E5E5] flex items-center justify-center flex-shrink-0">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name || profile.username || ""}
                width={64}
                height={64}
                className="object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-[#999]">
                {profile.username?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black tracking-tight text-[#1A1A1A]">
              {profile.display_name || profile.username}
            </h2>
            <p className="text-sm font-medium text-[#999]">@{profile.username}</p>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-[#666] leading-relaxed mb-4">{profile.bio}</p>
        )}

        {/* Meta */}
        <div className="flex gap-4 text-[11px] font-medium text-[#999] mb-6">
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Joined {formatDate(profile.created_at)}
          </span>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-around bg-[#FAFAFA] rounded-2xl py-4 px-6 mb-6">
          <div className="flex flex-col items-center gap-1">
            <p className="text-lg font-black text-[#1A1A1A]">{followersCount}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#999]">Follower</p>
          </div>
          <div className="w-px h-8 bg-[#E5E5E5]" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-lg font-black text-[#1A1A1A]">{followingCount}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#999]">Gefolgt</p>
          </div>
          <div className="w-px h-8 bg-[#E5E5E5]" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-lg font-black text-[#2FF801]">{ratingsCount}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#999]">Ratings</p>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="mx-auto w-full max-w-lg px-6">
        {isPrivateAndNotFollowing ? (
          <div className="mt-4 w-full rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] px-8 py-20 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#E5E5E5] bg-white shadow-sm">
              <Lock size={32} className="text-[#999]" />
            </div>
            <h2 className="mb-2 text-lg font-bold uppercase tracking-tight text-[#1A1A1A]">
              Privates Profil
            </h2>
            <p className="text-sm text-[#666]">
              Folge diesem User um seine Ratings, Grows und Sammlung zu sehen.
            </p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-6 border-b border-[#E5E5E5] overflow-x-auto no-scrollbar">
              {["activity", "favorites", "collections", "grows"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? "text-[#2FF801] border-b-2 border-[#2FF801]"
                      : "text-[#999]"
                  }`}
                >
                  {tab === "activity" ? "Aktivität" :
                   tab === "favorites" ? "Favoriten" :
                   tab === "collections" ? "Sammlung" : "Grows"}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="py-4 space-y-3">
              {activeTab === "activity" && (
                activities.length > 0 ? (
                  activities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))
                ) : (
                  <div className="text-center py-12 text-[#999] text-sm">
                    Keine Aktivitäten
                  </div>
                )
              )}

              {activeTab === "favorites" && (
                favorites.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {favorites.map((fav) => (
                      <Link key={fav.id} href={`/strains/${fav.strains?.slug}`}>
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#FAFAFA] border border-[#E5E5E5] relative">
                          {fav.strains?.image_url && (
                            <Image
                              src={fav.strains.image_url}
                              alt={fav.strains?.name || "Strain"}
                              fill
                              className="object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-xs font-semibold text-white truncate">
                              {fav.strains?.name}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#999] text-sm">
                    Keine Favoriten
                  </div>
                )
              )}

              {activeTab === "collections" && (
                collections.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {collections.map((col, idx) => (
                      <Link key={idx} href={`/strains/${col.strain?.slug}`}>
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#FAFAFA] border border-[#E5E5E5] relative">
                          {(col.user_image_url || col.strain?.image_url) && (
                            <Image
                              src={col.user_image_url || col.strain?.image_url || ""}
                              alt={col.strain?.name || "Strain"}
                              fill
                              className="object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-xs font-semibold text-white truncate">
                              {col.strain?.name}
                            </p>
                            {col.user_thc_percent && (
                              <p className="text-[10px] text-white/70">
                                {col.user_thc_percent}% THC
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#999] text-sm">
                    Keine Sammlung
                  </div>
                )
              )}

              {activeTab === "grows" && (
                grows.length > 0 ? (
                  <div className="space-y-3">
                    {grows.map((grow) => (
                      <Link key={grow.id} href={`/grows/${grow.id}`}>
                        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#2FF801]/10 flex items-center justify-center">
                            <span className="text-lg">🌱</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[#1A1A1A] text-sm truncate">{grow.title}</h3>
                            <p className="text-xs text-[#999] truncate">
                              {grow.strains?.name} · {grow.grow_type}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-[#F5F5F5] text-[#666] rounded-full">
                            {grow.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#999] text-sm">
                    Keine öffentlichen Grows
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
