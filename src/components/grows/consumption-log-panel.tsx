'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Flame, Plus, Calendar, Trash2, Eye } from 'lucide-react';

// German labels - NEUTRAL (no medical claims)
const CONSUMPTION_METHOD_LABELS: Record<string, { label: string; icon: string }> = {
  vaporizer: { label: 'Verdampfer', icon: '💨' },
  joint: { label: 'Joint', icon: '📄' },
  bong: { label: 'Bong', icon: '💧' },
  pipe: { label: 'Pfeife', icon: '🌿' },
  edible: { label: 'Essbar', icon: '🍪' },
  oil: { label: 'Öl', icon: '�滴滴' },
  topical: { label: 'Äußerlich', icon: '🧴' },
  other: { label: 'Sonstiges', icon: '✨' },
};

const MOOD_OPTIONS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'entspannt', label: 'Entspannt' },
  { value: 'aktiv', label: 'Aktiv' },
  { value: 'müde', label: 'Müde' },
  { value: 'gestresst', label: 'Gestresst' },
  { value: 'fröhlich', label: 'Fröhlich' },
  { value: 'traurig', label: 'Traurig' },
  { value: 'anderes', label: 'Anderes' },
];

interface ConsumptionLog {
  id: string;
  strain_id: string | null;
  consumption_method: string;
  amount_grams: number | null;
  subjective_notes: string | null;
  mood_before: string | null;
  mood_after: string | null;
  consumed_at: string;
  strains?: { name: string; type: string } | null;
}

interface ConsumptionLogPanelProps {
  userId: string;
}

