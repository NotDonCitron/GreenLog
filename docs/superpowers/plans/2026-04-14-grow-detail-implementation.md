# Grow-Diary Detailseite — Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the grow detail page (`/grows/[id]`) with a mobile-first layout: summary header, sticky quick actions, horizontal plant carousel, inline-expand timeline entries, and compact reminders.

**Architecture:** Next.js 15 App Router. `page.tsx` becomes an async Server Component that fetches data and passes it to Client Components. Each interactive piece (`'use client'`) is isolated to its smallest boundary. The existing `grow-timeline.tsx` is replaced with a new `timeline-section.tsx` that renders `timeline-entry.tsx` components with inline expand logic.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, GreenLog design tokens (`#2FF801` accent), Supabase.

**Corrections from spec approval:**
- Next.js 15 App Router (not Pages Router)
- Server Components for data-fetching in `page.tsx`
- Comments flat-integrated into expanded timeline entry
- Follow button in the header area
- Harvest Certificate shown prominently when `status === 'completed'`, otherwise in overflow menu

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/grows/[id]/page.tsx` | **Rewrite** | Async Server Component — fetch grow, plants, entries, milestones, reminders. Render layout shell. |
| `src/components/grows/grow-detail-header.tsx` | **Create** | Summary header: status badge, strain, phase+day, follow button, overflow menu |
| `src/components/grows/quick-action-bar.tsx` | **Create** | Sticky 4-button action bar (Gießen, Füttern, Foto, Notiz) |
| `src/components/grows/plant-carousel.tsx` | **Create** | Horizontal scrollable plant cards |
| `src/components/grows/timeline-entry.tsx` | **Create** | Single entry card with inline expand (comments inside when expanded) |
| `src/components/grows/timeline-section.tsx` | **Create** | Timeline container — vertical line, renders TimelineEntry list |
| `src/components/grows/reminder-panel-compact.tsx` | **Create** | Compact reminder list (top 3, rest collapsed) |
| `src/components/grows/grow-timeline.tsx` | **Supersede** | Replaced by timeline-section.tsx — can be deleted after migration |
| `src/app/grows/[id]/page.tsx` (old) | — | See rewrite above |

---

## Task 1: Rewrite `page.tsx` as Server Component

**Files:**
- Modify: `src/app/grows/[id]/page.tsx`

- [ ] **Step 1: Read the current page.tsx to get exact current structure**

```bash
cat src/app/grows/[id]/page.tsx | head -30
```

- [ ] **Step 2: Rewrite page.tsx as async Server Component**

Replace the entire file content with:

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { GrowDetailClient } from '@/components/grows/grow-detail-client';
import type { Grow, Plant, GrowEntry, GrowMilestone } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GrowDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Fetch grow with strain
  const { data: grow, error: growError } = await supabase
    .from('grows')
    .select('*, strains(id, name, slug)')
    .eq('id', id)
    .single();

  if (growError || !grow) {
    notFound();
  }

  // Fetch plants
  const { data: plants } = await supabase
    .from('plants')
    .select('*')
    .eq('grow_id', id)
    .order('created_at', { ascending: true });

  // Fetch entries
  const { data: entries } = await supabase
    .from('grow_entries')
    .select('*')
    .eq('grow_id', id)
    .order('created_at', { ascending: false });

  // Fetch milestones
  const { data: milestones } = await supabase
    .from('grow_milestones')
    .select('*')
    .eq('grow_id', id)
    .order('started_at', { ascending: true });

  // Fetch reminders
  const { data: reminders } = await supabase
    .from('grow_reminders')
    .select('*, grows(title)')
    .eq('grow_id', id)
    .order('due_date', { ascending: true });

  // Fetch comments with profiles
  const { data: comments } = await supabase
    .from('grow_comments')
    .select('*, profiles(id, username, display_name, avatar_url)')
    .eq('grow_id', id)
    .order('created_at', { ascending: true });

  // Fetch follower count and check if user is following
  const { count: followerCount } = await supabase
    .from('grow_follows')
    .select('*', { count: 'exact', head: true })
    .eq('grow_id', id);

  return (
    <GrowDetailClient
      grow={grow as Grow}
      plants={(plants as Plant[]) ?? []}
      entries={(entries as GrowEntry[]) ?? []}
      milestones={(milestones as GrowMilestone[]) ?? []}
      reminders={(reminders ?? [])}
      comments={(comments ?? [])}
      followerCount={followerCount ?? 0}
      growId={id}
    />
  );
}
```

