'use client';

import { Clock } from 'lucide-react';
import { TimelineEntry } from './timeline-entry';
import type { GrowEntry, GrowComment } from '@/lib/types';

interface DayGroup {
  day_number: number;
  date: string;
  entries: GrowEntry[];
  comments: GrowComment[];
}

// Group entries by day_number — chronological (most recent first)
function groupByDay(entries: GrowEntry[], comments: GrowComment[]): DayGroup[] {
  const dayMap: Record<number, DayGroup> = {};

  for (const entry of entries) {
    const day = entry.day_number ?? 0;
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
  onPhotoClick?: (url: string) => void;
  onAddComment?: (entryId: string, text: string) => void;
}

export function TimelineSection({ entries, comments, onPhotoClick, onAddComment }: Props) {
  const days = groupByDay(entries, comments);

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
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-[#2FF801]/40" />
        <h2 className="text-xs font-black uppercase tracking-widest text-[var(--muted-foreground)]">
          Zeitstrahl
        </h2>
      </div>

      {/* Timeline container with vertical line */}
      <div className="relative">
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
                    onPhotoClick={onPhotoClick}
                    onAddComment={onAddComment}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
