"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import type { FollowStatus } from "@/lib/types";

interface FollowButtonProps {
    userId: string;
    initialStatus?: FollowStatus;
    size?: "default" | "sm" | "lg";
    onFollowChange?: () => void;
    className?: string;
}

export function FollowButton({
    userId,
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

    // Update status when initialStatus changes
    useEffect(() => {
        if (initialStatus) {
            setStatus(initialStatus);
            setIsInitialized(true);
        }
    }, [initialStatus]);

    // Fetch follow status if not provided
    useEffect(() => {
        if (!user || initialStatus) {
            setIsInitialized(true);
            return;
        }

        const fetchStatus = async () => {
            const { data } = await supabase
                .from("follows")
                .select("id")
                .eq("follower_id", user.id)
                .eq("following_id", userId)
                .single();

            setStatus({ is_following: !!data, is_following_me: false, has_pending_request: false });
            setIsInitialized(true);
        };

        fetchStatus();
    }, [user, userId, initialStatus]);

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
            } else {
                // Follow
                const { error } = await supabase
                    .from("follows")
                    .insert({ follower_id: user.id, following_id: userId });

                if (!error) {
                    setStatus((prev) => ({ ...prev, is_following: true }));
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
                className={`${sizeClasses} rounded-full font-semibold transition-all bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50 ${className}`}
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                ) : (
                    "Following"
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
                "Follow"
            )}
        </button>
    );
}
