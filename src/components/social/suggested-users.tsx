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

            const userStrainIds = userRatings?.map((r: { strain_id: string }) => r.strain_id) ?? [];

            // Get users already being followed
            const { data: followingData } = await supabase
                .from("follows")
                .select("following_id")
                .eq("follower_id", user.id);

            const followingIds = followingData?.map((f: { following_id: string }) => f.following_id) ?? [];

            // Get pending follow requests for private profiles
            const { data: pendingRequests } = await supabase
                .from("follow_requests")
                .select("target_id, status")
                .eq("requester_id", user.id)
                .eq("status", "pending");

            const pendingRequestIds = pendingRequests?.map((r: { target_id: string }) => r.target_id) ?? [];

            // Build suggested users query - include both public profiles AND private profiles with pending requests
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
                .neq("id", user.id);

            // Add visibility filter if we have any pending requests
            if (pendingRequestIds.length > 0) {
                query = query.or(`profile_visibility.eq.public,id.in.(${pendingRequestIds.join(",")})`);
            } else {
                query = query.eq("profile_visibility", "public");
            }

            const { data, error } = await query.limit(limit * 3);

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

                    const hasPending = pendingRequestIds.includes(profile.id);

                    return {
                        id: profile.id,
                        username: profile.username ?? "",
                        display_name: profile.display_name ?? undefined,
                        avatar_url: profile.avatar_url ?? undefined,
                        bio: profile.bio ?? undefined,
                        common_strains_count: commonStrainsCount,
                        profile_visibility: profile.profile_visibility,
                        has_pending_request: hasPending,
                        is_following: followingIds.includes(profile.id),
                    };
                })
            );

            // Sort by common strains count, then put pending requests at the end
            usersWithCommonStrains.sort(
                (a, b) => {
                    // Pending requests go to the end
                    if (a.has_pending_request && !b.has_pending_request) return 1;
                    if (!a.has_pending_request && b.has_pending_request) return -1;
                    return (b.common_strains_count ?? 0) - (a.common_strains_count ?? 0);
                }
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
                                {/* Ring - different color for private profiles with pending request */}
                                <div className={`absolute inset-0 rounded-full ${suggestedUser.has_pending_request
                                    ? "bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500"
                                    : "bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045]"
                                    }`} />
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
                                {/* Add Button or Pending indicator */}
                                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#355E3B] ${suggestedUser.has_pending_request
                                    ? "bg-yellow-400"
                                    : "bg-[#00F5FF]"
                                    }`}>
                                    {suggestedUser.has_pending_request ? (
                                        <span className="text-black text-xs">...</span>
                                    ) : (
                                        <span className="text-black text-xs font-bold">+</span>
                                    )}
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
