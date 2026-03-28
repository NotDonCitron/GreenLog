"use client";

import { memo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Sprout, Trophy, Heart, TrendingUp, Loader2, HeartOff } from "lucide-react";
import type { UserActivity, ProfileRow } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

interface ActivityItemProps {
    activity: UserActivity;
    user: ProfileRow;
    className?: string;
}

function getActivityIcon(type: string) {
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
        case "strain_collected":
            return Heart;
        default:
            return Star;
    }
}

function getActivityText(activity: UserActivity): string {
    switch (activity.activity_type as string) {
        case "rating":
            const rating = activity.metadata?.rating as number | undefined;
            return `hat ${activity.target_name} bewertet${rating ? ` (${rating}/5)` : ""}`;
        case "grow_started":
            return `hat einen neuen Grow gestartet: ${activity.target_name}`;
        case "grow_completed":
            const yield_grams = activity.metadata?.yield_grams as number | undefined;
            return `hat Grow abgeschlossen: ${activity.target_name}${yield_grams ? ` (${yield_grams}g Ertrag)` : ""}`;
        case "badge_earned":
            return `hat Badge freigeschaltet: ${activity.target_name}`;
        case "favorite_added":
            return `hat ${activity.target_name} zu Favoriten hinzugefügt`;
        case "strain_collected":
            return `hat ${activity.target_name} gesammelt`;
        default:
            return `hat mit ${activity.target_name} interagiert`;
    }
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Gerade eben";
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export const ActivityItem = memo(function ActivityItem({ activity, user, className = "" }: ActivityItemProps) {
    const Icon = getActivityIcon(activity.activity_type);
    const activityText = getActivityText(activity);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(activity.metadata?.like_count as number || 0);
    const [liking, setLiking] = useState(false);

    const handleLike = async () => {
        if (liking) return;
        setLiking(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Toggle like - in a real implementation, this would update a likes table
            // For now we do optimistic UI
            if (!liked) {
                setLiked(true);
                setLikeCount((c) => c + 1);
            } else {
                setLiked(false);
                setLikeCount((c) => Math.max(0, c - 1));
            }
        } catch (err) {
            console.error("Like error:", err);
        } finally {
            setLiking(false);
        }
    };

    return (
        <div className={`flex gap-3 p-4 border-b border-[var(--border)] last:border-b-0 ${className}`}>
            {/* Avatar */}
            <Link href={`/user/${user.username}`} className="flex-shrink-0">
                <div className="relative w-11 h-11 rounded-full overflow-hidden bg-[var(--muted)] flex items-center justify-center ring-2 ring-[var(--border)]">
                    {user.avatar_url ? (
                        <Image
                            src={user.avatar_url}
                            alt={user.display_name ?? user.username ?? ""}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <span className="text-sm font-bold text-[var(--muted-foreground)]">
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
                        <p className="text-sm text-[var(--foreground)] break-words [overflow-wrap:anywhere]">
                            <Link href={`/user/${user.username}`} className="font-bold hover:text-[#00F5FF] transition-colors">
                                {user.display_name || user.username}
                            </Link>{" "}
                            <span className="text-[var(--muted-foreground)]">{activityText}</span>
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">
                            {formatTimeAgo(activity.created_at)}
                        </p>
                    </div>
                </div>

                {/* Optional Image Preview */}
                {activity.target_image_url && (
                    <Link href={`/strains/${activity.target_id}`} className="block mt-3">
                        <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--muted)]">
                            <Image
                                src={activity.target_image_url}
                                alt={activity.target_name ?? ""}
                                fill
                                className="object-cover"
                            />
                        </div>
                    </Link>
                )}

                {/* Like button */}
                <div className="flex items-center gap-4 mt-3">
                    <button
                        onClick={() => void handleLike()}
                        disabled={liking}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            liked
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)] hover:border-red-500/50 hover:text-red-400"
                        }`}
                    >
                        {liking ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : liked ? (
                            <Heart size={12} className="fill-current" />
                        ) : (
                            <Heart size={12} />
                        )}
                        {likeCount > 0 && <span>{likeCount}</span>}
                    </button>
                </div>
            </div>
        </div>
    );
});
