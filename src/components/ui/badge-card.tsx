"use client";

import { cn } from "@/lib/utils";
import { Trophy, Leaf, Archive, Crown, Sprout, Wheat, Star, Users, Pen, Heart, Flame, Sparkles } from "lucide-react";
import { BadgeDefinition } from "@/lib/badges";

const ICON_MAP: Record<string, React.ElementType> = {
  trophy: Trophy,
  leaf: Leaf,
  archive: Archive,
  crown: Crown,
  sprout: Sprout,
  wheat: Wheat,
  star: Star,
  users: Users,
  pen: Pen,
  heart: Heart,
  flame: Flame,
  sparkles: Sparkles,
};

interface BadgeCardProps {
  badge: BadgeDefinition;
  unlocked: boolean;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function BadgeCard({ badge, unlocked, selected, onClick, compact }: BadgeCardProps) {
  const Icon = ICON_MAP[badge.icon] || Trophy;

  return (
    <button
      onClick={onClick}
      disabled={!unlocked || !onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-2xl p-2.5 border transition-all",
        compact ? "min-w-[60px] w-[60px]" : "min-w-[70px] w-[70px]",
        unlocked
          ? selected
            ? "bg-[#2FF801]/10 border-[#2FF801] cursor-pointer"
            : "bg-[var(--card)] border-[var(--border)]/50 cursor-pointer hover:border-[var(--border)]"
          : "bg-[var(--muted)]/50 border-[var(--muted)]/50 cursor-not-allowed opacity-60",
        onClick && unlocked && "active:scale-95"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          unlocked ? "bg-[#2FF801]/10 text-[#ffd700]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
        )}
      >
        {unlocked ? <Icon size={24} /> : <Sparkles size={24} />}
      </div>
      {!compact && (
        <p className="text-[8px] font-black uppercase tracking-tighter text-[var(--foreground)] truncate w-full text-center leading-tight">
          {unlocked ? badge.name : '???'}
        </p>
      )}
      {selected && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#2FF801] flex items-center justify-center">
          <span className="text-[8px] text-black font-bold">✓</span>
        </div>
      )}
    </button>
  );
}
