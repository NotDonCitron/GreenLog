'use client';

import { Sprout, Plus } from 'lucide-react';
import { PhaseBadge } from './phase-badge';
import type { Plant, PlantStatus } from '@/lib/types';

const ACTIVE_STATUSES: PlantStatus[] = ['seedling', 'vegetative', 'flowering', 'flushing'];

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
}

export function PlantCarousel({ plants, isOwner, onAddPlant }: Props) {
  const activePlants = plants.filter(p => ACTIVE_STATUSES.includes(p.status));
  const isPlantLimitReached = activePlants.length >= 3;

  if (plants.length === 0 && !isOwner) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">Pflanzen</h2>
        {isOwner && (
          <span className={`text-[10px] font-semibold ${isPlantLimitReached ? 'text-red-400' : 'text-[var(--muted-foreground)]'}`}>
            Aktiv {activePlants.length}/3 (KCanG § 9)
          </span>
        )}
      </div>

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

            </div>
          );
        })}

        {/* Add plant card */}
        {isOwner && (
          <button
            onClick={onAddPlant}
            className={`flex-shrink-0 w-36 bg-[var(--card)] border border-dashed rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all scroll-snap-align-start ${
              isPlantLimitReached
                ? 'border-red-500/40'
                : 'border-[var(--border)] hover:border-[#2FF801]/50'
            }`}
            aria-label={isPlantLimitReached ? 'KCanG Limit erreicht: maximal 3 aktive Pflanzen' : 'Pflanze hinzufügen'}
          >
            <Plus size={20} className={isPlantLimitReached ? 'text-red-400' : 'text-[var(--muted-foreground)]'} />
            <span className={`text-[9px] font-bold uppercase tracking-wider ${isPlantLimitReached ? 'text-red-400' : 'text-[var(--muted-foreground)]'}`}>
              {isPlantLimitReached ? '3/3 erreicht' : 'Pflanze'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
