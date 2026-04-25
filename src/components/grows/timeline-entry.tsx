'use client';

import { useState } from 'react';
import { Droplets, Leaf, Activity, Camera, Sun, Flag, FileText, ChevronDown, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { GrowEntry, GrowComment } from '@/lib/types';
import { resolvePublicMediaUrl } from '@/lib/public-media-url';
import { triggerHaptic } from '@/lib/haptics';

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
  affectedPlantNames?: string[];
  onPhotoClick?: (url: string) => void;
  onAddComment?: (entryId: string, text: string) => void;
  onDeleteEntry?: (entryId: string) => void;
}

export function TimelineEntry({ entry, comments, isToday, dayNumber, affectedPlantNames = [], onPhotoClick, onAddComment, onDeleteEntry }: Props) {
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

  // Robust content parsing
  const content = typeof entry.content === 'string' ? JSON.parse(entry.content) : entry.content;

  // CRITICAL: Prefer signed URLs for private grow photos
  const photos: string[] = [
    content?.signed_photo_url,
    content?.photo_url,
    content?.photo_path,
    entry.image_url
  ].filter((u): u is string => typeof u === 'string' && u.length > 0);

  const date = new Date(entry.created_at);
  const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !onAddComment) return;
    onAddComment(entry.id, commentText.trim());
    setCommentText('');
  }

  return (
    <div className="relative opacity-100 visible">
      <div
        className={`
          ml-4 bg-[var(--card)] border border-[var(--border)]/50 rounded-xl overflow-hidden
          border-l-4 ${config.borderColor}
          transition-all duration-300 cursor-pointer active:scale-[0.98]
          ${expanded ? 'border-[#2FF801]/30 shadow-lg shadow-[#2FF801]/10' : ''}
        `}
        onClick={() => {
          triggerHaptic();
          setExpanded(!expanded);
        }}
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
              <span className={config.color}>{config.emoji}</span>

              {!expanded && badges.length > 0 && (
                <div className="flex gap-1 mr-1">
                  {badges.slice(0, 2).map((b, i) => (
                    <span key={i} className={`text-[9px] font-bold ${b.color}`}>{b.label}</span>
                  ))}
                </div>
              )}

              <ChevronDown
                size={12}
                className={`text-[var(--muted-foreground)] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              />
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

          {!expanded && (
            <p className="text-xs text-[var(--muted-foreground)] truncate pr-2 font-medium">
              {formatEntrySummary(entry)}
            </p>
          )}

          {affectedPlantNames.length > 0 && (
            <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-lg border border-[#2FF801]/25 bg-[#2FF801]/10 px-2 py-1 text-[10px] font-bold text-[#2FF801]">
              <Leaf size={10} />
              <span className="truncate">{affectedPlantNames.join(', ')}</span>
            </div>
          )}
        </div>

        {/* ── Expanded content ── */}
        {expanded && (
          <div className="px-3 pb-3 border-t border-[var(--border)]/30 pt-3 space-y-4">
            {/* Photo grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2 animate-in zoom-in duration-300">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      triggerHaptic();
                      onPhotoClick?.(url); 
                    }}
                    className="aspect-video rounded-xl overflow-hidden bg-[var(--muted)] border border-[var(--border)] hover:opacity-80 transition-opacity shadow-sm"
                  >
                    <img
                      src={resolvePublicMediaUrl(url) ?? ""}
                      alt={`Foto ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* All value badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {badges.map((b, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={`text-[10px] py-1 px-2 font-black ${b.color} border-current/20 bg-current/5 rounded-lg`}
                  >
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Notes text */}
            {entry.notes && (
              <div className="bg-[var(--muted)]/30 p-3 rounded-xl border-l-2 border-[#2FF801]/40">
                <p className="text-xs text-[var(--foreground)] leading-relaxed">
                  {entry.notes}
                </p>
              </div>
            )}

            {/* ── Inline flat comments ── */}
            <div className="pt-3 border-t border-[var(--border)]/30 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00F5FF]" />
                  {comments.length} Kommentar{comments.length !== 1 ? 'e' : ''}
                </p>
              </div>

              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00F5FF]/20 to-[#2FF801]/20 flex items-center justify-center flex-shrink-0 overflow-hidden border border-[var(--border)]">
                    {(comment.profiles as any)?.avatar_url ? (
                      <img
                        src={resolvePublicMediaUrl((comment.profiles as any).avatar_url) ?? ""}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-black text-[#00F5FF]">
                        {(comment.profiles as any)?.username?.[0]?.toUpperCase() ?? (comment.profiles as any)?.display_name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-black text-[var(--foreground)]">
                        {(comment.profiles as any)?.display_name ?? (comment.profiles as any)?.username ?? 'Unbekannt'}
                      </span>
                      <span className="text-[9px] text-[var(--muted-foreground)] font-bold">
                        {new Date(comment.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit', month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
                      {comment.comment}
                    </p>
                  </div>
                </div>
              ))}

              {/* Add comment form */}
              {onAddComment && (
                <form onSubmit={handleCommentSubmit} className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Kommentar schreiben..."
                    className="flex-1 bg-[var(--input)] border border-[var(--border)]/50 rounded-xl px-4 py-2 text-[11px] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#2FF801]/50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-4 py-2 bg-[#2FF801] text-black text-[11px] font-black rounded-xl disabled:opacity-40 hover:bg-[#2FF801]/90 transition-all active:scale-95 shadow-lg shadow-[#2FF801]/20"
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
