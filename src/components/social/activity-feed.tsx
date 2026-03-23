"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ActivityItem } from "./activity-item";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import type { SocialFeedItem } from "@/lib/types";

interface ActivityFeedProps {
    initialActivities?: SocialFeedItem[];
    userId?: string;
    showDiscover?: boolean;
    className?: string;
}

export function ActivityFeed({
    initialActivities = [],
    userId,
    showDiscover = false,
    className = "",
}: ActivityFeedProps) {
    const { user } = useAuth();
    const [activities, setActivities] = useState<SocialFeedItem[]>(initialActivities);
    const [isLoading, setIsLoading] = useState(initialActivities.length === 0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchActivities = async (isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);

        try {
            let query = supabase
                .from("user_activities")
                .select(`
          *,
          user:profiles!user_id(*)
        `)
                .order("created_at", { ascending: false })
                .limit(50);

            // If userId is provided, fetch activities for that user's profile
            if (userId) {
                query = query.eq("user_id", userId);
            } else if (!showDiscover) {
                // Otherwise, fetch activities from followed users (for feed)
                const { data: followingData } = await supabase
                    .from("follows")
                    .select("following_id")
                    .eq("follower_id", user?.id);

                const followingIds = followingData?.map((f) => f.following_id) ?? [];

                if (followingIds.length > 0) {
                    query = query.in("user_id", followingIds);
                } else {
                    // User follows no one yet - show discover feed instead
                    query = query.eq("is_public", true);
                }
            } else {
                // Discover mode - show all public activities
                query = query.eq("is_public", true);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            const feedItems: SocialFeedItem[] = (data ?? [])
                .filter((activity) => activity.user != null)
                .map((activity) => ({
                    activity,
                    user: activity.user as any,
                }));

            setActivities(feedItems);
        } catch (err) {
            console.error("Error fetching activities:", err);
            setError("Failed to load activities");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (user || showDiscover) {
            fetchActivities();
        }
    }, [user, showDiscover]);

    const handleRefresh = () => {
        fetchActivities(true);
    };

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center py-12 ${className}`}>
                <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`text-center py-12 ${className}`}>
                <p className="text-white/60 mb-4">{error}</p>
                <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-white/10 rounded-lg text-sm font-semibold text-white hover:bg-white/20"
                >
                    <RefreshCw className="h-4 w-4 inline mr-2" />
                    Try Again
                </button>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className={`text-center py-12 ${className}`}>
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ActivityIcon className="h-8 w-8 text-white/40" />
                </div>
                <p className="text-white/60 mb-2">No activities yet</p>
                <p className="text-sm text-white/40 mb-4">
                    {showDiscover
                        ? "Public activities will appear here"
                        : "Follow other users to see their activities here"}
                </p>
                {!showDiscover && (
                    <Link
                        href="/discover"
                        className="inline-block px-6 py-2.5 bg-[#00F5FF] text-black font-bold rounded-full text-sm"
                    >
                        Discover Users
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className={`${className}`}>
            {/* Instagram-style activity list */}
            <div className="bg-white/5 rounded-2xl overflow-hidden">
                {activities.map((item) => (
                    <ActivityItem
                        key={item.activity.id}
                        activity={item.activity}
                        user={item.user}
                    />
                ))}
            </div>

            {/* Refresh button */}
            <div className="text-center mt-4">
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-4 py-2 text-sm text-white/60 hover:text-white flex items-center gap-2 mx-auto"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? "Loading..." : "Load more"}
                </button>
            </div>
        </div>
    );
}

// Simple Activity icon component
function ActivityIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}
