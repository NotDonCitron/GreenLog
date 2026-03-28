"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ALL_BADGES, BadgeDefinition } from "@/lib/badges";
import { BadgeCard } from "@/components/ui/badge-card";
import { cn } from "@/lib/utils";

interface BadgeShowcaseProps {
  userBadges: Array<{ badge_id: string; badges?: Partial<BadgeDefinition> }>;
  featuredBadges: string[];
  onSelect: (badgeId: string) => void;
  onClose: () => void;
}

export function BadgeShowcase({ userBadges, featuredBadges, onSelect, onClose }: BadgeShowcaseProps) {
  const unlockedIds = new Set(userBadges.map(ub => ub.badge_id));
  const [selected, setSelected] = useState<string[]>(featuredBadges);

  const handleToggle = (badgeId: string) => {
    setSelected(prev => {
      if (prev.includes(badgeId)) return prev.filter(id => id !== badgeId);
      if (prev.length >= 4) return prev;
      return [...prev, badgeId];
    });
  };

  const handleSave = () => {
    // Save via API
    fetch('/api/badges/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featuredBadges: selected })
    }).then(() => {
      selected.forEach(id => onSelect(id));
      onClose();
      window.location.reload();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-lg bg-[var(--background)] rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold uppercase tracking-tight">Deine Badges</h2>
          <button onClick={onClose} className="p-2">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Freigeschaltet: {unlockedIds.size}/{ALL_BADGES.length}
        </p>

        <p className="text-xs font-bold mb-2">Tippe auf ein Badge zum Auswählen (max 4)</p>
        <div className="flex flex-wrap gap-3 mb-6">
          {ALL_BADGES.map(badge => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              unlocked={unlockedIds.has(badge.id)}
              selected={selected.includes(badge.id)}
              onClick={unlockedIds.has(badge.id) ? () => handleToggle(badge.id) : undefined}
            />
          ))}
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-[#2FF801] text-black font-bold rounded-full"
        >
          Fertig
        </button>
      </div>
    </div>
  );
}