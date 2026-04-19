"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { profileKeys } from "@/hooks/useProfile";
import {
  Archive,
  BookOpenCheck,
  Bug,
  Building,
  Check,
  Crown,
  Flame,
  Gem,
  Gift,
  Heart,
  Home,
  Leaf,
  Lock,
  Moon,
  Pen,
  Shield,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Trophy,
  Users,
  Wheat,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ALL_BADGES, BadgeDefinition } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface BadgeShowcaseProps {
  isOpen: boolean;
  userBadges: Array<{ badge_id: string; badges?: Partial<BadgeDefinition> }>;
  featuredBadges: string[];
  onSelect: (badgeId: string) => void;
  onSelectionChange?: (badgeIds: string[]) => void;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<BadgeDefinition["category"], string> = {
  collection: "Sammlung",
  grow: "Grow",
  social: "Community",
  engagement: "Aktivität",
};

const ICON_MAP: Record<string, LucideIcon> = {
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
  sun: Sun,
  moon: Moon,
  building: Building,
  zap: Zap,
  "file-text": BookOpenCheck,
  home: Home,
  shield: Shield,
  gem: Gem,
  bug: Bug,
  gift: Gift,
};

function BadgeMedal({ badge, unlocked, selected }: { badge: BadgeDefinition; unlocked: boolean; selected?: boolean }) {
  const Icon = ICON_MAP[badge.icon] || Trophy;

  return (
    <div
      className={cn(
        "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border",
        unlocked
          ? "border-[#2FF801]/25 bg-[#2FF801]/10 text-[#ffd76a]"
          : "border-[var(--border)]/40 bg-[var(--muted)]/50 text-[var(--muted-foreground)]",
        selected && "border-[#2FF801] bg-[#2FF801]/15"
      )}
    >
      <Icon size={22} />
      {selected && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2FF801] text-black">
          <Check size={12} strokeWidth={4} />
        </span>
      )}
    </div>
  );
}

export function BadgeShowcase({ isOpen, userBadges, featuredBadges, onSelect, onSelectionChange, onClose }: BadgeShowcaseProps) {
  const unlockedIds = new Set(userBadges.map(ub => ub.badge_id));
  const [selected, setSelected] = useState<string[]>(featuredBadges);
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const selectedBadges = selected
    .map((id) => ALL_BADGES.find((badge) => badge.id === id))
    .filter((badge): badge is BadgeDefinition => Boolean(badge));

  const completionPercent = Math.round((unlockedIds.size / ALL_BADGES.length) * 100);

  const handleToggle = (badgeId: string) => {
    setSelected(prev => {
      if (prev.includes(badgeId)) return prev.filter(id => id !== badgeId);
      if (prev.length >= 4) return prev;
      return [...prev, badgeId];
    });
  };

  const handleSave = async () => {
    await fetch('/api/badges/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featuredBadges: selected })
    });
    
    // Invalidate profile query to show updated featured badges
    await queryClient.invalidateQueries({ queryKey: profileKeys.all });

    if (onSelectionChange) {
      onSelectionChange(selected);
    } else {
      selected.forEach(id => onSelect(id));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:px-3">
      <div className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-lg border border-[var(--border)]/70 bg-[var(--background)] shadow-2xl sm:rounded-lg">
        <div className="border-b border-[var(--border)]/60 bg-[var(--card)]/90 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#00F5FF]">
                Abzeichen
              </p>
              <h2 className="truncate text-xl font-black uppercase tracking-tight text-[var(--foreground)] font-display">
                Profil kuratieren
              </h2>
              <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[var(--muted-foreground)]">
                Wähle bis zu vier Abzeichen für dein Profil.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)]/60 bg-[var(--background)] text-[var(--muted-foreground)] transition-colors hover:border-[#00F5FF]/60 hover:text-[#00F5FF]"
              aria-label="Abzeichen schließen"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--background)]/45 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-black text-[#2FF801]">
                {unlockedIds.size} freigeschaltet
              </p>
              <p className="text-xs font-black text-[#00F5FF]">
                {selected.length} von 4 ausgewählt
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
              <div className="h-full rounded-full bg-[#2FF801]" style={{ width: `${completionPercent}%` }} />
            </div>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              von {ALL_BADGES.length} Abzeichen
            </p>
          </div>
        </div>

        <div className="space-y-5 overflow-y-auto p-4 pb-28">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--foreground)]">
                Auswahl
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Maximal 4
              </span>
            </div>

            {selectedBadges.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selectedBadges.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => handleToggle(badge.id)}
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-[#2FF801]/40 bg-[#2FF801]/10 px-3 py-2 text-left transition-colors hover:border-[#2FF801]"
                    aria-label={`${badge.name} aus Profil-Auswahl entfernen`}
                  >
                    <BadgeMedal badge={badge} unlocked selected />
                    <span className="max-w-24 truncate text-[10px] font-black uppercase tracking-tight text-[var(--foreground)]">
                      {badge.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--border)]/70 bg-[var(--card)]/40 p-3 text-center">
                <p className="text-[11px] font-bold leading-relaxed text-[var(--muted-foreground)]">
                  Tippe auf freigeschaltete Abzeichen, um dein Profil zu kuratieren.
                </p>
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--foreground)]">
                Galerie
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Grün ist bereit
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
              {ALL_BADGES.map((badge) => {
                const isUnlocked = unlockedIds.has(badge.id);
                const isSelected = selected.includes(badge.id);

                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={isUnlocked ? () => handleToggle(badge.id) : undefined}
                    disabled={!isUnlocked}
                    aria-label={`${badge.name} ${isSelected ? "aus Profil-Auswahl entfernen" : "für Profil auswählen"}`}
                    className={cn(
                      "relative w-full rounded-lg border p-3 text-left transition-all",
                      isUnlocked
                        ? "border-[var(--border)]/60 bg-[var(--card)] hover:border-[#00F5FF]/70 active:scale-[0.99]"
                        : "border-[var(--border)]/35 bg-[var(--muted)]/40 opacity-70",
                      isSelected && "border-[#2FF801] bg-[#2FF801]/10 shadow-[0_0_0_1px_rgba(47,248,1,0.35)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <BadgeMedal badge={badge} unlocked={isUnlocked} selected={isSelected} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-black uppercase leading-tight tracking-tight text-[var(--foreground)]">
                            {badge.name}
                          </p>
                          <span
                            className={cn(
                              "shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-wider",
                              isUnlocked
                                ? "border-[#2FF801]/30 bg-[#2FF801]/10 text-[#2FF801]"
                                : "border-[var(--border)]/40 bg-[var(--background)]/50 text-[var(--muted-foreground)]"
                            )}
                          >
                            {CATEGORY_LABELS[badge.category]}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-[var(--muted-foreground)]">
                          {badge.description}
                        </p>

                        {!isUnlocked && (
                          <div className="mt-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">
                            <Lock size={10} />
                            Noch offen
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-[var(--border)]/60 bg-[var(--background)]/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
          <button
            onClick={handleSave}
            className="w-full rounded-lg bg-[#2FF801] py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition-opacity hover:opacity-90"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
