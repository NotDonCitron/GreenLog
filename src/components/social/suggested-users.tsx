"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, UserPlus } from "lucide-react";
import { FollowButton } from "./follow-button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import type { SuggestedUser } from "@/lib/types";

interface SuggestedUsersProps {
    limit?: number;
    title?: string;
    showViewAll?: boolean;
    className?: string;
}

export function SuggestedUsers({
    limit = 8,
    title = "Suggested for you",
    showViewAll = true,
    className = "",
}: SuggestedUsersProps) {
    const { user } = useAuth();
    const [users, setUsers] = useState<SuggestedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchSuggestedUsers = async (isRefresh = false) => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            // Get users with similar strain ratings first
            const { data: userRatings } = await supabase
                .from("ratings")
                .select("strain_id")
                .eq("user_id", user.id);

            const userStrainIds = userRatings?.map((r) => r.strain_id) ?? [];

            // Get users already being followed
            const { data: followingData } = await supabase
                .from("follows")
                .select("following_id")
                .eq("follower_id", user.id);

            const followingIds = followingData?.map((f) => f.following_id) ?? [];

            // Build suggested users query
            let query = supabase
                .from("profiles")
                .select(`
          id,
          username,
          display_name,
          avatar_url,
          bio,
          profile_visibility
        `)
                .eq("profile_visibility", "public")
                .neq("id", user.id)
                .limit(limit * 3);

            const { data, error } = await query;

            if (error) throw error;

            // Filter out already followed users
            const filteredUsers = (data ?? []).filter(
                (p) => !followingIds.includes(p.id)
            );

            // Calculate common strains count for each user
            const usersWithCommonStrains: SuggestedUser[] = await Promise.all(
                filteredUsers.slice(0, limit).map(async (profile) => {
                    let commonStrainsCount = 0;

                    if (userStrainIds.length > 0) {
                        const { data: otherRatings } = await supabase
                            .from("ratings")
                            .select("strain_id")
                            .eq("user_id", profile.id)
                            .in("strain_id", userStrainIds);

                        commonStrainsCount = otherRatings?.length ?? 0;
                    }

                    return {
                        id: profile.id,
                        username: profile.username ?? "",
                        display_name: profile.display_name ?? undefined,
                        avatar_url: profile.avatar_url ?? undefined,
                        bio: profile.bio ?? undefined,
                        common_strains_count: commonStrainsCount,
                    };
                })
            );

            // Sort by common strains count
            usersWithCommonStrains.sort(
                (a, b) => (b.common_strains_count ?? 0) - (a.common_strains_count ?? 0)
            );

            setUsers(usersWithCommonStrains.slice(0, limit));
        } catch (err) {
            console.error("Error fetching suggested users:", err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSuggestedUsers();
    }, [user]);

    if (isLoading) {
        return (
            <div className={`py-6 ${className}`}>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-white/40" />
                </div>
            </div>
        );
    }

    if (users.length === 0) {
        return null;
    }

    return (
        <div className={`${className}`}>
            {/* Horizontal Scroll Container - Instagram Stories Style */}
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
                {users.map((suggestedUser) => (
                    <div
                        key={suggestedUser.id}
                        className="flex-shrink-0 w-28 text-center"
                    >
                        {/* Avatar Circle */}
                        <Link href={`/user/${suggestedUser.username}`} className="block">
                            <div className="relative mb-2 mx-auto w-20 h-20">
                                {/* Ring */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045]" />
                                {/* Inner Circle */}
                                <div className="absolute inset-[3px] rounded-full bg-[#355E3B] flex items-center justify-center overflow-hidden">
                                    {suggestedUser.avatar_url ? (
                                        <img
                                            src={suggestedUser.avatar_url}
                                            alt={suggestedUser.username}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-2xl font-bold text-white/50">
                                            {suggestedUser.username?.[0]?.toUpperCase() || "?"}
                                        </span>
                                    )}
                                </div>
                                {/* Add Button */}
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#00F5FF] rounded-full flex items-center justify-center border-2 border-[#355E3B]">
                                    <span className="text-black text-xs font-bold">+</span>
                                </div>
                            </div>

                            {/* Username */}
                            <p className="text-xs font-semibold text-white truncate">
                                {suggestedUser.display_name || suggestedUser.username}
                            </p>
                            <p className="text-[10px] text-white/50 truncate">
                                @{suggestedUser.username}
                            </p>
                        </Link>

                        {/* Follow Button */}
                        <div className="mt-2">
                            <FollowButton
                                userId={suggestedUser.id}
                                size="sm"
                                className="text-xs px-3 py-1"
                            />
                        </div>
                    </div>
                ))}
            </div>

            {showViewAll && (
                <div className="mt-4 text-center">
                    <Link
                        href="/discover"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-full text-sm font-semibold text-white transition-colors"
                    >
                        <UserPlus size={16} />
                        See All Suggestions
                    </Link>
                </div>
            )}
        </div>
    );
}