export function ConsumptionLogPanel({ userId }: ConsumptionLogPanelProps) {
  const [logs, setLogs] = useState<ConsumptionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create form state
  const [newMethod, setNewMethod] = useState('vaporizer');
  const [newAmount, setNewAmount] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newMoodBefore, setNewMoodBefore] = useState('');
  const [newMoodAfter, setNewMoodAfter] = useState('');
  const [newConsumedAt, setNewConsumedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );

  useEffect(() => {
    fetchLogs();
  }, [userId]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consumption_logs')
        .select('*, strains(name, type)')
        .order('consumed_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setLogs(data);
      }
    } catch (e) {
      console.error('Error fetching consumption logs:', e);
    }
    setLoading(false);
  }

  async function createLog() {
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('consumption_logs')
        .insert({
          user_id: userId,
          consumption_method: newMethod,
          amount_grams: newAmount ? parseFloat(newAmount) : null,
          subjective_notes: newNotes || null,
          mood_before: newMoodBefore || null,
          mood_after: newMoodAfter || null,
          consumed_at: new Date(newConsumedAt).toISOString()
        })
        .select('*, strains(name, type)')
        .single();

      if (!error && data) {
        setLogs(prev => [data, ...prev]);
        setShowCreateModal(false);
        resetForm();
      }
    } catch (e) {
      console.error('Error creating consumption log:', e);
    }
    setIsCreating(false);
  }

  async function deleteLog(logId: string) {
    try {
      await supabase.from('consumption_logs').delete().eq('id', logId);
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (e) {
      console.error('Error deleting log:', e);
    }
  }

  function resetForm() {
    setNewMethod('vaporizer');
    setNewAmount('');
    setNewNotes('');
    setNewMoodBefore('');
    setNewMoodAfter('');
    setNewConsumedAt(new Date().toISOString().slice(0, 16));
  }

  // Group logs by date
  const logsByDate: Record<string, ConsumptionLog[]> = {};
  for (const log of logs) {
    const dateKey = new Date(log.consumed_at).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
    if (!logsByDate[dateKey]) logsByDate[dateKey] = [];
    logsByDate[dateKey].push(log);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-orange-400" />
          <span className="text-sm font-bold uppercase tracking-wider">Konsum-Tagebuch</span>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold">
              <Plus size={14} className="mr-1" /> Log
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--background)] border border-[var(--border)]/50 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display uppercase tracking-tight">
                Konsum dokumentieren
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Disclaimer - LEGAL */}
              <div className="p-2 rounded bg-orange-500/10 border border-orange-500/30">
                <p className="text-[10px] text-orange-400">
                  Private Dokumentation für eigenen Konsum. Keine medizinischen Aussagen.
                </p>
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                  Konsumform *
                </Label>
                <Select value={newMethod} onValueChange={setNewMethod}>
                  <SelectTrigger className="bg-[var(--background)] border border-[var(--border)]/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONSUMPTION_METHOD_LABELS).map(([key, { label, icon }]) => (
                      <SelectItem key={key} value={key}>
                        {icon} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                  Menge (Gramm)
                </Label>
                <Input
                  type="number"
                  step={0.1}
                  min={0}
                  max={100}
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  placeholder="z.B. 0.5"
                  className="bg-[var(--background)] border border-[var(--border)]/50"
                />
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                  Datum & Zeit *
                </Label>
                <Input
                  type="datetime-local"
                  value={newConsumedAt}
                  onChange={e => setNewConsumedAt(e.target.value)}
                  className="bg-[var(--background)] border border-[var(--border)]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                    Stimmung vorher
                  </Label>
                  <Select value={newMoodBefore} onValueChange={setNewMoodBefore}>
                    <SelectTrigger className="bg-[var(--background)] border border-[var(--border)]/50">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOOD_OPTIONS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                    Stimmung nachher
                  </Label>
                  <Select value={newMoodAfter} onValueChange={setNewMoodAfter}>
                    <SelectTrigger className="bg-[var(--background)] border border-[var(--border)]/50">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOOD_OPTIONS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                  Notizen (persönlich)
                </Label>
                <Textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="z.B. Am Abend geraucht, hat gut geschmeckt..."
                  rows={2}
                  className="bg-[var(--background)] border border-[var(--border)]/50"
                />
              </div>

              <Button
                onClick={createLog}
                disabled={isCreating}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white font-bold"
              >
                {isCreating ? 'Speichern...' : 'Konsum speichern'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Log List */}
      {loading ? (
        <div className="text-center py-6 text-[var(--muted-foreground)] text-sm">Laden...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-6 text-[var(--muted-foreground)]">
          <Flame size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs">Keine Einträge</p>
          <p className="text-[10px]">Dokumentiere deinen Konsum</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(logsByDate).map(([date, dateLogs]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={12} className="text-[var(--muted-foreground)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {date}
                </span>
              </div>
              <div className="space-y-2">
                {dateLogs.map(log => {
                  const methodInfo = CONSUMPTION_METHOD_LABELS[log.consumption_method] || CONSUMPTION_METHOD_LABELS.other;
                  const isExpanded = expandedId === log.id;

                  return (
                    <Card
                      key={log.id}
                      className={`p-3 bg-[var(--card)] border-[var(--border)]/50 transition-all ${
                        isExpanded ? 'border-orange-500/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          <span className="text-sm">{methodInfo.icon}</span>
                          <div>
                            <p className="text-sm font-medium">
                              {methodInfo.label}
                              {log.strains?.name && (
                                <span className="text-[var(--muted-foreground)] ml-1">
                                  • {log.strains.name}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">
                              {new Date(log.consumed_at).toLocaleTimeString('de-DE', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {log.amount_grams && ` • ${log.amount_grams}g`}
                              {log.mood_after && ` • ${log.mood_after}`}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="p-1 rounded hover:bg-[var(--muted)] transition-colors"
                          >
                            <Eye size={12} className="text-[var(--muted-foreground)]" />
                          </button>
                          <button
                            onClick={() => deleteLog(log.id)}
                            className="p-1 rounded hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 size={12} className="text-red-400/60 hover:text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[var(--border)]/30 space-y-2">
                          {log.mood_before && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[var(--muted-foreground)]">Vorher:</span>
                              <span>{log.mood_before}</span>
                            </div>
                          )}
                          {log.mood_after && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[var(--muted-foreground)]">Nachher:</span>
                              <span>{log.mood_after}</span>
                            </div>
                          )}
                          {log.subjective_notes && (
                            <p className="text-xs text-[var(--muted-foreground)] italic">
                              "{log.subjective_notes}"
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
