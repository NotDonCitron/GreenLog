"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    Loader2,
    MapPin,
    Calendar,
    ArrowLeft,
    Shield,
    Lock,
    Sprout,
    Trophy,
    Zap,
    Leaf,
    Sparkles,
    Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { FollowButton } from "@/components/social/follow-button";
import { ActivityItem } from "@/components/social/activity-item";
import { UserCollectionsTab, type UserCollectionStrain } from "@/components/profile/user-collections-tab";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { normalizeCollectionSource } from "@/lib/strain-display";
import type { ProfileRow, ProfileStats, UserActivity, FollowStatus } from "@/lib/types";

const BADGE_ICONS: Record<string, LucideIcon> = {
    starter: Sprout,
    connoisseur: Trophy,
    highflyer: Zap,
    leaf: Leaf,
    dna: Sparkles,
    moon: Sparkles,
    sun: Sparkles,
    grower: Leaf,
    social: Users,
};

function resolveBadgeIcon(iconKey: string) {
    const normalized = iconKey.toLowerCase();
    const matchedKey = Object.keys(BADGE_ICONS).find((key) => normalized.includes(key));
    return matchedKey ? BADGE_ICONS[matchedKey] : Trophy;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
    });
}

interface UserBadgeWithDetails {
    id: string;
    badges: {
        name: string;
        icon_url: string | null;
    } | null;
}

interface FavoriteWithStrain {
    id: string;
    strains: {
        name: string;
        slug: string;
        image_url: string | null;
    } | null;
}

interface GrowWithStrain {
    id: string;
    title: string;
    grow_type: string;
    status: string;
    strains: {
        name: string;
    } | null;
}

interface CollectionRow {
    batch_info: string | null;
    user_notes: string | null;
    user_thc_percent: number | null;
    user_cbd_percent: number | null;
    user_image_url: string | null;
    date_added: string | null;
    strain: UserCollectionStrain[] | UserCollectionStrain | null;
}

