"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, MapPin, Calendar, ArrowLeft, Shield, Lock } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { FollowButton } from "@/components/social/follow-button";
import { ActivityItem } from "@/components/social/activity-item";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import type { ProfileRow, ProfileStats, UserActivity, FollowStatus } from "@/lib/types";

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
    });
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
    const [favorites, setFavorites] = useState<any[]>([]);
    const [grows, setGrows] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"activity" | "favorites" | "grows">("activity");
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

            // Fetch recent activities
            const { data: activitiesData } = await supabase
                .from("user_activities")
                .select("*")
                .eq("user_id", profileData.id)
                .eq("is_public", true)
                .order("created_at", { ascending: false })
                .limit(20);

            setStats({
                totalStrains: ratingsCount ?? 0,
                totalGrows: growsCount ?? 0,
                favoriteCount: favoritesData?.length ?? 0,
                unlockedBadgeCount: 0,
                xp: 0,
                level: 1,
                progressToNextLevel: 0,
                followers: 0,
                following: 0,
            });

            setFavorites(favoritesData ?? []);
            setGrows(growsData ?? []);
            setActivities(activitiesData ?? []);
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
                <p className="text-white/60 mb-4">The user @{username} doesn't exist or their profile is private.</p>
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
        <div className="min-h-screen bg-[#355E3B] pb-24">
            {/* Header with back button */}
            <div className="sticky top-0 z-20 bg-[#355E3B]/95 backdrop-blur-md border-b border-white/10">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/discover" className="flex-shrink-0">
                            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                <ArrowLeft className="h-5 w-5 text-white" />
                            </button>
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-lg font-bold text-white">
                                {profile.display_name || profile.username}
                            </h1>
                            <p className="text-xs text-white/60">@{profile.username}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Info */}
            <div className="max-w-lg mx-auto px-4 py-6">
                {/* Owner Badge Above Avatar */}
                {(profile.username === 'fabian.gebert' || profile.username === 'lars.fieber' || profile.username === 'test') && (
                    <div className="flex justify-center mb-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#F39C12]/30 bg-[#F39C12]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F39C12]">
                            <Shield size={10} /> Owner
                        </span>
                    </div>
                )}
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border-2 border-white/20">
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.display_name ?? profile.username ?? ""}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-2xl font-bold text-white/50">
                                    {profile.username?.[0]?.toUpperCase() || "?"}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex-1">
                        <div className="flex gap-6">
                            <div className="text-center">
                                <p className="text-xl font-bold text-white">{followersCount}</p>
                                <p className="text-xs text-white/60">Followers</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-white">{followingCount}</p>
                                <p className="text-xs text-white/60">Following</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-white">{stats?.totalStrains ?? 0}</p>
                                <p className="text-xs text-white/60">Ratings</p>
                            </div>
                        </div>
                    </div>

                    {/* Follow Button */}
                    {!isOwnProfile && (
                        <div className="flex-shrink-0">
                            <FollowButton
                                userId={profile.id}
                                initialStatus={followStatus}
                                onFollowChange={handleFollowChange}
                            />
                        </div>
                    )}
                </div>

                {/* Bio and Meta */}
                {profile.bio && (
                    <p className="mt-4 text-sm text-white/80">{profile.bio}</p>
                )}

                <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/50">
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
            </div>

            {/* Tabs & Content */}
            <div className="max-w-lg mx-auto px-4">
                {isPrivateAndNotFollowing ? (
                    <div className="py-20 text-center bg-[#2D5032] border border-[#427249]/50 rounded-[2.5rem] mt-4 px-8">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-2xl">
                            <Lock size={32} className="text-white/20" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">This Account is Private</h2>
                        <p className="text-white/40 text-sm leading-relaxed">
                            Follow this user to see their ratings, grows, and collection progress.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-6 border-b border-white/10">
                            <button
                                onClick={() => setActiveTab("activity")}
                                className={`pb-3 text-sm font-semibold transition-colors ${activeTab === "activity"
                                    ? "text-[#A3E4D7] border-b-2 border-[#A3E4D7]"
                                    : "text-white/40"
                                    }`}
                            >
                                Activity
                            </button>
                            <button
                                onClick={() => setActiveTab("favorites")}
                                className={`pb-3 text-sm font-semibold transition-colors ${activeTab === "favorites"
                                    ? "text-[#A3E4D7] border-b-2 border-[#A3E4D7]"
                                    : "text-white/40"
                                    }`}
                            >
                                Favorites
                            </button>
                            <button
                                onClick={() => setActiveTab("grows")}
                                className={`pb-3 text-sm font-semibold transition-colors ${activeTab === "grows"
                                    ? "text-[#A3E4D7] border-b-2 border-[#A3E4D7]"
                                    : "text-white/40"
                                    }`}
                            >
                                Grows
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="py-4">
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
                                    <div className="grid grid-cols-3 gap-2">
                                        {favorites.map((fav) => (
                                            <Link key={fav.id} href={`/strains/${fav.strains?.slug}`}>
                                                <div className="aspect-square rounded-xl overflow-hidden bg-[#2D5032] border border-[#427249]/50 relative">
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