- [ ] **Step 3: Create the client shell — `src/components/grows/grow-detail-client.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { GrowDetailHeader } from './grow-detail-header';
import { QuickActionBar } from './quick-action-bar';
import { PlantCarousel } from './plant-carousel';
import { TimelineSection } from './timeline-section';
import { ReminderPanelCompact } from './reminder-panel-compact';
import { LogEntryModal } from './log-entry-modal';
import { BottomNav } from '@/components/bottom-nav';
import type { Grow, Plant, GrowEntry, GrowMilestone, GrowComment } from '@/lib/types';

interface Props {
  grow: Grow;
  plants: Plant[];
  entries: GrowEntry[];
  milestones: GrowMilestone[];
  reminders: unknown[];
  comments: GrowComment[];
  followerCount: number;
  growId: string;
}

export function GrowDetailClient({
  grow, plants, entries, milestones, reminders, comments, followerCount, growId
}: Props) {
  const { user } = useAuth();
  const [localEntries, setLocalEntries] = useState<GrowEntry[]>(entries);
  const [localPlants, setLocalPlants] = useState<Plant[]>(plants);
  const [localComments, setLocalComments] = useState<GrowComment[]>(comments);
  const [isFollowing, setIsFollowing] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logModalPlantId, setLogModalPlantId] = useState<string | null>(null);

  const isOwner = user?.id === grow.user_id;

  function openLogModal(plantId: string | null = null) {
    setLogModalPlantId(plantId);
    setLogModalOpen(true);
  }

  function onEntryAdded() {
    // Re-fetch entries — in a real app you'd use React Query refetch
    setLogModalOpen(false);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      <GrowDetailHeader
        grow={grow}
        followerCount={followerCount}
        isFollowing={isFollowing}
        onFollowToggle={() => setIsFollowing(!isFollowing)}
        isOwner={isOwner}
      />

      <div className="p-6 space-y-6 relative z-10">
        <QuickActionBar onAction={openLogModal} />

        <PlantCarousel
          plants={localPlants}
          isOwner={isOwner}
          onAddPlant={() => {}}
          onStatusAdvance={() => {}}
        />

        <TimelineSection
          entries={localEntries}
          comments={localComments}
          onPhotoClick={() => {}}
        />

        <ReminderPanelCompact
          reminders={reminders as Parameters<typeof ReminderPanelCompact>[0]['reminders']}
          growId={growId}
          userId={user?.id ?? ''}
        />
      </div>

      <BottomNav />

      {logModalOpen && (
        <LogEntryModal
          open={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          growId={growId}
          plantId={logModalPlantId}
          onEntryAdded={onEntryAdded}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/grows/[id]/page.tsx
git commit -m "feat(grows): convert page.tsx to App Router Server Component

Rewrites grow detail page as async Server Component.
Fetches grow, plants, entries, milestones, reminders, comments on server.
Passes data to GrowDetailClient shell for interactivity.
Part of grow-detail-redesign."
```

---

## Task 2: Create `grow-detail-header.tsx`

