"use client";

import Link from "next/link";
import { Leaf } from "lucide-react";
import { OrgActivityItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/dates";

interface ActivityItemProps {
  item: OrgActivityItem;
}

export function ActivityItem({ item }: ActivityItemProps) {
  const isCreated = item.type === "strain_created";

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/20 flex items-center justify-center shrink-0 mt-0.5">
        <Leaf size={14} className="text-[#2FF801]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/80 leading-snug">
          <span className="font-semibold text-white">{item.user.displayName || item.user.username}</span>
          {" hat "}
          <Link
            href={`/strains/${item.strain.slug}`}
            className="text-[#2FF801] hover:underline font-medium"
          >
            {item.strain.name}
          </Link>
          {isCreated ? " erstellt" : " bewertet"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {!isCreated && item.rating && (
            <span className="text-xs text-white/60">
              {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
            </span>
          )}
          {isCreated && (
            <span className="text-[10px] text-[#2FF801] font-medium">+Neue Sorte</span>
          )}
          <span className="text-[10px] text-white/40">
            • {formatRelativeTime(item.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
