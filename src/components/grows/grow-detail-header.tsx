'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, MoreHorizontal, Eye, EyeOff, Users, Clock } from 'lucide-react';
import type { Grow, Plant, PlantStatus } from '@/lib/types';

const PHASE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  germination: { emoji: '🌱', label: 'Keimung', color: 'text-green-400' },
  vegetation: { emoji: '🌿', label: 'Vegetation', color: 'text-blue-400' },
  flower: { emoji: '🌸', label: 'Blüte', color: 'text-purple-400' },
  flush: { emoji: '💛', label: 'Flush', color: 'text-yellow-400' },
  harvested: { emoji: '🍂', label: 'Ernte', color: 'text-orange-400' },
  destroyed: { emoji: '💀', label: 'Destroyed', color: 'text-red-400' },
};

const ACTIVE_STATUSES: PlantStatus[] = ['seedling', 'vegetative', 'flowering', 'flushing'];

interface Props {
  grow: Grow;
  followerCount: number;
  isFollowing: boolean;
  onFollowToggle: () => void;
  isOwner: boolean;
}

export function GrowDetailHeader({ grow, followerCount, isFollowing, onFollowToggle, isOwner }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Derive phase from most advanced active plant
  const plants: Plant[] = (grow as any).plants ?? [];
  const activePlants = plants.filter(p => ACTIVE_STATUSES.includes(p.status));
  const currentPlant = activePlants[0];
  const phase = currentPlant?.status ?? 'germination';
  const phaseInfo = PHASE_CONFIG[phase] ?? PHASE_CONFIG.germination;

  // Calculate day number
  const startDate = grow.start_date ? new Date(grow.start_date) : new Date();
  const today = new Date();
  const dayNumber = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // Status badge
  const statusLabel = grow.status === 'active' ? '● AKTIV' : grow.status === 'completed' ? '● ABGESCHLOSSEN' : '● ARCHIVIERT';
  const statusBg = grow.status === 'active' ? 'bg-[#2FF801] text-black border-none' : grow.status === 'completed' ? 'bg-[#00F5FF] text-black border-none' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-none';

  return (
    <header className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50 px-6 py-4">
      {/* Top row: back + title */}
      <div className="flex items-center gap-4 mb-3">
        <Link href="/grows">
          <Button variant="ghost" size="icon" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-full">
            <ChevronLeft size={24} />
          </Button>
        </Link>
        <div className="flex-1">
          <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em] block">Grow Details</span>
          <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
            {grow.title}
          </h1>
        </div>

        {/* Follow button — visible in header when non-owner views public grow */}
        {grow.is_public && !isOwner && (
          <Button
            onClick={onFollowToggle}
            size="sm"
            className={isFollowing ? 'bg-[var(--muted)] text-[var(--foreground)]' : 'bg-[#2FF801] text-black font-black'}
          >
            <Users size={12} className="mr-1" />
            {isFollowing ? 'Folge ich' : 'Folgen'}
            {followerCount > 0 && <span className="ml-1 opacity-70">({followerCount})</span>}
          </Button>
        )}

        {/* Overflow menu for owner */}
        {isOwner && (
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)}>
              <MoreHorizontal size={20} />
            </Button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1">
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--muted)] flex items-center gap-2"
                  >
                    Bearbeiten
                  </button>
                  {grow.status === 'completed' && (
                    <Link
                      href={`/grows/${grow.id}/harvest-report`}
                      className="block px-4 py-2 text-sm hover:bg-[var(--muted)] flex items-center gap-2"
                    >
                      Ernte-Zertifikat
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Status row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className={statusBg}>{statusLabel}</Badge>

        <div className="flex items-center gap-1 text-sm">
          <span>{phaseInfo.emoji}</span>
          <span className={phaseInfo.color}>{phaseInfo.label}</span>
          <span className="text-[var(--muted-foreground)]">· Tag {dayNumber}</span>
        </div>

        {grow.strains && (
          <Link
            href={`/strains/${(grow.strains as any).slug}`}
            className="flex items-center gap-1 text-sm text-[#2FF801] hover:underline"
          >
            {(grow.strains as any).name}
          </Link>
        )}

        <div className="flex items-center gap-1 text-[var(--muted-foreground)] ml-auto">
          {grow.is_public ? <Eye size={12} /> : <EyeOff size={12} />}
        </div>
      </div>

      {/* Harvest Certificate banner when completed */}
      {grow.status === 'completed' && (
        <Link href={`/grows/${grow.id}/harvest-report`} className="mt-3 block">
          <div className="bg-gradient-to-r from-[#2FF801]/20 to-[#00F5FF]/20 border border-[#2FF801]/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#2FF801]" />
              <span className="text-sm font-bold">Ernte-Zertifikat ansehen</span>
            </div>
            <span className="text-[#2FF801]">→</span>
          </div>
        </Link>
      )}
    </header>
  );
}