**Files:**
- Create: `src/components/grows/grow-detail-header.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Droplets, Leaf, Sun, Eye, EyeOff, Users, ChevronLeft, MoreHorizontal, Clock, Copy } from 'lucide-react';
import { PhaseBadge } from './phase-badge';
import type { Grow, PlantStatus } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#2FF801] text-black border-none',
  completed: 'bg-[#00F5FF] text-black border-none',
  archived: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-none',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'AKTIV',
  completed: 'ABGESCHLOSSEN',
  archived: 'ARCHIVIERT',
};

const PHASE_ICONS: Record<string, string> = {
  germination: '🌱',
  vegetation: '🌿',
  flower: '🌸',
  flush: '💛',
  harvest: '🍂',
};

interface Props {
  grow: Grow;
  followerCount: number;
  isFollowing: boolean;
  onFollowToggle: () => void;
  isOwner: boolean;
}

export function GrowDetailHeader({ grow, followerCount, isFollowing, onFollowToggle, isOwner }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Derive current phase from plants (most advanced active plant)
  const activePlants = (grow as any).plants?.filter((p: Plant) =>
    ['seedling', 'vegetative', 'flowering', 'flushing'].includes(p.status)
  ) ?? [];
  const currentPhase = activePlants.length > 0
    ? (activePlants[0] as Plant).status
    : 'germination';

  // Calculate day number
  const startDate = grow.start_date ? new Date(grow.start_date) : new Date();
  const today = new Date();
  const dayNumber = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const phaseLabel = {
    germination: 'Keimung', vegetation: 'Vegetation', flower: 'Blüte',
    flush: 'Flush', harvested: 'Ernte', destroyed: 'Destroyed',
  }[currentPhase] ?? 'Keimung';

  return (
    <header className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50 px-6 py-4">
      {/* Top row: back + title */}
      <div className="flex items-center gap-4 mb-3">
        <Link href="/grows">
          <Button variant="ghost" size="icon" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-full">
            <ChevronLeft size={24} />
          </Button>
        </Link>
        <div className="flex-1">
          <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">Grow Details</span>
          <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none font-display">
            {grow.title}
          </h1>
        </div>
        {isOwner && (
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)}>
              <MoreHorizontal size={20} />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1">
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--muted)] flex items-center gap-2">
                  <Edit2 size={14} /> Bearbeiten
                </button>
                {grow.status === 'completed' && (
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--muted)] flex items-center gap-2">
                    <Copy size={14} /> Ernte-Zertifikat
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className={STATUS_COLORS[grow.status] ?? STATUS_COLORS.archived}>
          ● {STATUS_LABELS[grow.status] ?? grow.status.toUpperCase()}
        </Badge>

        <div className="flex items-center gap-1 text-sm">
          <span>{PHASE_ICONS[currentPhase] ?? '🌱'}</span>
          <span className="font-medium">{phaseLabel}</span>
          <span className="text-[var(--muted-foreground)]">· Tag {dayNumber}</span>
        </div>

        {grow.strains && (
          <Link href={`/strains/${(grow.strains as any).slug}`} className="flex items-center gap-1 text-sm text-[#2FF801] hover:underline">
            <Leaf size={14} />
            {(grow.strains as any).name}
          </Link>
        )}

        <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
          {grow.is_public ? <Eye size={12} /> : <EyeOff size={12} />}
        </div>

        {/* Follow button — shown for public grows or non-owners */}
        {grow.is_public && !isOwner && (
          <Button
            onClick={onFollowToggle}
            size="sm"
            className={isFollowing ? 'bg-[var(--muted)] text-[var(--foreground)]' : 'bg-[#2FF801] text-black font-black ml-auto'}
          >
            <Users size={12} className="mr-1" />
            {isFollowing ? 'Folge ich' : 'Folgen'}
            <span className="ml-1 text-xs opacity-70">({followerCount})</span>
          </Button>
        )}
      </div>

      {/* Harvest Certificate banner when completed */}
      {grow.status === 'completed' && (
        <Link href={`/grows/${grow.id}/harvest-report`} className="mt-3 block">
          <div className="bg-gradient-to-r from-[#2FF801]/20 to-[#00F5FF]/20 border border-[#2FF801]/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#2FF801]" />
              <span className="text-sm font-bold">Ernte-Zertifikat ansehen</span>
            </div>
            <span className="text-[#2FF801]">→</span>
          </div>
        </Link>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/grows/grow-detail-header.tsx
git commit -m "feat(grows): add GrowDetailHeader component

Shows: status badge, phase+day, strain link, follow button, overflow menu.
Harvest certificate banner when status=completed.
Part of grow-detail-redesign."
```

---

## Task 3: Create `quick-action-bar.tsx`

**Files:**
- Create: `src/components/grows/quick-action-bar.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { Droplets, Leaf, Camera, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GrowEntryType } from '@/lib/types';

const QUICK_ACTIONS: { type?: GrowEntryType; label: string; icon: typeof Droplets; color: string }[] = [
  { type: 'watering', label: 'Gießen', icon: Droplets, color: 'text-blue-400' },
  { type: 'feeding', label: 'Füttern', icon: Leaf, color: 'text-green-400' },
  { type: 'photo', label: 'Foto', icon: Camera, color: 'text-pink-400' },
  { type: 'note', label: 'Notiz', icon: FileText, color: 'text-yellow-400' },
];

interface Props {
  onAction: (type: GrowEntryType) => void;
  onMore: () => void;
}

export function QuickActionBar({ onAction, onMore }: Props) {
  return (
    <div className="sticky top-[72px] z-40 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--border)]/50 -mx-6 px-6 py-3">
      <div className="flex items-center gap-2">
        {QUICK_ACTIONS.map(({ type, label, icon: Icon, color }) => (
          <button
            key={label}
            onClick={() => type && onAction(type)}
            className="flex-1 flex flex-col items-center gap-1 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#2FF801]/50 transition-all"
          >
            <Icon size={18} className={color} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</span>
          </button>
        ))}
        <button
          onClick={onMore}
          className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all"
        >
          <Plus size={18} className="text-[#00F5FF]" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Mehr</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `grow-detail-client.tsx`** to wire up QuickActionBar properly — the `onAction` callback should open the LogEntryModal with the preselected type.

```tsx
// In GrowDetailClient, update QuickActionBar usage:
// <QuickActionBar onAction={(type) => { setSelectedLogType(type); setLogModalOpen(true); }} onMore={() => setLogModalOpen(true)} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/grows/quick-action-bar.tsx
git commit -m "feat(grows): add QuickActionBar component

