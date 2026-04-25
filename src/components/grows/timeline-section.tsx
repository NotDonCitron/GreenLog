'use client';

import { useMemo, useState, useEffect } from 'react';
import { TimelineEntry } from './timeline-entry';
import { Camera, Info } from 'lucide-react';
import type { GrowEntry, GrowComment, GrowEntryType, Plant } from '@/lib/types';
import { resolvePublicMediaUrl } from '@/lib/public-media-url';
import { triggerHaptic } from '@/lib/haptics';

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
      onClick={() => {
        triggerHaptic();
        onClick();
      }}
      className={`shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase transition-all active:scale-95 ${
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

  const allPhotos = useMemo(() => {
    const photos: { url: string; day: number }[] = [];
    entries.forEach(entry => {
      const entryDate = entry.entry_date ?? entry.created_at?.split('T')[0];
      const day = entry.day_number ?? calculateGrowDayNumber(growStartDate, entryDate) ?? 0;
      
      const content = typeof entry.content === 'string' ? JSON.parse(entry.content) : entry.content;
      
      const photoUrls = [
        content?.signed_photo_url,
        content?.photo_url,
        content?.photo_path,
        entry.image_url
      ].filter((u): u is string => typeof u === 'string' && u.length > 0);
      
      if (photoUrls.length > 0) {
        photos.push({ url: photoUrls[0], day });
      }
    });
    return photos;
  }, [entries, growStartDate]);

  const filteredEntryIds = new Set(filteredEntries.map(entry => entry.id));
  const filteredComments = comments.filter(comment => comment.grow_entry_id ? filteredEntryIds.has(comment.grow_entry_id) : true);
  const days = groupByDay(filteredEntries, filteredComments, growStartDate);

  useEffect(() => {
    console.log("[Timeline] Collected Photos:", allPhotos.length, allPhotos);
  }, [allPhotos]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 space-y-3 bg-[var(--card)]/20 rounded-3xl border border-dashed border-[var(--border)]/50">
        <div className="text-5xl animate-pulse">🌱</div>
        <p className="text-sm font-black uppercase tracking-wider text-[var(--muted-foreground)]">
          Noch keine Einträge
        </p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 pb-20 opacity-100 visible">
      {/* Visual Photo Highlights (Story-like) */}
      {allPhotos.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top duration-700">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Camera size={14} className="text-[#00F5FF]" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
                Foto-Highlights
              </h3>
            </div>
            <span className="text-[9px] font-bold text-[var(--muted-foreground)]/50">{allPhotos.length} Fotos</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
            {allPhotos.map((photo, i) => (
              <button
                key={`${photo.url}-${i}`}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onPhotoClick?.(photo.url);
                }}
                className="relative shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#2FF801]/20 bg-[var(--card)] shadow-lg shadow-black/20 transition-transform active:scale-95"
              >
                <img 
                  src={resolvePublicMediaUrl(photo.url) ?? ""} 
                  alt="" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                  <span className="text-[8px] font-black text-white uppercase italic">Tag {photo.day}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 bg-[var(--card)]/40 p-4 rounded-2xl border border-[var(--border)]/30 relative z-30">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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

      {/* Timeline entries */}
      <div className="relative pt-2">
        <div
          className="absolute left-4 top-0 bottom-0 w-0.5 rounded-full bg-[#2FF801]/20"
        />

        {filteredEntries.length === 0 ? (
          <div className="ml-10 py-10 text-center bg-[var(--card)]/30 rounded-2xl border border-[var(--border)]/50">
            <Info size={24} className="mx-auto mb-2 text-[var(--muted-foreground)] opacity-30" />
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest">Keine Einträge für Filter</p>
          </div>
        ) : (
          <div className="space-y-10 ml-4 relative z-10">
            {days.map((day, idx) => {
              const isToday = day.date?.split('T')[0] === todayStr;
              const isFirst = idx === 0;

              return (
                <div 
                  key={`${day.day_number}-${idx}`} 
                  className="relative"
                >
                  <div
                    className={`
                      absolute -left-[18px] top-3 w-6 h-6 rounded-full flex items-center justify-center z-10
                      border shadow-lg transition-all
                      ${isToday
                        ? 'bg-[#2FF801] text-black border-[#2FF801] shadow-[#2FF801]/30 scale-110'
                        : isFirst
                        ? 'bg-[#355E3B] text-white border-[#2FF801]/30'
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

                  <div className="space-y-4 pt-1">
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
