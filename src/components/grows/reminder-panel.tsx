'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Bell, Droplets, Leaf2, Repot, AlertTriangle, CheckCircle2, Clock, Plus, X } from 'lucide-react';

const REMINDER_TYPE_CONFIG: Record<string, { icon: typeof Droplets; color: string; label: string }> = {
  water: { icon: Droplets, color: 'text-blue-400', label: 'Gießen' },
  nutrient: { icon: Leaf2, color: 'text-green-400', label: 'Düngen' },
  repot: { icon: Repot, color: 'text-orange-400', label: 'Umtopfen' },
  ph_check: { icon: AlertTriangle, color: 'text-yellow-400', label: 'pH-Prüfung' },
  temp_check: { icon: AlertTriangle, color: 'text-red-400', label: 'Temperatur' },
  defoliation: { icon: Leaf2, color: 'text-emerald-400', label: 'Entlaubung' },
  harvest: { icon: Clock, color: 'text-purple-400', label: 'Ernte' },
  general: { icon: Bell, color: 'text-gray-400', label: 'Allgemein' },
};

interface Reminder {
  id: string;
  user_id: string;
  grow_id: string | null;
  reminder_type: string;
  title: string;
  notes: string | null;
  due_date: string;
  repeat_interval_days: number | null;
  is_completed: boolean;
  completed_at: string | null;
  grows?: { title: string } | null;
}

interface ReminderPanelProps {
  growId?: string;
  userId: string;
}