Sticky action bar with 4 quick log types + 'Mehr' button.
position: sticky below header on mobile.
Part of grow-detail-redesign."
```

---

## Task 4: Create `plant-carousel.tsx`

**Files:**
- Create: `src/components/grows/plant-carousel.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { Sprout, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhaseBadge } from './phase-badge';
import type { Plant, PlantStatus } from '@/lib/types';

const ACTIVE_STATUSES: PlantStatus[] = ['seedling', 'vegetative', 'flowering', 'flushing'];

const NEXT_STATUS: Partial<Record<PlantStatus, PlantStatus>> = {
  seedling: 'vegetative',
  vegetative: 'flowering',
  flowering: 'flushing',
  flushing: 'harvested',
};

const NEXT_LABELS: Partial<Record<PlantStatus, string>> = {
  seedling: 'Vegetative',
  vegetative: 'Blüte',
  flowering: 'Flush',
  flushing: 'Ernte',
};

const PHASE_COLORS: Record<string, string> = {
  seedling: 'border-[#2FF801]/50',
  vegetative: 'border-[#00F5FF]/50',
  flowering: 'border-[#A855F7]/50',
  flushing: 'border-[#EAB308]/50',
  harvested: 'border-[#F97316]/50',
  destroyed: 'border-red-500/50',
};

interface Props {
  plants: Plant[];
  isOwner: boolean;
  onAddPlant: () => void;
  onStatusAdvance: (plantId: string, newStatus: PlantStatus) => void;
}

