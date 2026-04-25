'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimelineEntry } from './timeline-entry';
import { Camera, LayoutGrid, List } from 'lucide-react';
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
      
      const photoUrls = [
        entry.image_url,
        (entry.content as any)?.signed_photo_url,
        (entry.content as any)?.photo_url
      ].filter((u): u is string => typeof u === 'string' && u.length > 0);
      
      photoUrls.forEach(url => photos.push({ url, day }));
    });
    return photos;
  }, [entries, growStartDate]);

  const filteredEntryIds = new Set(filteredEntries.map(entry => entry.id));
  const filteredComments = comments.filter(comment => comment.grow_entry_id ? filteredEntryIds.has(comment.grow_entry_id) : true);
  const days = groupByDay(filteredEntries, filteredComments, growStartDate);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-5xl"
        >🌱</motion.div>
        <p className="text-sm font-black uppercase tracking-wider text-[var(--muted-foreground)]">
          Noch keine Einträge
        </p>
      </div>
    );
  }

  const mostRecentDay = days[0]?.day_number ?? 0;

  return (
    <div className="space-y-6">
      {/* Visual Photo Highlights (Story-like) */}
      {allPhotos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Camera size={12} className="text-[#00F5FF]" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
              Foto-Highlights
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
            {allPhotos.map((photo, i) => (
              <motion.button
                key={`${photo.url}-${i}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  triggerHaptic();
                  onPhotoClick?.(photo.url);
                }}
                className="relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#2FF801]/20 bg-[var(--card)]"
              >
                <img 
                  src={resolvePublicMediaUrl(photo.url) ?? ""} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                  <span className="text-[8px] font-black text-white">TAG {photo.day}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 sticky top-0 z-20 bg-[var(--background)]/80 backdrop-blur-md py-2 -mx-2 px-2 border-b border-[var(--border)]/30">
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
      <div className="relative">
        <div
          className="absolute left-4 top-0 bottom-0 w-0.5"
          style={{
            background: 'linear-gradient(to bottom, #2FF801 0%, #2FF801 20%, rgba(47,248,1,0.3) 50%, var(--border) 100%)',
          }}
        />

        <div className="space-y-8 ml-4">
          <AnimatePresence mode="popLayout">
            {days.map((day, idx) => {
              const isToday = day.day_number === mostRecentDay;
              const isFirst = idx === 0;

              return (
                <motion.div 
                  key={`${day.day_number}-${idx}`} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative"
                >
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

                  <div className="space-y-3">
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
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
