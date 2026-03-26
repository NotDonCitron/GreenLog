"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, UserPlus, Building2 } from "lucide-react";
import { FollowButton } from "./follow-button";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import type { SuggestedUser } from "@/lib/types";

export interface SuggestedCommunity {
    id: string;
    name: string;
    organization_type: "club" | "pharmacy" | null;
    logo_url: string | null;
    is_member: boolean;
}

interface SuggestedUsersProps {
    limit?: number;
    title?: string;
    showViewAll?: boolean;
    showCommunities?: boolean;
    className?: string;
}

export function SuggestedUsers({
    limit = 8,
    title = "Suggested for you",
    showViewAll = true,
    showCommunities = false,
    className = "",
}: SuggestedUsersProps) {
    const { user } = useAuth();
    const [users, setUsers] = useState<SuggestedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
    const [communities, setCommunities] = useState<SuggestedCommunity[]>([]);
    const [joinedCommunityIds, setJoinedCommunityIds] = useState<Set<string>>(new Set());

    const handleFollow = async (targetUserId: string) => {
        if (!user) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            const endpoint = `/api/follow-request/${targetUserId}`;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { "Authorization": `Bearer ${accessToken}` })
                }
            });

            const result = await response.json();

            if (result.success) {
                setFollowingUsers(prev => new Set([...prev, targetUserId]));
                fetchSuggestedUsers();
            }
        } catch (err) {
            console.error("Follow action failed:", err);
        }
    };

    const handleJoinCommunity = async (communityId: string) => {
        if (!user) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            const endpoint = `/api/community/${communityId}/join`;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { "Authorization": `Bearer ${accessToken}` })
                }
            });

            const result = await response.json();

            if (result.success) {
                setJoinedCommunityIds(prev => new Set([...prev, communityId]));
                fetchSuggestedUsers();
            }
        } catch (err) {
            console.error("Join community failed:", err);
        }
    };

    const fetchSuggestedUsers = async (isRefresh = false) => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const authClient = supabase;

            // Get users with similar strain ratings first
            const { data: userRatings } = await authClient
                .from("ratings")
                .select("strain_id")
                .eq("user_id", user.id);

            const userStrainIds = userRatings?.map((r: { strain_id: string }) => r.strain_id) ?? [];

            // Get users already being followed
            const { data: followingData } = await authClient
                .from("follows")
                .select("following_id")
                .eq("follower_id", user.id);

            const followingIds = followingData?.map((f: { following_id: string }) => f.following_id) ?? [];

            // Get pending follow requests for private profiles
            const { data: pendingRequests } = await authClient
                .from("follow_requests")
                .select("target_id, status")
                .eq("requester_id", user.id)
                .eq("status", "pending");

            const pendingRequestIds = pendingRequests?.map((r: { target_id: string }) => r.target_id) ?? [];

            // Build suggested users query - include both public profiles AND private profiles with pending requests
            let query = authClient
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

            // Fetch suggested communities (only if showCommunities is true)
            if (showCommunities) {
                // Get organizations user is already member of
                const { data: memberships } = await supabase
                    .from("organization_members")
                    .select("organization_id")
                    .eq("user_id", user.id)
                    .eq("membership_status", "active");

                const joinedOrgIds = memberships?.map((m: { organization_id: string }) => m.organization_id) ?? [];

                const { data: orgsData } = await supabase
                    .from("organizations")
                    .select("id, name, organization_type, logo_url")
                    .eq("status", "active")
                    .limit(limit * 3);

                const filteredOrgs = (orgsData ?? []).filter(
                    (org) => !joinedOrgIds.includes(org.id)
                );

                const suggested: SuggestedCommunity[] = filteredOrgs.slice(0, limit).map(org => ({
                    id: org.id,
                    name: org.name,
                    organization_type: org.organization_type as "club" | "pharmacy" | null,
                    logo_url: org.logo_url ?? null,
                    is_member: false,
                }));

                setCommunities(suggested);
                setJoinedCommunityIds(new Set(joinedOrgIds));
            }
        } catch (err) {
            console.error("Error fetching suggested users:", err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSuggestedUsers();
    }, [user, limit, showCommunities]);

    if (isLoading) {
        return (
            <div className={`py-6 ${className}`}>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--foreground)]/40" />
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
                                        <span className="text-2xl font-bold text-[var(--foreground)]/50">
                                            {suggestedUser.username?.[0]?.toUpperCase() || "?"}
                                        </span>
                                    )}
                                </div>
                                {/* Add Button or Pending indicator */}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleFollow(suggestedUser.id);
                                    }}
                                    disabled={suggestedUser.has_pending_request || followingUsers.has(suggestedUser.id)}
                                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#355E3B] transition-all ${suggestedUser.has_pending_request || followingUsers.has(suggestedUser.id)
                                        ? "bg-yellow-400"
                                        : "bg-[#00F5FF] hover:bg-[#00F5FF]/80 cursor-pointer"
                                        }`}
                                >
                                    {followingUsers.has(suggestedUser.id) ? (
                                        <span className="text-black text-xs">✓</span>
                                    ) : suggestedUser.has_pending_request ? (
                                        <span className="text-black text-xs">...</span>
                                    ) : (
                                        <span className="text-black text-xs font-bold">+</span>
                                    )}
                                </button>
                            </div>

                            {/* Username */}
                            <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                                {suggestedUser.display_name || suggestedUser.username}
                            </p>
                            <p className="text-[10px] text-[var(--foreground)]/50 truncate">
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

                {/* Communities */}
                {communities.map((community) => (
                    <div
                        key={`community-${community.id}`}
                        className="flex-shrink-0 w-28 text-center"
                    >
                        {/* Community Avatar Circle */}
                        <Link href={`/community/${community.id}`} className="block">
                            <div className="relative mb-2 mx-auto w-20 h-20">
                                {/* Gradient Ring */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045]" />
                                {/* Inner Circle */}
                                <div className="absolute inset-[3px] rounded-full bg-[#355E3B] flex items-center justify-center overflow-hidden">
                                    {community.logo_url ? (
                                        <img
                                            src={community.logo_url}
                                            alt={community.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Building2 size={28} className="text-[var(--foreground)]/50" />
                                    )}
                                </div>
                                {/* Join/Member Button */}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleJoinCommunity(community.id);
                                    }}
                                    disabled={joinedCommunityIds.has(community.id)}
                                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#355E3B] transition-all ${
                                        joinedCommunityIds.has(community.id)
                                            ? "bg-[#2FF801]"
                                            : "bg-[#00F5FF] hover:bg-[#00F5FF]/80 cursor-pointer"
                                    }`}
                                >
                                    {joinedCommunityIds.has(community.id) ? (
                                        <span className="text-black text-xs">✓</span>
                                    ) : (
                                        <span className="text-black text-xs font-bold">+</span>
                                    )}
                                </button>
                            </div>

                            {/* Community Name */}
                            <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                                {community.name}
                            </p>
                            <p className="text-[10px] text-[var(--foreground)]/50 truncate">
                                {community.organization_type === "club" ? "Club" : community.organization_type === "pharmacy" ? "Apotheke" : "Community"}
                            </p>
                        </Link>
                    </div>
                ))}
            </div>

            {showViewAll && (
                <div className="mt-4 text-center">
                    <Link
                        href="/discover"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-full text-sm font-semibold text-[var(--foreground)] transition-colors"
                    >
                        <UserPlus size={16} />
                        See All Suggestions
                    </Link>
                </div>
            )}
        </div>
    );
}
