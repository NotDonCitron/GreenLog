"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ActivityItem } from "./activity-item";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import type { SocialFeedItem, ProfileRow } from "@/lib/types";

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

    const fetchActivities = useCallback(async (isRefresh = false) => {
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
                    user: activity.user as ProfileRow,
                }));

            setActivities(feedItems);
        } catch (err) {
            console.error("Error fetching activities:", err);
            setError("Failed to load activities");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user, userId, showDiscover]);

    // Initial fetch
    useEffect(() => {
        if (user || showDiscover) {
            void fetchActivities();
        }
    }, [user, showDiscover]);

    // Realtime subscription for new activities
    useEffect(() => {
        if (!user && !showDiscover) return;

        let channel: ReturnType<typeof supabase.channel> | null = null;

        try {
            // Check if realtime is available (WebSocket support)
            if (!supabase.getChannels().length) {
                channel = supabase
                    .channel('user_activities_realtime')
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'user_activities',
                            filter: showDiscover ? 'is_public=eq.true' : undefined,
                        },
                        async (payload) => {
                            // Fetch the full activity with user profile
                            const { data: newActivity } = await supabase
                                .from("user_activities")
                                .select(`*, user:profiles!user_id(*)`)
                                .eq("id", payload.new.id)
                                .single();

                            if (newActivity && newActivity.user) {
                                const feedItem: SocialFeedItem = {
                                    activity: newActivity,
                                    user: newActivity.user as ProfileRow,
                                };

                                // Add to beginning of list (newest first)
                                setActivities((prev) => [feedItem, ...prev.slice(0, 49)]);
                            }
                        }
                    )
                    .subscribe();
            }
        } catch (err) {
            // WebSocket not available - realtime disabled, fallback to polling
            console.warn('Realtime unavailable, using polling fallback');
        }

        return () => {
            if (channel) {
                void supabase.removeChannel(channel);
            }
        };
    }, [user, showDiscover]);

    const handleRefresh = () => {
        void fetchActivities(true);
    };

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center py-12 ${className}`}>
                <Loader2 className="h-8 w-8 animate-spin text-[var(--foreground)]/40" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`text-center py-12 ${className}`}>
                <p className="text-[var(--foreground)]/60 mb-4">{error}</p>
                <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-[var(--muted)] rounded-lg text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted-foreground)]/20"
                >
                    <RefreshCw className="h-4 w-4 inline mr-2" />
                    Erneut versuchen
                </button>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className={`text-center py-12 ${className}`}>
                <div className="w-16 h-16 bg-[var(--muted)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <ActivityIcon className="h-8 w-8 text-[var(--foreground)]/40" />
                </div>
                <p className="text-[var(--foreground)]/60 mb-2">Noch keine Aktivitäten</p>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    {showDiscover
                        ? "Öffentliche Aktivitäten erscheinen hier"
                        : "Folge anderen Usern um ihre Aktivitäten zu sehen"}
                </p>
                {!showDiscover && (
                    <Link
                        href="/discover"
                        className="inline-block px-6 py-2.5 bg-[#00F5FF] text-black font-bold rounded-full text-sm"
                    >
                        User entdecken
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className={`${className}`}>
            {/* Live indicator */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#2FF801] animate-pulse" />
                <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-bold">Live</span>
            </div>

            {/* Activity list */}
            <div className="bg-[var(--card)] rounded-2xl overflow-hidden border border-[var(--border)]">
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
                    className="px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-2 mx-auto"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? "Laden..." : "Mehr laden"}
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
