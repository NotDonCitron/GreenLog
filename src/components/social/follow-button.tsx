"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
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
    const { user } = useAuth();
    const router = useRouter();
    const [status, setStatus] = useState<FollowStatus>(
        initialStatus ?? { is_following: false, is_following_me: false, has_pending_request: false }
    );
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(!!initialStatus);
    const [isPrivate, setIsPrivate] = useState(profileVisibility === "private");

    // Update status when initialStatus changes
    useEffect(() => {
        if (initialStatus) {
            setStatus(initialStatus);
            setIsInitialized(true);
        }
    }, [initialStatus]);

    // Fetch follow status and profile visibility if not provided
    useEffect(() => {
        if (!user) {
            setIsInitialized(true);
            return;
        }

        const fetchStatus = async () => {
            // Fetch profile visibility if not provided
            if (profileVisibility === undefined) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("profile_visibility")
                    .eq("id", userId)
                    .single();

                if (profile) {
                    setIsPrivate(profile.profile_visibility === "private");
                }
            }

            // Fetch follow status
            const { data: followData } = await supabase
                .from("follows")
                .select("id")
                .eq("follower_id", user.id)
                .eq("following_id", userId)
                .single();

            // Fetch pending request if profile is private
            let hasPending = false;
            if (isPrivate || profileVisibility === "private") {
                const { data: requestData } = await supabase
                    .from("follow_requests")
                    .select("id, status")
                    .eq("requester_id", user.id)
                    .eq("target_id", userId)
                    .eq("status", "pending")
                    .single();

                hasPending = !!requestData;
            }

            setStatus({
                is_following: !!followData,
                is_following_me: false,
                has_pending_request: hasPending
            });
            setIsInitialized(true);
        };

        fetchStatus();
    }, [user, userId, initialStatus, profileVisibility, isPrivate]);

    const isOwnProfile = user?.id === userId;

    const handleFollow = async () => {
        if (!user) {
            router.push("/login");
            return;
        }

        setIsLoading(true);
        try {
            if (status.is_following) {
                // Unfollow
                const { error } = await supabase
                    .from("follows")
                    .delete()
                    .eq("follower_id", user.id)
                    .eq("following_id", userId);

                if (!error) {
                    setStatus((prev) => ({ ...prev, is_following: false }));
                    onFollowChange?.();
                    router.refresh();
                }
            } else if (status.has_pending_request) {
                // Cancel follow request
                const { error } = await supabase
                    .from("follow_requests")
                    .delete()
                    .eq("requester_id", user.id)
                    .eq("target_id", userId)
                    .eq("status", "pending");

                if (!error) {
                    setStatus((prev) => ({ ...prev, has_pending_request: false }));
                    onFollowChange?.();
                    router.refresh();
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
                        setStatus((prev) => ({ ...prev, is_following: true }));
                    } else if (result.action === "request_sent") {
                        setStatus((prev) => ({ ...prev, has_pending_request: true }));
                    }
                    onFollowChange?.();
                    router.refresh();
                }
            }
        } catch (err) {
            console.error("Follow action failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isOwnProfile || !isInitialized) {
        return null;
    }

    const isFollowing = status.is_following;
    const hasPendingRequest = status.has_pending_request;

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
