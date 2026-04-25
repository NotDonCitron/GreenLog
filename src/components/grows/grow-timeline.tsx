'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Droplets, Leaf, Camera, Sun, Activity, Droplet, Thermometer, Clock } from 'lucide-react';
import type { GrowEntry } from '@/lib/types';
import { resolvePublicMediaUrl } from '@/lib/public-media-url';

interface TimelineEntry {
  day_number: number;
  date: string;
  entries: GrowEntry[];
  photos: string[];
  hasWater: boolean;
  hasFeed: boolean;
  hasPhEc: boolean;
  hasHeight: boolean;
}

// Group entries into a visual timeline
function buildTimeline(entries: GrowEntry[]): TimelineEntry[] {
  const dayMap: Record<number, TimelineEntry> = {};

  for (const entry of entries) {
    const day = entry.day_number || 0;
    const date = entry.created_at;

    if (!dayMap[day]) {
      dayMap[day] = {
        day_number: day,
        date,
        entries: [],
        photos: [],
        hasWater: false,
        hasFeed: false,
        hasPhEc: false,
        hasHeight: false
      };
    }

    dayMap[day].entries.push(entry);

    // Check entry type/content for icons
    if (entry.entry_type === 'watering' || entry.content?.amount_liters) {
      dayMap[day].hasWater = true;
    }
    if (entry.entry_type === 'feeding' || entry.content?.nutrient) {
      dayMap[day].hasFeed = true;
    }
    if (entry.entry_type === 'ph_ec' || (entry.ph_value !== undefined)) {
      dayMap[day].hasPhEc = true;
    }
    if (entry.height_cm) {
      dayMap[day].hasHeight = true;
    }
    if (entry.image_url || entry.content?.photo_url) {
      dayMap[day].photos.push(entry.image_url || (entry.content?.photo_url as string));
    }
  }

  return Object.values(dayMap).sort((a, b) => a.day_number - b.day_number);
}

interface GrowTimelineProps {
  entries: GrowEntry[];
  onPhotoClick?: (url: string) => void;
}

