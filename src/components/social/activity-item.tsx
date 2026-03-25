"use client";

import Link from "next/link";
import { Star, Sprout, Trophy, Heart, TrendingUp } from "lucide-react";
import type { UserActivity, ProfileRow } from "@/lib/types";

interface ActivityItemProps {
    activity: UserActivity;
    user: ProfileRow;
    className?: string;
}

function getActivityIcon(type: UserActivity["activity_type"]) {
    switch (type) {
        case "rating":
            return Star;
        case "grow_started":
            return Sprout;
        case "grow_completed":
            return TrendingUp;
        case "badge_earned":
            return Trophy;
        case "favorite_added":
            return Heart;
        default:
            return Star;
    }
}

function getActivityText(activity: UserActivity): string {
    switch (activity.activity_type) {
        case "rating":
            const rating = activity.metadata?.rating as number | undefined;
            return `rated ${activity.target_name} ${rating ? `(${rating}/5)` : ""}`;
        case "grow_started":
            return `started a new grow: ${activity.target_name}`;
        case "grow_completed":
            const yield_grams = activity.metadata?.yield_grams as number | undefined;
            return `completed grow: ${activity.target_name}${yield_grams ? ` (${yield_grams}g yield)` : ""}`;
        case "badge_earned":
            return `earned badge: ${activity.target_name}`;
        case "favorite_added":
            return `added ${activity.target_name} to favorites`;
        default:
            return `interacted with ${activity.target_name}`;
    }
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export function ActivityItem({ activity, user, className = "" }: ActivityItemProps) {
    const Icon = getActivityIcon(activity.activity_type);
    const activityText = getActivityText(activity);

    return (
        <div className={`flex gap-3 py-4 border-b border-white/5 ${className}`}>
            {/* Avatar */}
            <Link href={`/user/${user.username}`} className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                    {user.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.display_name ?? user.username ?? ""}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-sm font-bold text-white/50">
                            {user.username?.[0]?.toUpperCase() || "?"}
                        </span>
                    )}
                </div>
            </Link>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-[#00F5FF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white break-words [overflow-wrap:anywhere]">
                            <Link href={`/user/${user.username}`} className="font-semibold hover:underline">
                                {user.display_name || user.username}
                            </Link>{" "}
                            <span className="text-white/60">{activityText}</span>
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                            {formatTimeAgo(activity.created_at)}
                        </p>
                    </div>
                </div>

                {/* Optional Image Preview */}
                {activity.target_image_url && (
                    <Link href={`/strains/${activity.target_id}`} className="block mt-3">
                        <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-white/10">
                            <img
                                src={activity.target_image_url}
                                alt={activity.target_name ?? ""}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </Link>
                )}
            </div>
        </div>
    );
}
