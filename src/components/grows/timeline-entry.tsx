'use client';

import { useState } from 'react';
import { Droplets, Leaf, Activity, Camera, Sun, Flag, FileText, ChevronDown, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { GrowEntry, GrowComment } from '@/lib/types';

const ENTRY_TYPE_CONFIG: Record<string, { icon: typeof Droplets; color: string; borderColor: string; emoji: string }> = {
  watering: { icon: Droplets, color: 'text-blue-400', borderColor: 'border-l-blue-400', emoji: '💧' },
  feeding:  { icon: Leaf,    color: 'text-green-400', borderColor: 'border-l-green-400', emoji: '🌿' },
  ph_ec:    { icon: Activity, color: 'text-yellow-400', borderColor: 'border-l-yellow-400', emoji: '📊' },
  photo:    { icon: Camera,  color: 'text-pink-400', borderColor: 'border-l-pink-400', emoji: '📷' },
  dli:      { icon: Sun,     color: 'text-orange-400', borderColor: 'border-l-orange-400', emoji: '☀️' },
  milestone:{ icon: Flag,    color: 'text-[#2FF801]', borderColor: 'border-l-[#2FF801]', emoji: '🏁' },
  note:     { icon: FileText, color: 'text-yellow-300', borderColor: 'border-l-yellow-300', emoji: '📝' },
};

function formatEntrySummary(entry: GrowEntry): string {
  switch (entry.entry_type) {
    case 'watering':
      return `${(entry.content as { amount_liters?: number })?.amount_liters ?? '?'}L gegossen`;
    case 'feeding':
      return `${(entry.content as { nutrient?: string })?.nutrient ?? 'Nährstoffe'}`;
    case 'ph_ec': {
      const phEc = entry.content as { ph?: number; ec?: number };
      return `pH ${phEc?.ph ?? entry.ph_value ?? '?'} · EC ${phEc?.ec ?? '?'}`;
    }
    case 'note':
      return (entry.content as { note_text?: string })?.note_text?.slice(0, 60) ?? 'Notiz';
    case 'milestone':
      return `🏁 ${(entry.content as { milestone_phase?: string })?.milestone_phase ?? 'Meilenstein'}`;
    case 'dli':
      return '☀️ DLI berechnet';
    case 'photo':
      return '📷 Foto hinzugefügt';
    default:
      return entry.title ?? 'Eintrag';
  }
}

interface Props {
  entry: GrowEntry;
  comments: GrowComment[];
  isToday: boolean;
  dayNumber: number;
  onPhotoClick?: (url: string) => void;
  onAddComment?: (entryId: string, text: string) => void;
  onDeleteEntry?: (entryId: string) => void;
}

export function TimelineEntry({ entry, comments, isToday, dayNumber, onPhotoClick, onAddComment, onDeleteEntry }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');

  const entryType = entry.entry_type ?? 'note';
  const config = ENTRY_TYPE_CONFIG[entryType] ?? ENTRY_TYPE_CONFIG.note;

  // Build value badges
  const badges: { label: string; color: string }[] = [];
  const amount = (entry.content as { amount_liters?: number })?.amount_liters;
  if (amount !== undefined && amount !== null) {
    badges.push({ label: `💧 ${amount}L`, color: 'text-blue-400' });
  }
  const nutrient = (entry.content as { nutrient?: string })?.nutrient;
  if (nutrient) {
    badges.push({ label: `🌿 ${nutrient}`, color: 'text-green-400' });
  }
  const ec = (entry.content as { ec?: number })?.ec;
  if (ec !== undefined && ec !== null) {
    badges.push({ label: `EC ${ec}`, color: 'text-blue-400' });
  }
  if (entry.ph_value !== undefined && entry.ph_value !== null) {
    badges.push({ label: `pH ${entry.ph_value}`, color: 'text-yellow-400' });
  }
  if (entry.height_cm) {
    badges.push({ label: `📏 ${entry.height_cm}cm`, color: 'text-purple-400' });
  }
  if (entry.temperature) {
    badges.push({ label: `${entry.temperature}°C`, color: 'text-red-400' });
  }

  // Collect photos
  const photos: string[] = [];
  if (entry.image_url) photos.push(entry.image_url);
  const contentPhoto = (entry.content as { photo_url?: string })?.photo_url;
  if (contentPhoto) photos.push(contentPhoto);

  const date = new Date(entry.created_at);
  const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !onAddComment) return;
    onAddComment(entry.id, commentText.trim());
    setCommentText('');
  }

  return (
    <div className="relative">
      {/* Entry card with colored left border */}
      <div
        className={`
          ml-4 bg-[var(--card)] border border-[var(--border)]/50 rounded-xl overflow-hidden
          border-l-4 ${config.borderColor}
          transition-all duration-300 cursor-pointer
          ${expanded ? 'border-[#2FF801]/30 shadow-lg shadow-[#2FF801]/5' : ''}
        `}
        onClick={() => setExpanded(!expanded)}
      >
        {/* ── Collapsed header ── */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black">
                Tag {dayNumber}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {dateStr}{isToday ? ' · Heute' : ''}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Type emoji */}
              <span className={config.color}>{config.emoji}</span>

              {/* Compact badges when collapsed (max 2) */}
              {!expanded && badges.length > 0 && (
                <div className="flex gap-1 mr-1">
                  {badges.slice(0, 2).map((b, i) => (
                    <span key={i} className={`text-[9px] font-bold ${b.color}`}>{b.label}</span>
                  ))}
                </div>
              )}

              {/* Expand chevron */}
              <ChevronDown
                size={12}
                className={`text-[var(--muted-foreground)] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              />
              {/* Delete button — only when expanded */}
              {expanded && onDeleteEntry && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                  className="p-1 text-red-400/60 hover:text-red-400 transition-colors"
                  title="Eintrag löschen"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Summary line — only when collapsed */}
          {!expanded && (
            <p className="text-xs text-[var(--muted-foreground)] truncate pr-2">
              {formatEntrySummary(entry)}
            </p>
          )}
        </div>

        {/* ── Expanded content ── */}
        {expanded && (
          <div className="px-3 pb-3 border-t border-[var(--border)]/30 pt-2 space-y-3">
            {/* Photo grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {photos.slice(0, 3).map((url, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onPhotoClick?.(url); }}
                    className="aspect-square rounded-lg overflow-hidden bg-[var(--muted)] hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={url}
                      alt={`Foto ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </button>
                ))}
                {photos.length > 3 && (
                  <div className="aspect-square rounded-lg bg-[var(--muted)] flex items-center justify-center text-[10px] text-[var(--muted-foreground)] font-bold">
                    +{photos.length - 3}
                  </div>
                )}
              </div>
            )}

            {/* All value badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {badges.map((b, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={`text-[10px] ${b.color} border-current/30 bg-current/5`}
                  >
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Notes text */}
            {entry.notes && (
              <p className="text-xs text-[var(--muted-foreground)] italic leading-relaxed pl-3 border-l-2 border-[var(--border)]">
                {entry.notes}
              </p>
            )}

            {/* ── Inline flat comments ── */}
            <div className="pt-2 border-t border-[var(--border)]/30 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted-foreground)] flex items-center gap-1">
                💬 {comments.length} Kommentar{comments.length !== 1 ? 'e' : ''}
              </p>

              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  {/* Avatar */}
                  <div className="w-6 h-6 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {(comment.profiles as any)?.avatar_url ? (
                      <img
                        src={(comment.profiles as any).avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] font-black text-[#00F5FF]">
                        {(comment.profiles as any)?.username?.[0]?.toUpperCase() ?? (comment.profiles as any)?.display_name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>

                  {/* Comment content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold">
                        {(comment.profiles as any)?.display_name ?? (comment.profiles as any)?.username ?? 'Unbekannt'}
                      </span>
                      <span className="text-[9px] text-[var(--muted-foreground)]">
                        {new Date(comment.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--foreground)] leading-snug mt-0.5">
                      {comment.comment}
                    </p>
                  </div>
                </div>
              ))}

              {/* Add comment form */}
              {onAddComment && (
                <form onSubmit={handleCommentSubmit} className="flex gap-2 mt-1" onClick={e => e.stopPropagation()}>
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Kommentar schreiben..."
                    className="flex-1 bg-[var(--input)] border border-[var(--border)]/50 rounded-lg px-3 py-1.5 text-[11px] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#2FF801]/50"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-3 py-1.5 bg-[#2FF801] text-black text-[10px] font-black rounded-lg disabled:opacity-40 hover:bg-[#2FF801]/90 transition-colors"
                  >
                    Senden
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