export function GrowTimeline({ entries, onPhotoClick }: GrowTimelineProps) {
  const timeline = buildTimeline(entries);
  
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--muted-foreground)]">
        <Clock size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-xs">Keine Einträge für die Timeline</p>
        <p className="text-[10px]">Füge Log-Einträge hinzu</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical Line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#2FF801] via-[#2FF801]/50 to-[var(--border)]" />

      {/* Timeline Entries */}
      <div className="space-y-4 ml-4">
        {timeline.map((day, idx) => {
          const isToday = idx === timeline.length - 1;
          const isFirst = idx === 0;

          return (
            <div key={`${day.day_number}-${idx}`} className="relative">
              {/* Day Marker */}
              <div className={`absolute -left-[18px] w-6 h-6 rounded-full flex items-center justify-center ${
                isToday
                  ? 'bg-[#2FF801] text-black'
                  : isFirst
                  ? 'bg-[#355E3B] text-white'
                  : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'
              }`}>
                {isFirst ? (
                  <Leaf size={12} />
                ) : (
                  <span className="text-[10px] font-bold">{day.day_number}</span>
                )}
              </div>

              {/* Day Content */}
              <Card className={`ml-4 p-3 bg-[var(--card)] border-[var(--border)]/50 ${
                isToday ? 'border-[#2FF801]/30' : ''
              }`}>
                {/* Day Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      Tag {day.day_number}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {new Date(day.date).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </span>
                  </div>
                  {isToday && (
                    <Badge className="bg-[#2FF801]/20 text-[#2FF801] border-[#2FF801]/30 text-[10px]">
                      Heute
                    </Badge>
                  )}
                </div>

                {/* Activity Icons */}
                <div className="flex items-center gap-3 mb-2">
                  {day.hasWater && (
                    <div className="flex items-center gap-1 text-blue-400" title="Gegossen">
                      <Droplets size={12} />
                      <span className="text-[10px]">💧</span>
                    </div>
                  )}
                  {day.hasFeed && (
                    <div className="flex items-center gap-1 text-green-400" title="Gedüngt">
                      <Leaf size={12} />
                      <span className="text-[10px]">🌿</span>
                    </div>
                  )}
                  {day.hasPhEc && (
                    <div className="flex items-center gap-1 text-yellow-400" title="pH/EC">
                      <Activity size={12} />
                      <span className="text-[10px]">📊</span>
                    </div>
                  )}
                  {day.hasHeight && (
                    <div className="flex items-center gap-1 text-purple-400" title="Höhe">
                      <span className="text-[10px]">📏</span>
                    </div>
                  )}
                  {day.photos.length > 0 && (
                    <div className="flex items-center gap-1 text-pink-400" title="Foto">
                      <Camera size={12} />
                      <span className="text-[10px]">📷 {day.photos.length}</span>
                    </div>
                  )}
                </div>

                {/* Photos Grid */}
                {day.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {day.photos.slice(0, 3).map((url, i) => (
                      <button
                        key={i}
                        onClick={() => onPhotoClick?.(url)}
                        className="aspect-square rounded-lg overflow-hidden bg-[var(--muted)] hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={resolvePublicMediaUrl(url) ?? ""}
                          alt={`Tag ${day.day_number}`}
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </button>
                    ))}
                    {day.photos.length > 3 && (
                      <div className="aspect-square rounded-lg bg-[var(--muted)] flex items-center justify-center text-[10px] text-[var(--muted-foreground)]">
                        +{day.photos.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Entry Summary */}
                <div className="text-[10px] text-[var(--muted-foreground)] space-y-0.5">
                  {day.entries.map(entry => {
                    let summary = '';
                    switch (entry.entry_type) {
                      case 'watering':
                        summary = `💧 ${(entry.content as { amount_liters?: number })?.amount_liters || '?'}L`;
                        break;
                      case 'feeding':
                        summary = `🌿 ${(entry.content as { nutrient?: string })?.nutrient || 'Nährstoffe'}`;
                        break;
                      case 'ph_ec':
                        const phEc = entry.content as { ph?: number; ec?: number };
                        summary = `📊 pH ${phEc?.ph || entry.ph_value || '?'} | EC ${phEc?.ec || '?'}`;
                        break;
                      case 'note':
                        summary = `📝 ${(entry.content as { note_text?: string })?.note_text?.slice(0, 50) || 'Notiz'}`;
                        break;
                      case 'milestone':
                        summary = `🏁 ${(entry.content as { milestone_phase?: string })?.milestone_phase || 'Meilenstein'}`;
                        break;
                      case 'dli':
                        summary = `☀️ DLI`;
                        break;
                      default:
                        summary = entry.title || 'Eintrag';
                    }
                    return <p key={entry.id} className="truncate">{summary}</p>;
                  })}
                </div>

                {/* Data Values */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {day.entries.some(e => e.ph_value !== undefined && e.ph_value !== null) && (
                    <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400">
                      <Droplet size={8} className="mr-1" />
                      pH {day.entries.find(e => e.ph_value !== undefined)?.ph_value}
                    </Badge>
                  )}
                  {day.entries.some(e => (e.content as { ec?: number })?.ec !== undefined) && (
                    <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                      EC {(day.entries.find(e => (e.content as { ec?: number })?.ec !== undefined)?.content as { ec?: number })?.ec}
                    </Badge>
                  )}
                  {day.entries.some(e => e.height_cm) && (
                    <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
                      📏 {day.entries.find(e => e.height_cm)?.height_cm} cm
                    </Badge>
                  )}
                  {day.entries.some(e => e.temperature) && (
                    <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
                      <Thermometer size={8} className="mr-1" />
                      {day.entries.find(e => e.temperature)?.temperature}°C
                    </Badge>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
