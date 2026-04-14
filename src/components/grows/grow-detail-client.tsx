'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/components/toast-provider';
import { supabase } from '@/lib/supabase/client';
import { GrowDetailHeader } from './grow-detail-header';
import { QuickActionBar } from './quick-action-bar';
import { PlantCarousel } from './plant-carousel';
import { TimelineSection } from './timeline-section';
import { ReminderPanelCompact } from './reminder-panel-compact';
import { LogEntryModal } from './log-entry-modal';
import { BottomNav } from '@/components/bottom-nav';
import { PlantLimitWarning } from './plant-limit-warning';
import type { Grow, Plant, GrowEntry, GrowEntryType, GrowMilestone, PlantStatus } from '@/lib/types';

const ACTIVE_STATUSES: PlantStatus[] = ['seedling', 'vegetative', 'flowering', 'flushing'];

interface Props {
  initialGrow: Grow;
  initialPlants: Plant[];
  initialEntries: GrowEntry[];
  initialMilestones: GrowMilestone[];
  initialReminders: unknown[];
  initialComments: unknown[];
  initialFollowerCount: number;
  growId: string;
}

export function GrowDetailClient({
  initialGrow,
  initialPlants,
  initialEntries,
  initialMilestones,
  initialReminders,
  initialComments,
  initialFollowerCount,
  growId,
}: Props) {
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  // Local state for optimistic updates
  const [grow] = useState<Grow>(initialGrow);
  const [plants, setPlants] = useState<Plant[]>(initialPlants);
  const [entries, setEntries] = useState<GrowEntry[]>(initialEntries);
  const [localComments, setLocalComments] = useState(initialComments as any[]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  // UI state
  const [showPlantLimitWarning, setShowPlantLimitWarning] = useState(false);
  const [isAddingPlant, setIsAddingPlant] = useState(false);
  const [newPlantName, setNewPlantName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal state
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedLogType, setSelectedLogType] = useState<GrowEntryType | null>(null);
  const [logModalPlantId, setLogModalPlantId] = useState<string | null>(null);

  const isOwner = user?.id === grow.user_id;

  // Open log modal — optionally with preselected type
  const openLogModal = useCallback((plantId: string | null = null, type?: GrowEntryType) => {
    setSelectedLogType(type ?? null);
    setLogModalPlantId(plantId);
    setLogModalOpen(true);
  }, []);

  const onEntryAdded = useCallback(async () => {
    setLogModalOpen(false);
    // Refetch entries
    const { data } = await supabase
      .from('grow_entries')
      .select('*')
      .eq('grow_id', growId)
      .order('created_at', { ascending: false });
    if (data) setEntries(data);
    toastSuccess('Eintrag hinzugefügt');
  }, [growId, toastSuccess]);

  const handleAddPlant = async () => {
    if (!newPlantName.trim()) return;
    const active = plants.filter(p => ACTIVE_STATUSES.includes(p.status));
    if (active.length >= 3) { setShowPlantLimitWarning(true); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('plants').insert({
        grow_id: growId,
        user_id: user!.id,
        plant_name: newPlantName.trim(),
        strain_id: (grow as any).strain_id ?? null,
        status: 'seedling' as PlantStatus,
        planted_at: new Date().toISOString(),
      });
      if (error) throw error;
      const { data } = await supabase.from('plants').select('*').eq('grow_id', growId).order('created_at', { ascending: true });
      if (data) setPlants(data);
      setNewPlantName('');
      setIsAddingPlant(false);
    } catch (e) {
      toastError('Fehler beim Hinzufügen der Pflanze');
    } finally { setIsSaving(false); }
  };

  const handleStatusAdvance = async (plantId: string, newStatus: PlantStatus) => {
    setIsSaving(true);
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'harvested') updates.harvested_at = new Date().toISOString();
      const { error } = await supabase.from('plants').update(updates).eq('id', plantId);
      if (error) throw error;
      setPlants(prev => prev.map(p => p.id === plantId ? { ...p, status: newStatus } : p));
    } catch (e) {
      toastError('Fehler beim Aktualisieren');
    } finally { setIsSaving(false); }
  };

  const handleFollowToggle = async () => {
    if (!user) return;
    try {
      if (isFollowing) {
        await supabase.from('grow_follows').delete().eq('grow_id', growId).eq('user_id', user.id);
        setIsFollowing(false);
        setFollowerCount(Math.max(0, followerCount - 1));
      } else {
        await supabase.from('grow_follows').insert({ grow_id: growId, user_id: user.id });
        setIsFollowing(true);
        setFollowerCount(followerCount + 1);
      }
    } catch (e) {
      toastError('Fehler beim Folgen');
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      {showPlantLimitWarning && (
        <div className="p-4">
          <PlantLimitWarning visible={showPlantLimitWarning} onDismiss={() => setShowPlantLimitWarning(false)} />
        </div>
      )}

      <GrowDetailHeader
        grow={grow}
        followerCount={followerCount}
        isFollowing={isFollowing}
        onFollowToggle={handleFollowToggle}
        isOwner={isOwner}
      />

      <div className="p-6 space-y-6 relative z-10">
        <QuickActionBar
          onAction={(type) => openLogModal(null, type)}
          onMore={() => openLogModal(null)}
        />

        {isAddingPlant && (
          <div className="bg-[var(--card)] border border-[var(--border)]/50 rounded-xl p-4 space-y-3">
            <input
              value={newPlantName}
              onChange={e => setNewPlantName(e.target.value)}
              placeholder="Pflanzenname (z.B. Plant 1)"
              className="w-full bg-[var(--input)] border border-[var(--border)]/50 rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddPlant}
                disabled={isSaving || !newPlantName.trim()}
                className="flex-1 bg-[#2FF801] text-black font-bold rounded-lg py-2 text-sm disabled:opacity-50"
              >
                {isSaving ? '...' : 'Hinzufügen'}
              </button>
              <button
                onClick={() => { setIsAddingPlant(false); setNewPlantName(''); }}
                className="px-4 py-2 text-sm text-[var(--muted-foreground)]"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <PlantCarousel
          plants={plants}
          isOwner={isOwner}
          onAddPlant={() => setIsAddingPlant(true)}
          onStatusAdvance={handleStatusAdvance}
        />

        <TimelineSection
          entries={entries}
          comments={localComments as any}
          onPhotoClick={() => {}}
        />

        <ReminderPanelCompact
          reminders={initialReminders as any[]}
          growId={growId}
          userId={user?.id ?? ''}
        />
      </div>

      <BottomNav />

      {logModalOpen && (
        <LogEntryModal
          open={logModalOpen}
          onClose={() => { setLogModalOpen(false); setSelectedLogType(null); }}
          growId={growId}
          plantId={logModalPlantId}
          onEntryAdded={onEntryAdded}
        />
      )}
    </main>
  );
}
