'use client';

import { useMemo, useState } from 'react';
import { TimelineEntry } from './timeline-entry';
import type { GrowEntry, GrowComment, GrowEntryType, Plant } from '@/lib/types';

interface DayGroup {
  day_number: number;
  date: string;
  entries: GrowEntry[];
  comments: GrowComment[];
}

function dateOnlyToUtcTimestamp(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function calculateGrowDayNumber(startDate: string | undefined, entryDate: string | undefined): number | null {
  if (!startDate || !entryDate) return null;

  const startTime = dateOnlyToUtcTimestamp(startDate);
  const entryTime = dateOnlyToUtcTimestamp(entryDate);

  if (Number.isNaN(startTime) || Number.isNaN(entryTime)) return null;

  const diffDays = Math.floor((entryTime - startTime) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

// Group entries by day_number — chronological (most recent first)
function groupByDay(entries: GrowEntry[], comments: GrowComment[], growStartDate?: string): DayGroup[] {
  const dayMap: Record<number, DayGroup> = {};

  for (const entry of entries) {
    const entryDate = entry.entry_date ?? entry.created_at?.split('T')[0];
    const day = entry.day_number ?? calculateGrowDayNumber(growStartDate, entryDate) ?? 0;
    if (!dayMap[day]) {
      dayMap[day] = {
        day_number: day,
        date: entry.created_at,
        entries: [],
        comments: [],
      };
    }
    dayMap[day].entries.push(entry);
  }

  // Attach comments to entries via grow_entry_id
  for (const comment of comments) {
    const entryId = comment.grow_entry_id;
    const targetDay = Object.values(dayMap).find(d =>
      d.entries.some(e => e.id === entryId)
    );
    if (targetDay) {
      const alreadyAttached = targetDay.comments.some(c => c.id === comment.id);
      if (!alreadyAttached) {
        targetDay.comments.push(comment);
      }
    }
  }

  // Sort days descending (newest first)
  return Object.values(dayMap).sort((a, b) => b.day_number - a.day_number);
}

interface Props {
  entries: GrowEntry[];
  comments: GrowComment[];
  plants?: Plant[];
  growStartDate?: string;
  onPhotoClick?: (url: string) => void;
  onAddComment?: (entryId: string, text: string) => void;
  onDeleteEntry?: (entryId: string) => void;
}

function getAffectedPlantIds(entry: GrowEntry): string[] {
  const affectedPlantIds = (entry.content as { affected_plant_ids?: unknown })?.affected_plant_ids;
  if (Array.isArray(affectedPlantIds)) {
    return affectedPlantIds.filter((id): id is string => typeof id === 'string');
  }
  return entry.plant_id ? [entry.plant_id] : [];
}

const TYPE_FILTERS: { value: 'all' | GrowEntryType; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'watering', label: 'Gießen' },
  { value: 'feeding', label: 'Füttern' },
  { value: 'photo', label: 'Fotos' },
  { value: 'note', label: 'Notizen' },
  { value: 'ph_ec', label: 'pH/EC' },
];

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase transition-colors ${
        active
          ? 'border-[#2FF801]/60 bg-[#2FF801]/15 text-[#2FF801]'
          : 'border-[var(--border)]/50 bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[#2FF801]/35 hover:text-[var(--foreground)]'
      }`}
    >
      {label}
    </button>
  );
}

export function TimelineSection({ entries, comments, plants = [], growStartDate, onPhotoClick, onAddComment, onDeleteEntry }: Props) {
  const [selectedType, setSelectedType] = useState<'all' | GrowEntryType>('all');
  const [selectedPlantId, setSelectedPlantId] = useState<string>('all');
  const plantNameById = new Map(plants.map(plant => [plant.id, plant.plant_name]));
  const filteredEntries = useMemo(() => entries.filter(entry => {
    const matchesType = selectedType === 'all' || entry.entry_type === selectedType;
    const matchesPlant = selectedPlantId === 'all' || getAffectedPlantIds(entry).includes(selectedPlantId);
    return matchesType && matchesPlant;
  }), [entries, selectedPlantId, selectedType]);
  const filteredEntryIds = new Set(filteredEntries.map(entry => entry.id));
  const filteredComments = comments.filter(comment => comment.grow_entry_id ? filteredEntryIds.has(comment.grow_entry_id) : true);
  const days = groupByDay(filteredEntries, filteredComments, growStartDate);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="text-5xl">🌱</div>
        <p className="text-sm font-black uppercase tracking-wider text-[var(--muted-foreground)]">
          Noch keine Einträge
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Füge deinen ersten Log-Eintrag hinzu
        </p>
      </div>
    );
  }

  // The most recent day number (first in the sorted list)
  const mostRecentDay = days[0]?.day_number ?? 0;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#2FF801]/40" />
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--muted-foreground)]">
            Zeitstrahl
          </h2>
          <span className="ml-auto text-[10px] font-bold text-[var(--muted-foreground)]">
            {filteredEntries.length} Eintrag{filteredEntries.length === 1 ? '' : 'e'}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TYPE_FILTERS.map(filter => (
            <FilterChip
              key={filter.value}
              active={selectedType === filter.value}
              label={filter.label}
              onClick={() => setSelectedType(filter.value)}
            />
          ))}
        </div>

        {plants.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterChip
              active={selectedPlantId === 'all'}
              label="Alle Pflanzen"
              onClick={() => setSelectedPlantId('all')}
            />
            {plants.map(plant => (
              <FilterChip
                key={plant.id}
                active={selectedPlantId === plant.id}
                label={plant.plant_name}
                onClick={() => setSelectedPlantId(plant.id)}
              />
            ))}
          </div>
        )}
      </div>

      {filteredEntries.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)]/70 bg-[var(--card)]/40 p-6 text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">
            Keine Einträge für diesen Filter
          </p>
        </div>
      )}

      {/* Timeline container with vertical line */}
      {filteredEntries.length > 0 && <div className="relative">
        {/* Vertical gradient line */}
        <div
          className="absolute left-4 top-0 bottom-0 w-0.5"
          style={{
            background: 'linear-gradient(to bottom, #2FF801 0%, #2FF801 20%, rgba(47,248,1,0.3) 50%, var(--border) 100%)',
          }}
        />

        {/* Day groups */}
        <div className="space-y-4 ml-4">
          {days.map((day, idx) => {
            const isToday = day.day_number === mostRecentDay;
            const isFirst = idx === 0;

            return (
              <div key={`${day.day_number}-${idx}`} className="relative">
                {/* Day marker circle */}
                <div
                  className={`
                    absolute -left-[18px] top-3 w-6 h-6 rounded-full flex items-center justify-center z-10
                    ${isToday
                      ? 'bg-[#2FF801] text-black shadow-lg shadow-[#2FF801]/30'
                      : isFirst
                      ? 'bg-[#355E3B] text-white'
                      : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'
                    }
                  `}
                >
                  {isFirst ? (
                    <span className="text-[10px]">🌱</span>
                  ) : (
                    <span className="text-[9px] font-black">{day.day_number}</span>
                  )}
                </div>

                {/* All entries for this day */}
                {day.entries.map((entry) => (
                  <TimelineEntry
                    key={entry.id}
                    entry={entry}
                    comments={day.comments.filter(c => c.grow_entry_id === entry.id)}
                    isToday={isToday}
                    dayNumber={day.day_number}
                    affectedPlantNames={getAffectedPlantIds(entry).map(id => plantNameById.get(id)).filter((name): name is string => Boolean(name))}
                    onPhotoClick={onPhotoClick}
                    onAddComment={onAddComment}
                    onDeleteEntry={onDeleteEntry}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>}
    </div>
  );
}