export function PlantCarousel({ plants, isOwner, onAddPlant, onStatusAdvance }: Props) {
  const activePlants = plants.filter(p => ACTIVE_STATUSES.includes(p.status));
  const canAddMore = activePlants.length < 3;

  if (plants.length === 0 && !isOwner) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">Pflanzen</h2>

      <div className="flex gap-3 overflow-x-auto pb-2 scroll-snap-x mandatory scroll-snap-items-x">
        {plants.map((plant) => {
          const isActive = ACTIVE_STATUSES.includes(plant.status);
          const colorClass = PHASE_COLORS[plant.status] ?? 'border-[var(--border)]';

          return (
            <div
              key={plant.id}
              className={`flex-shrink-0 w-36 bg-[var(--card)] border rounded-xl p-3 scroll-snap-align-start ${colorClass} ${!isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sprout size={12} className={isActive ? 'text-[#2FF801]' : 'text-[var(--muted-foreground)]'} />
                <span className="text-xs font-bold truncate">{plant.plant_name}</span>
              </div>

              <PhaseBadge status={plant.status} />

              {plant.planted_at && (
                <p className="text-[9px] text-[var(--muted-foreground)] mt-2">
                  Gepflanzt: {new Date(plant.planted_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                </p>
              )}

              {isOwner && isActive && NEXT_STATUS[plant.status] && (
                <Button
                  onClick={() => onStatusAdvance(plant.id, NEXT_STATUS[plant.status]!)}
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 text-[9px] border-[var(--border)]/50"
                >
                  Weiter → {NEXT_LABELS[NEXT_STATUS[plant.status]]}
                </Button>
              )}
            </div>
          );
        })}

        {/* Add plant card */}
        {isOwner && canAddMore && (
          <button
            onClick={onAddPlant}
            className="flex-shrink-0 w-36 bg-[var(--card)] border border-dashed border-[var(--border)] rounded-xl p-3 flex flex-col items-center justify-center gap-2 hover:border-[#2FF801]/50 transition-all scroll-snap-align-start"
          >
            <Plus size={20} className="text-[var(--muted-foreground)]" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Pflanze</span>
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/grows/plant-carousel.tsx
git commit -m "feat(grows): add PlantCarousel component

Horizontal scrollable plant cards with scroll-snap.
Phase color coding, status advance button for owner.
+ Add card when under 3 active plants.
Part of grow-detail-redesign."
```

---

## Task 5: Create `timeline-entry.tsx` with inline expand

**Files:**
- Create: `src/components/grows/timeline-entry.tsx`

- [ ] **Step 1: Write the component — collapsed + expanded states, comments inside**

```tsx
'use client';

import { useState } from 'react';
import { Droplets, Leaf, Activity, Camera, Sun, Flag, Wind, Thermometer, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { GrowEntry, GrowComment } from '@/lib/types';

const ENTRY_TYPE_CONFIG: Record<string, { icon: typeof Droplets; color: string; emoji: string }> = {
  watering: { icon: Droplets, color: 'text-blue-400', emoji: '💧' },
  feeding: { icon: Leaf, color: 'text-green-400', emoji: '🌿' },
  ph_ec: { icon: Activity, color: 'text-yellow-400', emoji: '📊' },
  photo: { icon: Camera, color: 'text-pink-400', emoji: '📷' },
  dli: { icon: Sun, color: 'text-orange-400', emoji: '☀️' },
  milestone: { icon: Flag, color: 'text-[#2FF801]', emoji: '🏁' },
  note: { icon: Leaf, color: 'text-yellow-400', emoji: '📝' },
};

function formatEntrySummary(entry: GrowEntry): string {
  switch (entry.entry_type) {
    case 'watering':
      return `${(entry.content as { amount_liters?: number })?.amount_liters ?? '?'}L gegossen`;
    case 'feeding':
      return `${(entry.content as { nutrient?: string })?.nutrient ?? 'Nährstoffe'}`;
    case 'ph_ec':
      const phEc = entry.content as { ph?: number; ec?: number };
      return `pH ${phEc?.ph ?? entry.ph_value ?? '?'} · EC ${phEc?.ec ?? '?'}`;
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
  isFirst: boolean;
  dayNumber: number;
  onPhotoClick?: (url: string) => void;
}

export function TimelineEntry({ entry, comments, isToday, isFirst, dayNumber, onPhotoClick }: Props) {
  const [expanded, setExpanded] = useState(false);

  const config = ENTRY_TYPE_CONFIG[entry.entry_type] ?? ENTRY_TYPE_CONFIG.note;
  const Icon = config.icon;

  // Gather all value badges
  const badges: { label: string; color: string }[] = [];
  if ((entry.content as { amount_liters?: number })?.amount_liters) {
    badges.push({ label: `💧 ${(entry.content as { amount_liters?: number }).amount_liters}L`, color: 'text-blue-400' });
  }
  if ((entry.content as { nutrient?: string })?.nutrient) {
    badges.push({ label: `🌿 ${(entry.content as { nutrient?: string }).nutrient}`, color: 'text-green-400' });
  }
  if ((entry.content as { ec?: number })?.ec !== undefined) {
    badges.push({ label: `EC ${(entry.content as { ec?: number }).ec}`, color: 'text-blue-400' });
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

  const photos: string[] = [];
  if (entry.image_url) photos.push(entry.image_url);
  if ((entry.content as { photo_url?: string })?.photo_url) {
    photos.push((entry.content as { photo_url: string }).photo_url);
  }

  const date = new Date(entry.created_at);
  const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });

  return (
    <div className="relative">
      {/* Day marker (rendered by parent, this component IS the card) */}
      <div
        className={`ml-4 bg-[var(--card)] border rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${
          expanded ? 'border-[#2FF801]/30' : 'border-[var(--border)]/50'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Collapsed header */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">
                Tag {dayNumber}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {dateStr}{isToday ? ' · Heute' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Type badges */}
              <span className={config.color}>{config.emoji}</span>
              {badges.length > 0 && !expanded && (
                <div className="flex gap-1">
                  {badges.slice(0, 2).map((b, i) => (
                    <span key={i} className={`text-[9px] font-bold ${b.color}`}>{b.label}</span>
                  ))}
                </div>
              )}
              <ChevronDown size={12} className={`text-[var(--muted-foreground)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {!expanded && (
            <p className="text-xs text-[var(--muted-foreground)] truncate">
              {formatEntrySummary(entry)}
            </p>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="px-3 pb-3 border-t border-[var(--border)]/30 pt-2 space-y-2">
            {/* Photo grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-1">
                {photos.slice(0, 3).map((url, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onPhotoClick?.(url); }}
                    className="aspect-square rounded-lg overflow-hidden bg-[var(--muted)] hover:opacity-80"
                  >
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Value badges */}
            <div className="flex flex-wrap gap-1.5">
              {badges.map((b, i) => (
                <Badge key={i} variant="outline" className={`text-[10px] ${b.color} border-current/30`}>
                  {b.label}
                </Badge>
              ))}
            </div>

            {/* Notes */}
            {entry.notes && (
              <p className="text-xs text-[var(--muted-foreground)] italic leading-relaxed pl-3 border-l-2 border-[var(--border)]">
                {entry.notes}
              </p>
            )}

            {/* Inline comments */}
            {comments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--border)]/30 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">
                  💬 {comments.length} Kommentar{comments.length > 1 ? 'e' : ''}
                </p>
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-[#00F5FF]">
                        {(comment.profiles as any)?.username?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold">{(comment.profiles as any)?.display_name ?? (comment.profiles as any)?.username}</span>
                        <span className="text-[9px] text-[var(--muted-foreground)]">
                          {new Date(comment.created_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{comment.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/grows/timeline-entry.tsx
git commit -m "feat(grows): add TimelineEntry with inline expand

Collapsed: shows day, type emoji, summary line.
Expanded: shows all badges, photos, notes, inline comments.
Smooth height transition on expand/collapse.
Part of grow-detail-redesign."
```

---

## Task 6: Create `timeline-section.tsx`

**Files:**
- Create: `src/components/grows/timeline-section.tsx`
- Supersedes: `src/components/grows/grow-timeline.tsx` (keep old file until fully migrated)

- [ ] **Step 1: Write the component — groups entries by day, renders TimelineEntry list**

```tsx
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

// Group entries by day_number
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

  // Attach comments to the most recent entry of the day
  for (const comment of comments) {
    const entry = Object.values(dayMap)
      .flatMap(d => d.entries)
      .find(e => e.id === (comment as any).entry_id);
    if (entry) {
      const dayGroup = dayMap[entry.day_number ?? 0];
      if (dayGroup) {
        const existing = dayGroup.comments.find(c => c.id === comment.id);
        if (!existing) dayGroup.comments.push(comment);
      }
    }
  }

  return Object.values(dayMap).sort((a, b) => b.day_number - a.day_number);
}

interface Props {
  entries: GrowEntry[];
  comments: GrowComment[];
  onPhotoClick?: (url: string) => void;
}

export function TimelineSection({ entries, comments, onPhotoClick }: Props) {
  const days = groupByDay(entries, comments);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="text-4xl">🌱</div>
        <p className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Noch keine Einträge</p>
        <p className="text-xs text-[var(--muted-foreground)]">Füge deinen ersten Log-Eintrag hinzu</p>
      </div>
    );
  }

  const todayDay = days[0]?.day_number ?? 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">Zeitstrahl</h2>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#2FF801] via-[#2FF801]/50 to-[var(--border)]" />

        <div className="space-y-4 ml-4">
          {days.map((day, idx) => {
            const isToday = day.day_number === todayDay;
            const isFirst = idx === 0;

            return (
              <div key={`${day.day_number}-${idx}`} className="relative">
                {/* Day marker */}
                <div className={`absolute -left-[18px] w-6 h-6 rounded-full flex items-center justify-center ${
                  isToday
                    ? 'bg-[#2FF801] text-black'
                    : isFirst
                    ? 'bg-[#355E3B] text-white'
                    : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'
                }`}>
                  {isFirst ? (
                    <span className="text-[10px]">🌱</span>
                  ) : (
                    <span className="text-[9px] font-bold">{day.day_number}</span>
                  )}
                </div>

                {/* All entries for this day */}
                {day.entries.map((entry) => (
                  <TimelineEntry
                    key={entry.id}
                    entry={entry}
                    comments={day.comments.filter(c => (c as any).entry_id === entry.id)}
                    isToday={isToday}
                    isFirst={isFirst}
                    dayNumber={day.day_number}
                    onPhotoClick={onPhotoClick}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/grows/timeline-section.tsx
git commit -m "feat(grows): add TimelineSection component

Renders chronological day groups with vertical line.
Delegates to TimelineEntry for each entry card.
Empty state with 🌱 illustration.
Part of grow-detail-redesign."
```

---

## Task 7: Create `reminder-panel-compact.tsx`

**Files:**
- Create: `src/components/grows/reminder-panel-compact.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState } from 'react';
import { Bell, CheckCircle2, Droplets, Leaf, Sprout, AlertTriangle, Clock, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PlantStatus } from '@/lib/types';

const TYPE_CONFIG: Record<string, { icon: typeof Droplets; color: string }> = {
  water: { icon: Droplets, color: 'text-blue-400' },
  nutrient: { icon: Leaf, color: 'text-green-400' },
  repot: { icon: Sprout, color: 'text-orange-400' },
  ph_check: { icon: AlertTriangle, color: 'text-yellow-400' },
  temp_check: { icon: AlertTriangle, color: 'text-red-400' },
  defoliation: { icon: Leaf, color: 'text-emerald-400' },
  harvest: { icon: Clock, color: 'text-purple-400' },
  general: { icon: Bell, color: 'text-gray-400' },
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
  const [localReminders, setLocalReminders] = useState(reminders);
  const [showAll, setShowAll] = useState(false);

  const pending = localReminders.filter(r => !r.is_completed);
  const overdue = pending.filter(r => new Date(r.due_date) < new Date());
  const upcoming = pending.filter(r => new Date(r.due_date) >= new Date());
  const display = showAll ? pending : overdue.slice(0, 2).concat(upcoming.slice(0, 1));
  const hasMore = pending.length > display.length;

  async function completeReminder(id: string) {
    try {
      await supabase.rpc('complete_reminder_and_repeat', { p_reminder_id: id });
      setLocalReminders(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Error completing reminder:', e);
    }
  }

  async function deleteReminder(id: string) {
    try {
      await supabase.from('grow_reminders').delete().eq('id', id);
      setLocalReminders(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Error deleting reminder:', e);
    }
  }

  if (pending.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-[#2FF801]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">Erinnerungen</h2>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] text-center py-4">Keine Erinnerungen</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-[#2FF801]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">Erinnerungen</h2>
          {overdue.length > 0 && (
            <span className="bg-red-500/20 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
              {overdue.length} überfällig
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {display.map(reminder => {
          const config = TYPE_CONFIG[reminder.reminder_type] ?? TYPE_CONFIG.general;
          const Icon = config.icon;
          const isOverdue = new Date(reminder.due_date) < new Date();

          return (
            <div
              key={reminder.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                isOverdue ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--card)] border-[var(--border)]/50'
              }`}
            >
              <Icon size={14} className={isOverdue ? 'text-red-400' : config.color} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isOverdue ? 'text-red-400' : ''}`}>
                  {reminder.title}
                </p>
                <p className={`text-[9px] ${isOverdue ? 'text-red-400/70' : 'text-[var(--muted-foreground)]'}`}>
                  {isOverdue ? 'Überfällig: ' : ''}
                  {new Date(reminder.due_date).toLocaleDateString('de-DE', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                  {reminder.repeat_interval_days && ` · alle ${reminder.repeat_interval_days} Tage`}
                </p>
              </div>
              <button
                onClick={() => completeReminder(reminder.id)}
                className="p-1 hover:bg-[#2FF801]/20 rounded transition-colors"
                title="Erledigen"
              >
                <CheckCircle2 size={14} className="text-[#2FF801]" />
              </button>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-[10px] text-[var(--muted-foreground)] hover:text-[#2FF801] py-1"
        >
          {showAll ? 'Weniger anzeigen' : `+${pending.length - display.length} weitere`}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/grows/reminder-panel-compact.tsx
git commit -m "feat(grows): add ReminderPanelCompact component

Shows top 3 reminders (overdue first, then upcoming).
Expandable with "+N weitere" button.
Overdue = red accent, upcoming = normal.
Part of grow-detail-redesign."
```

---

## Task 8: Integrate all pieces in `grow-detail-client.tsx`

**Files:**
- Modify: `src/components/grows/grow-detail-client.tsx`

Update to properly wire all components together with real callbacks and state management. Add:
- `selectedLogType` state for QuickActionBar preselection
- Plant add flow (shows inline form)
- Status advance flow
- Follow toggle API call
- Loading skeleton state

- [ ] **Step 1: Rewrite `grow-detail-client.tsx` with full integration**

Full content:

```tsx
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
const NEXT_STATUS: Partial<Record<PlantStatus, PlantStatus>> = {
  seedling: 'vegetative', vegetative: 'flowering',
  flowering: 'flushing', flushing: 'harvested',
};

interface Props {
  grow: Grow;
  plants: Plant[];
  entries: GrowEntry[];
  milestones: GrowMilestone[];
  reminders: unknown[];
  comments: unknown[];
  followerCount: number;
  growId: string;
}

export function GrowDetailClient({
  grow, plants, entries, milestones, reminders, comments, followerCount, growId
}: Props) {
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [localEntries, setLocalEntries] = useState<GrowEntry[]>(entries);
  const [localPlants, setLocalPlants] = useState<Plant[]>(plants);
  const [localComments, setLocalComments] = useState(comments as any[]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedLogType, setSelectedLogType] = useState<GrowEntryType | null>(null);
  const [logModalPlantId, setLogModalPlantId] = useState<string | null>(null);
  const [showPlantLimitWarning, setShowPlantLimitWarning] = useState(false);
  const [isAddingPlant, setIsAddingPlant] = useState(false);
  const [newPlantName, setNewPlantName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    if (data) setLocalEntries(data);
  }, [growId]);

  const handleAddPlant = async () => {
    if (!newPlantName.trim()) return;
    const active = localPlants.filter(p => ACTIVE_STATUSES.includes(p.status));
    if (active.length >= 3) { setShowPlantLimitWarning(true); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('plants').insert({
        grow_id: growId, user_id: user!.id,
        plant_name: newPlantName.trim(),
        strain_id: (grow as any).strain_id ?? null,
        status: 'seedling' as PlantStatus,
        planted_at: new Date().toISOString(),
      });
      if (error) throw error;
      const { data } = await supabase.from('plants').select('*').eq('grow_id', growId).order('created_at', true);
      if (data) setLocalPlants(data);
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
      setLocalPlants(prev => prev.map(p => p.id === plantId ? { ...p, status: newStatus } : p));
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
      } else {
        await supabase.from('grow_follows').insert({ grow_id: growId, user_id: user.id });
        setIsFollowing(true);
      }
    } catch (e) {
      toastError('Fehler beim Folgen');
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
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
              <button onClick={handleAddPlant} disabled={isSaving || !newPlantName.trim()}
                className="flex-1 bg-[#2FF801] text-black font-bold rounded-lg py-2 text-sm disabled:opacity-50">
                {isSaving ? '...' : 'Hinzufügen'}
              </button>
              <button onClick={() => { setIsAddingPlant(false); setNewPlantName(''); }}
                className="px-4 py-2 text-sm text-[var(--muted-foreground)]">Abbrechen</button>
            </div>
          </div>
        )}

        <PlantCarousel
          plants={localPlants}
          isOwner={isOwner}
          onAddPlant={() => setIsAddingPlant(true)}
          onStatusAdvance={handleStatusAdvance}
        />

        <TimelineSection
          entries={localEntries}
          comments={localComments as any}
          onPhotoClick={() => {}}
        />

        <ReminderPanelCompact
          reminders={reminders as any[]}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/grows/grow-detail-client.tsx
git commit -m "feat(grows): wire up GrowDetailClient with all components

Full integration: header, quick actions, plant carousel, timeline,
reminders, log modal. Plant add flow, status advance, follow toggle.
Part of grow-detail-redesign."
```

---

## Task 9: Update `LogEntryModal` to support preselected type

**Files:**
- Modify: `src/components/grows/log-entry-modal.tsx`

- [ ] **Step 1: Add `defaultType` prop and auto-select when provided**

Add to Props interface:
```tsx
defaultType?: GrowEntryType | null;
```

After the `open` check in the modal body, if `defaultType` is set, auto-select that type on first render.

- [ ] **Step 2: Commit**

```bash
git add src/components/grows/log-entry-modal.tsx
git commit -m "feat(grows): add defaultType prop to LogEntryModal

Enables preselecting a log type from QuickActionBar.
Part of grow-detail-redesign."
```

---

## Task 10: Verify and test

- [ ] **Step 1: Run lint check**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run lint 2>&1 | head -40
```

Expected: No errors related to new components.

- [ ] **Step 2: Run a quick build check**

```bash
npm run build 2>&1 | tail -30
```

Expected: Next.js build completes without errors.

- [ ] **Step 3: Manual smoke test (browser)**

Open `/grows/[id]` (with a real grow ID or demo mode) and verify:
1. Header shows status, phase, day number
2. QuickActionBar is sticky
3. Plant carousel scrolls horizontally
4. Timeline entries expand on tap
5. Comments visible inside expanded entry
6. Reminders compact panel shows

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat(grows): complete grow detail redesign

Mobile-first layout: summary header, sticky quick actions,
horizontal plant carousel, inline-expand timeline entries,
compact reminders. Next.js 15 App Router.
Part of grow-detail-redesign."
```

---

## Self-Review Checklist

- [ ] Spec coverage: every section has a corresponding task
- [ ] No placeholder steps — every `git commit` step has the actual commit message
- [ ] `grow-detail-client.tsx` uses `useCallback` for stable callback references
- [ ] `timeline-entry.tsx` handles all 7 entry types with correct type narrowing
- [ ] `reminder-panel-compact.tsx` calls actual Supabase RPC `complete_reminder_and_repeat`
- [ ] Comments integrated flat into expanded timeline entry (per user correction)
- [ ] Follow button in header (per user correction)
- [ ] Harvest Certificate banner when `status === 'completed'` (per user correction)
- [ ] `LogEntryModal` supports `defaultType` preselection
