'use client';

import { useState } from 'react';
import { Bell, CheckCircle2, Droplets, Leaf, Sprout, AlertTriangle, Clock, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

const TYPE_CONFIG: Record<string, { icon: typeof Droplets; color: string }> = {
  water:       { icon: Droplets,    color: 'text-blue-400' },
  nutrient:    { icon: Leaf,        color: 'text-green-400' },
  repot:       { icon: Sprout,     color: 'text-orange-400' },
  ph_check:    { icon: AlertTriangle, color: 'text-yellow-400' },
  temp_check:  { icon: AlertTriangle, color: 'text-red-400' },
  defoliation: { icon: Leaf,       color: 'text-emerald-400' },
  harvest:     { icon: Clock,       color: 'text-purple-400' },
  general:     { icon: Bell,        color: 'text-gray-400' },
};

interface Reminder {
  id: string;
  reminder_type: string;
  title: string;
  due_date: string;
  repeat_interval_days: number | null;
  is_completed: boolean;
}

interface Props {
  reminders: Reminder[];
  growId: string;
  userId: string;
}

export function ReminderPanelCompact({ reminders, growId, userId }: Props) {
  const [localReminders, setLocalReminders] = useState<Reminder[]>(reminders);
  const [showAll, setShowAll] = useState(false);

  const pending = localReminders.filter(r => !r.is_completed);
  const overdue = pending.filter(r => new Date(r.due_date) < new Date());
  const upcoming = pending.filter(r => new Date(r.due_date) >= new Date());

  // Top 2 overdue + 1 upcoming = 3 max in compact view
  const display = showAll ? pending : overdue.slice(0, 2).concat(upcoming.slice(0, 1));
  const hiddenCount = pending.length - display.length;

  async function completeReminder(id: string) {
    try {
      await supabase.rpc('complete_reminder_and_repeat', { p_reminder_id: id });
      // Optimistically remove or refetch
      setLocalReminders(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Error completing reminder:', e);
    }
  }

  if (pending.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-[#2FF801]" />
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--muted-foreground)]">
            Erinnerungen
          </h2>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] text-center py-4">
          Keine offenen Erinnerungen ✓
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-[#2FF801]" />
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--muted-foreground)]">
            Erinnerungen
          </h2>
          {overdue.length > 0 && (
            <span className="bg-red-500/20 text-red-400 text-[9px] font-black px-1.5 py-0.5 rounded">
              {overdue.length} überfällig
            </span>
          )}
        </div>
      </div>

      {/* Reminder list */}
      <div className="space-y-1.5">
        {display.map(reminder => {
          const config = TYPE_CONFIG[reminder.reminder_type] ?? TYPE_CONFIG.general;
          const Icon = config.icon;
          const isOverdue = new Date(reminder.due_date) < new Date();

          return (
            <div
              key={reminder.id}
              className={`
                flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors
                ${isOverdue
                  ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15'
                  : 'bg-[var(--card)] border-[var(--border)]/50 hover:border-[var(--border)]'
                }
              `}
            >
              <Icon size={14} className={isOverdue ? 'text-red-400 flex-shrink-0' : `${config.color} flex-shrink-0`} />

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isOverdue ? 'text-red-400' : ''}`}>
                  {reminder.title}
                </p>
                <p className={`text-[9px] leading-tight ${isOverdue ? 'text-red-400/70' : 'text-[var(--muted-foreground)]'}`}>
                  {isOverdue ? 'Überfällig: ' : ''}
                  {new Date(reminder.due_date).toLocaleDateString('de-DE', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                  {reminder.repeat_interval_days && ` · alle ${reminder.repeat_interval_days} Tage`}
                </p>
              </div>

              <button
                onClick={() => completeReminder(reminder.id)}
                className="p-1 hover:bg-[#2FF801]/20 rounded transition-colors flex-shrink-0"
                title="Erledigen"
              >
                <CheckCircle2 size={14} className="text-[#2FF801]" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Expand/collapse button */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-[10px] text-[var(--muted-foreground)] hover:text-[#2FF801] py-1 transition-colors"
        >
          {showAll ? 'Weniger anzeigen' : `+${hiddenCount} weitere`}
        </button>
      )}
    </div>
  );
}