export function ReminderPanel({ growId, userId }: ReminderPanelProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('water');
  const [newNotes, setNewNotes] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('09:00');
  const [newRepeatDays, setNewRepeatDays] = useState('');

  useEffect(() => {
    fetchReminders();
  }, [growId, userId]);

  async function fetchReminders() {
    setLoading(true);
    try {
      let query = supabase
        .from('grow_reminders')
        .select('*, grows(title)')
        .order('due_date', { ascending: true });

      if (growId) {
        query = query.eq('grow_id', growId);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setReminders(data);
      }
    } catch (e) {
      console.error('Error fetching reminders:', e);
    }
    setLoading(false);
  }

  async function createReminder() {
    if (!newTitle || !newDueDate) return;
    setIsCreating(true);

    const dueDatetime = `${newDueDate}T${newDueTime}:00Z`;

    try {
      const { data, error } = await supabase
        .from('grow_reminders')
        .insert({
          user_id: userId,
          grow_id: growId || null,
          reminder_type: newType,
          title: newTitle,
          notes: newNotes || null,
          due_date: dueDatetime,
          repeat_interval_days: newRepeatDays ? parseInt(newRepeatDays) : null
        })
        .select()
        .single();

      if (!error && data) {
        setReminders(prev => [...prev, data].sort((a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        ));
        setShowCreateModal(false);
        resetForm();
      }
    } catch (e) {
      console.error('Error creating reminder:', e);
    }
    setIsCreating(false);
  }

  async function completeReminder(reminderId: string) {
    try {
      const { data, error } = await supabase
        .rpc('complete_reminder_and_repeat', { p_reminder_id: reminderId });

      if (!error) {
        // Refresh list to get potentially new reminder from repeat
        fetchReminders();
      }
    } catch (e) {
      console.error('Error completing reminder:', e);
    }
  }

  async function deleteReminder(reminderId: string) {
    try {
      await supabase.from('grow_reminders').delete().eq('id', reminderId);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (e) {
      console.error('Error deleting reminder:', e);
    }
  }

  function resetForm() {
    setNewTitle('');
    setNewType('water');
    setNewNotes('');
    setNewDueDate('');
    setNewDueTime('09:00');
    setNewRepeatDays('');
  }

  const pendingReminders = reminders.filter(r => !r.is_completed);
  const completedReminders = reminders.filter(r => r.is_completed);

  const isOverdue = (date: string) => new Date(date) < new Date();

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[#2FF801]" />
          <span className="text-sm font-bold uppercase tracking-wider">Erinnerungen</span>
          {pendingReminders.length > 0 && (
            <Badge className="bg-[#2FF801]/20 text-[#2FF801] border-[#2FF801]/30 text-[10px]">
              {pendingReminders.length}
            </Badge>
          )}
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#2FF801] hover:bg-[#2FF801]/80 text-black text-xs font-bold">
              <Plus size={14} className="mr-1" /> Neu
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--background)] border border-[var(--border)]/50 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display uppercase tracking-tight">
                Neue Erinnerung
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                  Art
                </Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="bg-[var(--background)] border border-[var(--border)]/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REMINDER_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <config.icon size={14} className={config.color} />
                          {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                  Titel *
                </Label>
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="z.B. Pflanzen gießen"
                  className="bg-[var(--background)] border border-[var(--border)]/50"
                />
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                  Notizen
                </Label>
                <Textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Optional..."
                  rows={2}
                  className="bg-[var(--background)] border border-[var(--border)]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                    Datum *
                  </Label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="bg-[var(--background)] border border-[var(--border)]/50"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                    Zeit
                  </Label>
                  <Input
                    type="time"
                    value={newDueTime}
                    onChange={e => setNewDueTime(e.target.value)}
                    className="bg-[var(--background)] border border-[var(--border)]/50"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                  Wiederholen (Tage)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={newRepeatDays}
                  onChange={e => setNewRepeatDays(e.target.value)}
                  placeholder="z.B. 3 (für alle 3 Tage)"
                  className="bg-[var(--background)] border border-[var(--border)]/50"
                />
              </div>

              <Button
                onClick={createReminder}
                disabled={!newTitle || !newDueDate || isCreating}
                className="w-full bg-gradient-to-r from-[#2FF801] to-[#2fe000] hover:opacity-90 text-black font-bold"
              >
                {isCreating ? 'Speichern...' : 'Erinnerung erstellen'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Reminders */}
      {loading ? (
        <div className="text-center py-4 text-[var(--muted-foreground)] text-sm">Laden...</div>
      ) : pendingReminders.length === 0 ? (
        <div className="text-center py-6 text-[var(--muted-foreground)]">
          <Bell size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs">Keine Erinnerungen</p>
          <p className="text-[10px]">Erstelle eine neue Erinnerung</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingReminders.slice(0, 5).map(reminder => {
            const config = REMINDER_TYPE_CONFIG[reminder.reminder_type] || REMINDER_TYPE_CONFIG.general;
            const Icon = config.icon;
            const overdue = isOverdue(reminder.due_date);

            return (
              <div
                key={reminder.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  overdue
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-[var(--card)] border-[var(--border)]/50'
                }`}
              >
                <Icon size={16} className={overdue ? 'text-red-400' : config.color} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${overdue ? 'text-red-400' : ''}`}>
                    {reminder.title}
                  </p>
                  <p className={`text-[10px] ${overdue ? 'text-red-400/70' : 'text-[var(--muted-foreground)]'}`}>
                    {overdue ? 'Überfällig: ' : ''}
                    {new Date(reminder.due_date).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {reminder.repeat_interval_days && ` • alle ${reminder.repeat_interval_days} Tage`}
                  </p>
                </div>
                <button
                  onClick={() => completeReminder(reminder.id)}
                  className="p-1.5 rounded-lg hover:bg-[#2FF801]/20 transition-colors"
                  title="Erledigen"
                >
                  <CheckCircle2 size={16} className="text-[#2FF801]" />
                </button>
                <button
                  onClick={() => deleteReminder(reminder.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                  title="Löschen"
                >
                  <X size={16} className="text-red-400/60 hover:text-red-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Today */}
      {completedReminders.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)]">
            {completedReminders.length} erledigte Erinnerungen
          </summary>
          <div className="mt-2 space-y-1">
            {completedReminders.slice(0, 3).map(r => (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded bg-[var(--muted)]/50">
                <CheckCircle2 size={12} className="text-[#2FF801]" />
                <span className="text-xs line-through text-[var(--muted-foreground)]">{r.title}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
