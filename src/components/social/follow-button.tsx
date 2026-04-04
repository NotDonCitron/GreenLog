"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { followingKeys, followersKeys, followRequestsKeys } from "@/lib/query-keys";
import type { FollowStatus } from "@/lib/types";

interface FollowButtonProps {
    userId: string;
    profileVisibility?: "public" | "private" | null;
    initialStatus?: FollowStatus;
    size?: "default" | "sm" | "lg";
    onFollowChange?: () => void;
    className?: string;
}

export function FollowButton({
    userId,
    profileVisibility,
    initialStatus,
    size = "default",
    onFollowChange,
    className = "",
}: FollowButtonProps) {
    const { user, isDemoMode } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [localIsPrivate, setLocalIsPrivate] = useState(profileVisibility === "private");

    // Fetch follow status if not provided via initialStatus
    const { data: fetchedStatus } = useQuery({
        queryKey: ['follow-status', userId] as const,
        queryFn: async (): Promise<FollowStatus & { isPrivate: boolean }> => {
            // Fetch profile visibility if not provided
            let currentIsPrivate = profileVisibility === "private";
            if (profileVisibility === undefined) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("profile_visibility")
                    .eq("id", userId)
                    .single();

                if (profile) {
                    currentIsPrivate = profile.profile_visibility === "private";
                    setLocalIsPrivate(currentIsPrivate);
                }
            }

            // Fetch follow status
            const { data: followData } = await supabase
                .from("follows")
                .select("id")
                .eq("follower_id", user!.id)
                .eq("following_id", userId)
                .single();

            // Fetch pending request if profile is private
            let hasPending = false;
            if (currentIsPrivate || profileVisibility === "private") {
                const { data: requestData } = await supabase
                    .from("follow_requests")
                    .select("id, status")
                    .eq("requester_id", user!.id)
                    .eq("target_id", userId)
                    .eq("status", "pending")
                    .single();

                hasPending = !!requestData;
            }

            return {
                is_following: !!followData,
                is_following_me: false,
                has_pending_request: hasPending,
                isPrivate: currentIsPrivate,
            };
        },
        enabled: !!user && !initialStatus && !isDemoMode,
        staleTime: 30 * 1000, // 30 seconds
    });

    // Use fetched status when available, otherwise use initialStatus
    const computedStatus: FollowStatus = fetchedStatus ?? {
        is_following: initialStatus?.is_following ?? false,
        is_following_me: initialStatus?.is_following_me ?? false,
        has_pending_request: initialStatus?.has_pending_request ?? false,
    };
    const isPrivate = fetchedStatus?.isPrivate ?? (profileVisibility === "private");

    const isOwnProfile = user?.id === userId;

    const handleFollow = async () => {
        if (!user) {
            router.push("/login");
            return;
        }

        // Demo mode: toggle local state without Supabase calls
        if (isDemoMode) {
            setIsLoading(false);
            onFollowChange?.();
            return;
        }

        setIsLoading(true);
        try {
            if (computedStatus.is_following) {
                // Unfollow
                const { error } = await supabase
                    .from("follows")
                    .delete()
                    .eq("follower_id", user.id)
                    .eq("following_id", userId);

                if (!error) {
                    onFollowChange?.();
                    router.refresh();
                    // Invalidate React Query cache
                    queryClient.invalidateQueries({ queryKey: followingKeys.list(user.id) });
                    queryClient.invalidateQueries({ queryKey: followersKeys.list(userId) });
                }
            } else if (computedStatus.has_pending_request) {
                // Cancel follow request
                const { error } = await supabase
                    .from("follow_requests")
                    .delete()
                    .eq("requester_id", user.id)
                    .eq("target_id", userId)
                    .eq("status", "pending");

                if (!error) {
                    onFollowChange?.();
                    router.refresh();
                    // Invalidate React Query cache
                    queryClient.invalidateQueries({ queryKey: followRequestsKeys.list() });
                }
            } else {
                // Follow or send request - get session for auth
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token;

                const endpoint = `/api/follow-request/${userId}`;
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(accessToken && { "Authorization": `Bearer ${accessToken}` })
                    }
                });

                const result = await response.json();

                if (result.success) {
                    if (result.action === "followed") {
                        onFollowChange?.();
                        router.refresh();
                        // Invalidate React Query cache
                        queryClient.invalidateQueries({ queryKey: followingKeys.list(user.id) });
                        queryClient.invalidateQueries({ queryKey: followersKeys.list(userId) });
                    } else if (result.action === "request_sent") {
                        onFollowChange?.();
                        router.refresh();
                        // Invalidate React Query cache
                        queryClient.invalidateQueries({ queryKey: followRequestsKeys.list() });
                    }
                }
            }
        } catch (err) {
            console.error("Follow action failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isOwnProfile || ((!fetchedStatus && !initialStatus && !!user) && !isDemoMode)) {
        return null;
    }

    const isFollowing = computedStatus.is_following;
    const hasPendingRequest = computedStatus.has_pending_request;

    // Size classes
    const sizeClasses = size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-6 py-3 text-base" : "px-4 py-2 text-sm";

    // Custom styled buttons for green background
    if (isFollowing) {
        return (
            <button
                onClick={handleFollow}
                disabled={isLoading}
                className={`${sizeClasses} rounded-full font-semibold transition-all bg-white/10 text-[var(--foreground)] border border-white/20 hover:bg-white/20 disabled:opacity-50 ${className}`}
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                ) : (
                    "Following"
                )}
            </button>
        );
    }

    if (hasPendingRequest) {
        return (
            <button
                onClick={handleFollow}
                disabled={isLoading}
                className={`${sizeClasses} rounded-full font-semibold transition-all bg-white/10 text-[var(--foreground)] border border-white/20 hover:bg-white/20 disabled:opacity-50 ${className}`}
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                ) : (
                    "Requested"
                )}
            </button>
        );
    }

    return (
        <button
            onClick={handleFollow}
            disabled={isLoading}
            className={`${sizeClasses} rounded-full font-semibold transition-all bg-[#00F5FF] text-black hover:bg-[#00F5FF]/90 disabled:opacity-50 ${className}`}
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin inline" />
            ) : (
                isPrivate ? "Follow" : "Follow"
            )}
        </button>
    );
}
