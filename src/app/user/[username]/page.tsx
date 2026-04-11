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
import { supabase } from "@/lib/supabase/client";
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
    badge_id: string;
    badges?: {
        name: string;
        icon_url: string | null;
    } | null;
}

interface FavoriteWithStrain {
    strain_id: string;
    user_id: string;
    is_favorite: boolean;
    position: number | null;
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
    const { user, loading: authLoading } = useAuth();

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
    const [featuredBadges, setFeaturedBadges] = useState<string[]>([]);
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
            // 1. Fetch profile by username (Initial core fetch)
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("username", username)
                .single();

            if (profileError || !profileData) throw new Error("User not found");
            setProfile(profileData);
            setFeaturedBadges(profileData?.featured_badges || []);

            // 2. Parallel data fetching for everything else
            const [
                followDataRes,
                followerCountRes,
                followingCountRes,
                ratingsCountRes,
                growsCountRes,
                favoritesRes,
                publicGrowsRes,
                collectionRes,
                activitiesRes,
                badgesRes
            ] = await Promise.all([
                // Follow status (if logged in)
                user ? supabase
                    .from("follows")
                    .select("*")
                    .or(`and(follower_id.eq.${user.id},following_id.eq.${profileData.id}),and(follower_id.eq.${profileData.id},following_id.eq.${user.id})`)
                    : Promise.resolve({ data: [] }),
                
                // Counts
                supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileData.id),
                supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileData.id),
                supabase.from("ratings").select("*", { count: "exact", head: true }).eq("user_id", profileData.id),
                supabase.from("grows").select("*", { count: "exact", head: true }).eq("user_id", profileData.id),
                
