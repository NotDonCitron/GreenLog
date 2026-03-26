"use client";

import Image from "next/image";
import Link from "next/link";
import { Leaf, Sprout, Star } from "lucide-react";
import type { UserActivity } from "@/lib/types";

interface ActivityCardProps {
  activity: UserActivity;
  showCommunityContext?: boolean;
  communityName?: string;
  className?: string;
}

const ACTIVITY_CONFIG = {
  rating: { icon: Star, label: "Rating", color: "#2FF801" },
  grow_started: { icon: Sprout, label: "Grow gestartet", color: "#00F5FF" },
  grow_completed: { icon: Sprout, label: "Grow abgeschlossen", color: "#2FF801" },
  badge_earned: { icon: Star, label: "Badge erhalten", color: "#FFD700" },
  favorite_added: { icon: Leaf, label: "Favorit", color: "#2FF801" },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "jetzt";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

export function ActivityCard({
  activity,
  showCommunityContext = false,
  communityName,
  className = "",
}: ActivityCardProps) {
  const config = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.rating;

  return (
    <div className={`bg-[#FAFAFA] rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center overflow-hidden">
          {activity.user?.avatar_url ? (
            <Image
              src={activity.user.avatar_url}
              alt={activity.user.display_name || "User"}
              width={32}
              height={32}
              className="object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-[#999]">
              {activity.user?.username?.[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1A1A1A] truncate">
              {activity.user?.display_name || activity.user?.username}
            </span>
            <span className="text-xs text-[#999]">·</span>
            <span className="text-xs text-[#999]">
              {formatRelativeTime(activity.created_at)}
            </span>
          </div>
        </div>
        {/* Activity Badge */}
        <span
          className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
          style={{
            backgroundColor: `${config.color}15`,
            color: config.color,
          }}
        >
          {config.label}
        </span>
      </div>

      {/* Content */}
      <div className="pl-11">
        <p className="text-sm font-medium text-[#666] mb-2">
          {activity.target_name}
        </p>

        {/* Activity-specific content */}
        {activity.activity_type === "rating" && (activity.metadata as { overall_rating?: number })?.overall_rating !== undefined && (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                className={
                  (activity.metadata as { overall_rating?: number }).overall_rating! >= star
                    ? "text-[#2FF801] fill-[#2FF801]"
                    : "text-[#E5E5E5]"
                }
              />
            ))}
          </div>
        )}

        {activity.activity_type === "grow_started" && (activity.metadata as { grow_type?: string })?.grow_type && (
          <p className="text-xs text-[#999]">
            Typ: {(activity.metadata as { grow_type?: string }).grow_type}
          </p>
        )}
      </div>
    </div>
  );
}