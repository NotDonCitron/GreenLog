'use client';

import { Sprout, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhaseBadge } from './phase-badge';
import type { Plant, PlantStatus } from '@/lib/types';

const ACTIVE_STATUSES: PlantStatus[] = ['seedling', 'vegetative', 'flowering', 'flushing'];

const NEXT_STATUS: Partial<Record<PlantStatus, PlantStatus>> = {
  seedling: 'vegetative',
  vegetative: 'flowering',
  flowering: 'flushing',
  flushing: 'harvested',
};

const NEXT_LABELS: Partial<Record<PlantStatus, string>> = {
  seedling: 'Vegetative',
  vegetative: 'Blüte',
  flowering: 'Flush',
  flushing: 'Ernte',
};

const PHASE_BORDER: Record<string, string> = {
  seedling: 'border-[#2FF801]/50',
  vegetative: 'border-[#00F5FF]/50',
  flowering: 'border-[#A855F7]/50',
  flushing: 'border-[#EAB308]/50',
  harvested: 'border-[#F97316]/50',
  destroyed: 'border-red-500/50',
};

interface Props {
  plants: Plant[];
  isOwner: boolean;
  onAddPlant: () => void;
  onStatusAdvance: (plantId: string, newStatus: PlantStatus) => void;
}

export function PlantCarousel({ plants, isOwner, onAddPlant, onStatusAdvance }: Props) {
  const activePlants = plants.filter(p => ACTIVE_STATUSES.includes(p.status));
  const canAddMore = activePlants.length < 3;

  if (plants.length === 0 && !isOwner) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">Pflanzen</h2>

      <div className="flex gap-3 overflow-x-auto pb-2 scroll-snap-x mandatory">
        {plants.map((plant) => {
          const isActive = ACTIVE_STATUSES.includes(plant.status);
          const borderClass = PHASE_BORDER[plant.status] ?? 'border-[var(--border)]';

          return (
            <div
              key={plant.id}
              className={`flex-shrink-0 w-36 bg-[var(--card)] border rounded-xl p-3 scroll-snap-align-start ${borderClass} ${!isActive ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sprout size={12} className={isActive ? 'text-[#2FF801]' : 'text-[var(--muted-foreground)]'} />
                <span className="text-xs font-bold truncate">{plant.plant_name}</span>
              </div>

              <PhaseBadge status={plant.status} />

              {plant.planted_at && (
                <p className="text-[9px] text-[var(--muted-foreground)] mt-2">
                  Gepflanzt: {new Date(plant.planted_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                </p>
              )}

              {isOwner && isActive && (() => {
                const next = NEXT_STATUS[plant.status];
                return next ? (
                  <Button
                    onClick={() => onStatusAdvance(plant.id, next)}
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 text-[9px] border-[var(--border)]/50"
                  >
                    Weiter → {NEXT_LABELS[next]}
                  </Button>
                ) : null;
              })()}
            </div>
          );
        })}

        {/* Add plant card */}
        {isOwner && canAddMore && (
          <button
            onClick={onAddPlant}
            className="flex-shrink-0 w-36 bg-[var(--card)] border border-dashed border-[var(--border)] rounded-xl p-3 flex flex-col items-center justify-center gap-2 hover:border-[#2FF801]/50 transition-all scroll-snap-align-start"
          >
            <Plus size={20} className="text-[var(--muted-foreground)]" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Pflanze</span>
          </button>
        )}
      </div>
    </div>
  );
}