                // Detailed data
                supabase.from("user_strain_relations").select("*, strains:strain_id (*)").eq("user_id", profileData.id).eq("is_favorite", true).limit(10),
                supabase.from("grows").select("*, strains:strain_id (*)").eq("user_id", profileData.id).eq("is_public", true).limit(10),
                supabase.from("user_collection").select("batch_info, user_notes, user_thc_percent, user_cbd_percent, user_image_url, date_added, strain:strains (*)").eq("user_id", profileData.id).order("date_added", { ascending: false }).limit(24),
                supabase.from("user_activities").select("*").eq("user_id", profileData.id).eq("is_public", true).order("created_at", { ascending: false }).limit(20),
                supabase.from("user_badges").select("*").eq("user_id", profileData.id)
            ]);

            // Process follow status
            if (user && followDataRes.data) {
                const isFollowing = followDataRes.data.some(f => f.follower_id === user.id && f.following_id === profileData.id);
                const isFollowingMe = followDataRes.data.some(f => f.follower_id === profileData.id && f.following_id === user.id);
                
                setFollowStatus({
                    is_following: isFollowing,
                    is_following_me: isFollowingMe,
                    has_pending_request: false,
                });
            }

            // Set counts
            setFollowersCount(followerCountRes.count ?? 0);
            setFollowingCount(followingCountRes.count ?? 0);

            // Normalize and set detailed data
            const normalizedCollections = (collectionRes.data as CollectionRow[] | null)?.reduce<UserCollectionStrain[]>((acc, item) => {
                const rawStrain = Array.isArray(item.strain) ? item.strain[0] : item.strain;
                if (!rawStrain) return acc;

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

            setStats({
                totalStrains: ratingsCountRes.count ?? 0,
                totalGrows: growsCountRes.count ?? 0,
                favoriteCount: favoritesRes.data?.length ?? 0,
                unlockedBadgeCount: badgesRes.data?.length ?? 0,
                xp: 0, level: 1, progressToNextLevel: 0, followers: 0, following: 0,
            });

            setFavorites(favoritesRes.data ?? []);
            setGrows(publicGrowsRes.data ?? []);
            setCollections(normalizedCollections);
            setActivities(activitiesRes.data ?? []);
            setUserBadges(badgesRes.data ?? []);
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

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#00F5FF]" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">User Not Found</h1>
                <p className="text-[var(--muted-foreground)] mb-4">The user @{username} doesn&apos;t exist or their profile is private.</p>
                <Link href="/">
                    <button className="px-6 py-3 bg-[var(--card)] text-[var(--foreground)] font-semibold rounded-xl border border-[var(--border)]/50">
                        <ArrowLeft className="h-4 w-4 inline mr-2" />
                        Go Home
                    </button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--background)] pb-24">
            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
            </div>

            {/* Header with back button */}
            <div className="sticky top-0 z-20 w-full max-w-full glass-surface border-b border-[var(--border)]/50 backdrop-blur-md">
                <div className="mx-auto w-full max-w-lg px-4 py-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <Link href="/discover" className="flex-shrink-0">
                            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--card)] border border-[var(--border)]/50">
                                <ArrowLeft className="h-5 w-5 text-[var(--foreground)]" />
                            </button>
                        </Link>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-lg font-bold text-[var(--foreground)]">
                                {profile.display_name || profile.username}
                            </h1>
                            <p className="truncate text-xs text-[var(--muted-foreground)]">@{profile.username}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Info */}
            <div className="mx-auto w-full max-w-lg px-4 py-6">
                {/* Owner Badge Above Avatar */}
                {(profile.username === 'fabian.gebert' || profile.username === 'lars' || profile.username === 'lars.fieber' || profile.username === 'test' || profile.username === 'pascal' || profile.username === 'hintermaier.pascal') && (
                    <div className="flex justify-center mb-6">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#F39C12]/30 bg-[#F39C12]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F39C12]">
                            <Shield size={10} /> CannaLog Owner
                        </span>
                    </div>
                )}
                
                <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[#00F5FF]/50 bg-[var(--card)] shadow-2xl backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00F5FF]/10 via-transparent to-[#2FF801]/10" />
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.display_name ?? profile.username ?? ""}
                                    className="relative z-10 w-full h-full object-cover"
                                />
                            ) : (
                                <span className="relative z-10 text-3xl font-black text-[#00F5FF] font-display">
                                    {profile.username?.[0]?.toUpperCase() || "?"}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex-1 pt-2">
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="flex flex-col items-center justify-center bg-[var(--card)]/50 border border-[var(--border)]/30 rounded-2xl py-2 px-1 backdrop-blur-sm">
                                <p className="text-lg font-black text-[#00F5FF] tracking-tighter font-display leading-tight">{followersCount}</p>
                                <p className="text-[7px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Follower</p>
                            </div>
                            <div className="flex flex-col items-center justify-center bg-[var(--card)]/50 border border-[var(--border)]/30 rounded-2xl py-2 px-1 backdrop-blur-sm">
                                <p className="text-lg font-black text-[var(--foreground)] tracking-tighter font-display leading-tight">{followingCount}</p>
                                <p className="text-[7px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Gefolgt</p>
                            </div>
                            <div className="flex flex-col items-center justify-center bg-[var(--card)]/50 border border-[var(--border)]/30 rounded-2xl py-2 px-1 backdrop-blur-sm">
                                <p className="text-lg font-black text-[#2FF801] tracking-tighter font-display leading-tight">{stats?.totalStrains ?? 0}</p>
                                <p className="text-[7px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Ratings</p>
                            </div>
                        </div>

                        {!isOwnProfile && (
                            <FollowButton
                                userId={profile.id}
                                initialStatus={followStatus}
                                onFollowChange={handleFollowChange}
                                className="w-full justify-center py-2.5"
                            />
                        )}
                    </div>
                </div>

                {/* Name & Bio */}
                <div className="mt-6 space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-[var(--foreground)] font-display uppercase italic">
                        {profile.display_name || profile.username}
                    </h2>
                    <p className="text-sm font-black text-[#2FF801] tracking-[0.2em]">@{profile.username}</p>
                    
                    {profile.bio && (
                        <p className="mt-4 w-full break-words text-sm leading-relaxed text-[var(--muted-foreground)] [overflow-wrap:anywhere] bg-[var(--card)]/30 border border-[var(--border)]/20 rounded-2xl p-4 italic">
                            &ldquo;{profile.bio}&rdquo;
                        </p>
                    )}
                </div>

                <div className="mt-6 flex w-full min-w-0 flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]/60">
                    {profile.location && (
                        <span className="flex min-w-0 items-center gap-1.5 break-words [overflow-wrap:anywhere]">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#00F5FF]" />
                            {profile.location}
                        </span>
                    )}
                    <span className="flex min-w-0 items-center gap-1.5 break-words [overflow-wrap:anywhere]">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-[#2FF801]" />
                        Joined {formatDate(profile.created_at)}
                    </span>
                </div>

                {/* Badges Section - Redesigned to 2x2 Grid */}
                {!isPrivateAndNotFollowing && userBadges.length > 0 && (
                    <section className="mt-10">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#00F5FF]">Abzeichen</p>
                            <span className="text-[9px] font-black text-[var(--muted-foreground)] uppercase">{userBadges.length} Unlocked</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
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
                                        className="rounded-2xl p-4 flex flex-col items-center text-center gap-2 transition-all border border-[#2FF801]/30 bg-[var(--card)]/50 backdrop-blur-sm"
                                    >
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1 bg-[#2FF801]/10 text-[#ffd76a]">
                                            <Icon size={28} />
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-tight leading-none text-[var(--foreground)]">{badgeName}</p>
                                        <p className="text-[8px] font-semibold uppercase tracking-tighter text-[#2FF801]">Unlocked</p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>

            {/* Tabs & Content */}
            <div className="mx-auto w-full max-w-lg px-4 relative z-10">
                {isPrivateAndNotFollowing ? (
                    <div className="mt-4 w-full max-w-full rounded-[2.5rem] border border-[var(--border)]/50 bg-[var(--card)] px-8 py-20 text-center">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border)]/50 bg-[var(--muted)] shadow-2xl">
                            <Lock size={32} className="text-[var(--muted-foreground)]" />
                        </div>
                        <h2 className="mb-2 text-xl font-bold uppercase tracking-tight text-[var(--foreground)]">This Account is Private</h2>
                        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                            Follow this user to see their ratings, grows, and collection progress.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="w-full max-w-full overflow-x-auto border-b border-[var(--border)]/50 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <div className="flex w-max min-w-max gap-6 pr-4">
                                <button
                                    onClick={() => setActiveTab("activity")}
                                    className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${activeTab === "activity"
                                        ? "text-[#00F5FF] border-b-2 border-[#00F5FF]"
                                        : "text-[var(--muted-foreground)]"
                                        }`}
                                >
                                    Activity
                                </button>
                                <button
                                    onClick={() => setActiveTab("favorites")}
                                    className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${activeTab === "favorites"
                                        ? "text-[#00F5FF] border-b-2 border-[#00F5FF]"
                                        : "text-[var(--muted-foreground)]"
                                        }`}
                                >
                                    Favorites
                                </button>
                                <button
                                    onClick={() => setActiveTab("collections")}
                                    className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${activeTab === "collections"
                                        ? "text-[#00F5FF] border-b-2 border-[#00F5FF]"
                                        : "text-[var(--muted-foreground)]"
                                        }`}
                                >
                                    Sammlung
                                </button>
                                <button
                                    onClick={() => setActiveTab("grows")}
                                    className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${activeTab === "grows"
                                        ? "text-[#00F5FF] border-b-2 border-[#00F5FF]"
                                        : "text-[var(--muted-foreground)]"
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
                                    <div className="bg-[var(--card)] border border-[var(--border)]/50 rounded-2xl overflow-hidden">
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
                                        <p className="text-[var(--muted-foreground)] text-sm">No recent activity</p>
                                    </div>
                                )
                            )}

                            {activeTab === "favorites" && (
                                favorites.length > 0 ? (
                                    <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
                                        {favorites.map((fav) => (
                                            <Link key={fav.strain_id} href={`/strains/${fav.strains?.slug}`} className="min-w-0">
                                                <div className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border)]/50 bg-[var(--card)]">
                                                    {fav.strains?.image_url && (
                                                        <img
                                                            src={fav.strains.image_url}
                                                            alt={fav.strains?.name ?? ""}
                                                            className="absolute inset-0 w-full h-full object-cover"
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f]/80 to-transparent" />
                                                    <div className="absolute bottom-2 left-2 right-2">
                                                        <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                                                            {fav.strains?.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-[var(--muted-foreground)] text-sm">No favorites yet</p>
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
                                                <div className="bg-[var(--card)] border border-[var(--border)]/50 rounded-xl p-4 flex items-center gap-3">
                                                    <div className="bg-[#2FF801]/10 w-10 h-10 rounded-full flex items-center justify-center">
                                                        <span className="text-lg">🌱</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-[var(--foreground)] text-sm truncate">{grow.title}</h3>
                                                        <p className="text-xs text-[var(--muted-foreground)] truncate">
                                                            {grow.strains?.name} • {grow.grow_type}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs px-2 py-1 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-full">
                                                        {grow.status}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-[var(--muted-foreground)] text-sm">No public grows yet</p>
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
