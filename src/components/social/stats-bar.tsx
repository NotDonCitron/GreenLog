"use client";

import { Users, Leaf, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatItem {
  value: number;
  label: string;
}

interface StatsBarProps {
  stats: StatItem[];
  highlightIndex?: number;
  className?: string;
}

const ICONS: LucideIcon[] = [Users, Leaf, Sprout];

export function StatsBar({ stats, highlightIndex, className = "" }: StatsBarProps) {
  return (
    <div
      className={`flex items-center justify-around bg-[#FAFAFA] rounded-2xl py-4 px-6 ${className}`}
    >
      {stats.map((stat, index) => {
        const Icon = ICONS[index] || Leaf;
        const isHighlighted = index === highlightIndex;

        return (
          <div key={stat.label} className="flex flex-col items-center gap-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isHighlighted ? "bg-[#2FF801]/10" : "bg-[#F5F5F5]"
              }`}
            >
              <Icon
                size={18}
                className={isHighlighted ? "text-[#2FF801]" : "text-[#666]"}
              />
            </div>
            <p
              className={`font-black text-lg ${isHighlighted ? "text-[#2FF801]" : "text-[#1A1A1A]"}`}
            >
              {stat.value}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#999]">
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}