export default function UserProfilePage() {
    const params = useParams();
    const username = params.username as string;
    const { user } = useAuth();

    const [profile, setProfile] = useState<ProfileRow | null>(null);
    const [stats, setStats] = useState<ProfileStats | null>(null);
    const [followStatus, setFollowStatus] = useState<FollowStatus>({
        is_following: false,
        is_following_me: false,
        has_pending_request: false,
    });
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [favorites, setFavorites] = useState<FavoriteWithStrain[]>([]);
    const [grows, setGrows] = useState<GrowWithStrain[]>([]);
    const [collections, setCollections] = useState<UserCollectionStrain[]>([]);
    const [userBadges, setUserBadges] = useState<UserBadgeWithDetails[]>([]);
    const [activeTab, setActiveTab] = useState<"activity" | "favorites" | "collections" | "grows">("activity");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    const isOwnProfile = user?.id === profile?.id;
    const isPrivateAndNotFollowing = profile?.profile_visibility === "private" && !isOwnProfile && !followStatus.is_following;

    const fetchProfileData = useCallback(async () => {
        if (!username) return;

        setIsLoading(true);
        setError(null);

        try {
            // Fetch profile by username
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("username", username)
                .single();

            if (profileError) throw new Error("User not found");
            setProfile(profileData);

            // Check follow status if not own profile
            if (user && user.id !== profileData.id) {
                const { data: followData } = await supabase
                    .from("follows")
                    .select("*")
                    .eq("follower_id", user.id)
                    .eq("following_id", profileData.id)
                    .single();

                const { data: reverseFollowData } = await supabase
                    .from("follows")
                    .select("*")
                    .eq("follower_id", profileData.id)
                    .eq("following_id", user.id)
                    .single();

                setFollowStatus({
                    is_following: !!followData,
                    is_following_me: !!reverseFollowData,
                    has_pending_request: false,
                });
            }

            // Fetch follower and following counts
            const { count: followers } = await supabase
                .from("follows")
                .select("*", { count: "exact", head: true })
                .eq("following_id", profileData.id);

            const { count: following } = await supabase
                .from("follows")
                .select("*", { count: "exact", head: true })
                .eq("follower_id", profileData.id);

            setFollowersCount(followers ?? 0);
            setFollowingCount(following ?? 0);

            // Fetch ratings count
            const { count: ratingsCount } = await supabase
                .from("ratings")
                .select("*", { count: "exact", head: true })
                .eq("user_id", profileData.id);

            // Fetch grows count
            const { count: growsCount } = await supabase
                .from("grows")
                .select("*", { count: "exact", head: true })
                .eq("user_id", profileData.id);

            // Fetch favorites
            const { data: favoritesData } = await supabase
                .from("user_strain_relations")
                .select(`
            *,
            strains:strain_id (*)
          `)
                .eq("user_id", profileData.id)
                .eq("is_favorite", true)
                .limit(10);

            // Fetch public grows
            const { data: growsData } = await supabase
                .from("grows")
                .select(`
            *,
            strains:strain_id (*)
          `)
                .eq("user_id", profileData.id)
                .eq("is_public", true)
                .limit(10);

            // Fetch visible collection items
            const { data: collectionData } = await supabase
                .from("user_collection")
                .select(`
            batch_info,
            user_notes,
            user_thc_percent,
            user_cbd_percent,
            user_image_url,
            date_added,
            strain:strains (*)
          `)
                .eq("user_id", profileData.id)
                .order("date_added", { ascending: false })
                .limit(24);

            const normalizedCollections = (collectionData as CollectionRow[] | null)?.reduce<UserCollectionStrain[]>((acc, item) => {
                const rawStrain = Array.isArray(item.strain) ? item.strain[0] : item.strain;
                if (!rawStrain) {
                    return acc;
                }

                acc.push({
                    ...rawStrain,
                    image_url: item.user_image_url || rawStrain.image_url || undefined,
                    source: normalizeCollectionSource(item.batch_info || rawStrain.source),
                    avg_thc: item.user_thc_percent ?? rawStrain.avg_thc ?? rawStrain.thc_max ?? undefined,
                    avg_cbd: item.user_cbd_percent ?? rawStrain.avg_cbd ?? rawStrain.cbd_max ?? undefined,
                    user_notes: item.user_notes,
                    collected_at: item.date_added,
                });

                return acc;
            }, []) ?? [];

            // Fetch recent activities
            const { data: activitiesData } = await supabase
                .from("user_activities")
                .select("*")
                .eq("user_id", profileData.id)
                .eq("is_public", true)
                .order("created_at", { ascending: false })
                .limit(20);

            // Fetch badges
            const { data: badgesData } = await supabase
                .from("user_badges")
                .select("*, badges(*)")
                .eq("user_id", profileData.id);

            setStats({
                totalStrains: ratingsCount ?? 0,
                totalGrows: growsCount ?? 0,
                favoriteCount: favoritesData?.length ?? 0,
                unlockedBadgeCount: badgesData?.length ?? 0,
                xp: 0,
                level: 1,
                progressToNextLevel: 0,
                followers: 0,
                following: 0,
            });

            setFavorites(favoritesData ?? []);
            setGrows(growsData ?? []);
            setCollections(normalizedCollections);
            setActivities(activitiesData ?? []);
            setUserBadges(badgesData ?? []);
        } catch (err) {
            console.error("Error fetching profile:", err);
            setError("User not found");
        } finally {
            setIsLoading(false);
        }
    }, [username, user]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    const handleFollowChange = () => {
        // Refresh follow status and counts
        fetchProfileData();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#355E3B] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-[#355E3B] flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold text-white mb-2">User Not Found</h1>
                <p className="text-white/60 mb-4">The user @{username} doesn&apos;t exist or their profile is private.</p>
                <Link href="/">
                    <button className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl">
                        <ArrowLeft className="h-4 w-4 inline mr-2" />
                        Go Home
                    </button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#355E3B] pb-24">
            {/* Header with back button */}
            <div className="sticky top-0 z-20 w-full max-w-full bg-[#355E3B]/95 border-b border-white/10 backdrop-blur-md">
                <div className="mx-auto w-full max-w-lg px-4 py-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <Link href="/discover" className="flex-shrink-0">
                            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                                <ArrowLeft className="h-5 w-5 text-white" />
                            </button>
                        </Link>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-lg font-bold text-white">
                                {profile.display_name || profile.username}
                            </h1>
                            <p className="truncate text-xs text-white/60">@{profile.username}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Info */}
            <div className="mx-auto w-full max-w-lg px-4 py-6">
                {/* Owner Badge Above Avatar */}
                {(profile.username === 'fabian.gebert' || profile.username === 'lars' || profile.username === 'lars.fieber' || profile.username === 'test' || profile.username === 'pascal') && (
                    <div className="flex justify-center mb-4">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#F39C12]/30 bg-[#F39C12]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F39C12]">
                            <Shield size={10} /> Owner
                        </span>
                    </div>
                )}
                
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-white/10 shadow-xl">
                                {profile.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt={profile.display_name ?? profile.username ?? ""}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-white/50">
                                        {profile.username?.[0]?.toUpperCase() || "?"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Name Info */}
                        <div className="min-w-0 flex-1">
                            <h2 className="truncate text-xl font-black tracking-tight text-white">
                                {profile.display_name || profile.username}
                            </h2>
                            <p className="truncate text-sm font-medium text-white/40">@{profile.username}</p>
                        </div>
                    </div>

                    {/* Follow Button (Desktop/Side) */}
                    {!isOwnProfile && (
                        <div className="hidden sm:block flex-shrink-0">
                            <FollowButton
                                userId={profile.id}
                                initialStatus={followStatus}
                                onFollowChange={handleFollowChange}
                            />
                        </div>
                    )}
                </div>

                {/* Follow Button (Mobile/Full Width) */}
                {!isOwnProfile && (
                    <div className="mt-4 block sm:hidden">
                        <FollowButton
                            userId={profile.id}
                            initialStatus={followStatus}
                            onFollowChange={handleFollowChange}
                            className="w-full justify-center py-3"
                        />
                    </div>
                )}

                {/* Stats Bar */}
                <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 rounded-[2rem] border border-white/10 bg-white/5 py-5 shadow-2xl backdrop-blur-md">
                    <div className="flex flex-col items-center justify-center">
                        <p className="text-xl font-black text-white tracking-tighter">{followersCount}</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Follower</p>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <p className="text-xl font-black text-white tracking-tighter">{followingCount}</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Gefolgt</p>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <p className="text-xl font-black text-[#2FF801] tracking-tighter">{stats?.totalStrains ?? 0}</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Ratings</p>
                    </div>
                </div>

                {/* Bio and Meta */}
                {profile.bio && (
                    <p className="mt-6 w-full break-words text-sm leading-relaxed text-white/80 [overflow-wrap:anywhere]">{profile.bio}</p>
                )}

                <div className="mt-4 flex w-full min-w-0 flex-wrap gap-4 text-[11px] font-medium text-white/40">
                    {profile.location && (
                        <span className="flex min-w-0 items-center gap-1 break-words [overflow-wrap:anywhere]">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {profile.location}
                        </span>
                    )}
                    <span className="flex min-w-0 items-center gap-1 break-words [overflow-wrap:anywhere]">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        Joined {formatDate(profile.created_at)}
                    </span>
                </div>

                {/* Badges Display */}
                {!isPrivateAndNotFollowing && userBadges.length > 0 && (
                    <div className="mt-6 w-full max-w-full overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2FF801] mb-3 px-1">Achievements</p>
                        <div className="flex w-full max-w-full gap-3 overflow-x-auto no-scrollbar pb-2">
                            {userBadges.map((ub) => {
                                const badge = ub.badges;
                                if (!badge) return null;
                                const Icon = resolveBadgeIcon(badge.icon_url || "starter");

                                return (
                                    <div
                                        key={ub.id}
                                        className="flex flex-col items-center gap-1.5 min-w-[70px] bg-white/5 border border-white/10 rounded-2xl p-2.5 shadow-lg"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-[#2FF801]/10 flex items-center justify-center text-[#ffd700]">
                                            <Icon size={24} />
                                        </div>
                                        <p className="text-[8px] font-black uppercase tracking-tighter text-white truncate w-full text-center">
                                            {badge.name}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs & Content */}
            <div className="mx-auto w-full max-w-lg px-4">
                {isPrivateAndNotFollowing ? (
                    <div className="mt-4 w-full max-w-full rounded-[2.5rem] border border-[#427249]/50 bg-[#2D5032] px-8 py-20 text-center">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-2xl">
                            <Lock size={32} className="text-white/20" />
                        </div>
                        <h2 className="mb-2 text-xl font-bold uppercase tracking-tight text-white">This Account is Private</h2>
                        <p className="text-sm leading-relaxed text-white/40">
                            Follow this user to see their ratings, grows, and collection progress.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="w-full max-w-full overflow-x-auto border-b border-white/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <div className="flex w-max min-w-max gap-6 pr-4">
                                <button
                                    onClick={() => setActiveTab("activity")}
                                    className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${activeTab === "activity"
                                        ? "text-[#A3E4D7] border-b-2 border-[#A3E4D7]"
                                        : "text-white/40"
                                        }`}
                                >
                                    Activity
                                </button>
                                <button
                                    onClick={() => setActiveTab("favorites")}
                                    className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${activeTab === "favorites"
                                        ? "text-[#A3E4D7] border-b-2 border-[#A3E4D7]"
                                        : "text-white/40"
                                        }`}
                                >
                                    Favorites
                                </button>
                                <button
                                    onClick={() => setActiveTab("collections")}
                                    className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${activeTab === "collections"
                                        ? "text-[#A3E4D7] border-b-2 border-[#A3E4D7]"
                                        : "text-white/40"
                                        }`}
                                >
                                    Sammlung
                                </button>
                                <button
                                    onClick={() => setActiveTab("grows")}
                                    className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${activeTab === "grows"
                                        ? "text-[#A3E4D7] border-b-2 border-[#A3E4D7]"
                                        : "text-white/40"
                                        }`}
                                >
                                    Grows
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="min-w-0 py-4">
                            {activeTab === "activity" && (
                                activities.length > 0 ? (
                                    <div className="bg-[#2D5032] border border-[#427249]/50 rounded-2xl overflow-hidden">
                                        {activities.map((activity) => (
                                            <ActivityItem
                                                key={activity.id}
                                                activity={activity}
                                                user={profile}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-white/40 text-sm">No recent activity</p>
                                    </div>
                                )
                            )}

                            {activeTab === "favorites" && (
                                favorites.length > 0 ? (
                                    <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
                                        {favorites.map((fav) => (
                                            <Link key={fav.id} href={`/strains/${fav.strains?.slug}`} className="min-w-0">
                                                <div className="relative aspect-square overflow-hidden rounded-xl border border-[#427249]/50 bg-[#2D5032]">
                                                    {fav.strains?.image_url && (
                                                        <img
                                                            src={fav.strains.image_url}
                                                            alt={fav.strains?.name ?? ""}
                                                            className="w-full h-full object-cover"
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
                                    <div className="text-center py-12">
                                        <p className="text-white/40 text-sm">No favorites yet</p>
                                    </div>
                                )
                            )}

                            {activeTab === "collections" && (
                                <UserCollectionsTab
                                    displayName={profile.display_name ?? profile.username ?? "This user"}
                                    collections={collections}
                                    canView={!isPrivateAndNotFollowing}
                                />
                            )}

                            {activeTab === "grows" && (
                                grows.length > 0 ? (
                                    <div className="space-y-3">
                                        {grows.map((grow) => (
                                            <Link key={grow.id} href={`/grows/${grow.id}`}>
                                                <div className="bg-[#2D5032] border border-[#427249]/50 rounded-xl p-4 flex items-center gap-3">
                                                    <div className="bg-[#A3E4D7]/20 w-10 h-10 rounded-full flex items-center justify-center">
                                                        <span className="text-lg">🌱</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-white text-sm truncate">{grow.title}</h3>
                                                        <p className="text-xs text-white/50 truncate">
                                                            {grow.strains?.name} • {grow.grow_type}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs px-2 py-1 bg-white/10 text-white/70 rounded-full">
                                                        {grow.status}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-white/40 text-sm">No public grows yet</p>
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
