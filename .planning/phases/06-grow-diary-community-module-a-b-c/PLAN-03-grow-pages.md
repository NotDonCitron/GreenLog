---
phase: 6
plan: 03
type: feature
wave: 3
depends_on:
  - PLAN-01-server-actions-types
  - PLAN-02-ui-components
files_modified:
  - src/app/grows/page.tsx
  - src/app/grows/[id]/page.tsx
  - src/app/grows/new/page.tsx
  - src/app/grows/explore/page.tsx
  - src/app/grows/explore/[id]/page.tsx
autonomous: true
requirements:
  - GROW-10
  - GROW-11
  - GROW-12
  - GROW-15
---

## Plan 03: Grow-Diary Pages (Main, Detail, New, Explore)

### Context

Server actions and UI components are implemented. This plan builds all grow-related pages.

### Tasks

#### Task 01: Update Main Grows Page (`/grows`)

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/grows/page.tsx (existing page to update)
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/feed/page.tsx (feed URL state pattern)
</read_first>

<acceptance_criteria>
- Page fetches user's grows from Supabase ordered by `created_at DESC`
- Shows plant count per grow (plants where status IN active)
- Active grows have green status badge, completed have muted
- Empty state when no grows exist
- Link to `/grows/explore` for public grows
- `'use client'` directive at top
</acceptance_criteria>

<action>
Update `src/app/grows/page.tsx` to include plant tracking from `plants` table.

#### Task 02: Grow Detail Page (`/grows/[id]`)

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/grows/[id]/page.tsx (existing page to update)
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/grows/index.ts (import components)
</read_first>

<acceptance_criteria>
- Shows all plants for this grow (from `plants` table)
- Each plant shows: name, status badge (PhaseBadge), planted date
- Status color coding: seedling/vegetative/flowering/flushing = active colors; harvested/destroyed = muted
- LogEntryModal button per plant or global
- Plant status update buttons (advance to next phase)
- Timeline view of grow_milestones (phase badges)
- grow_entries grouped by entry_type with icons
- PlantLimitWarning shown when user tries to add 4th plant
- Privacy toggle for is_public (switch component)
- Follow/unfollow grow functionality
- Comments section at bottom (flat comments from grow_comments)
- Compliance disclaimer visible if grow is public
</acceptance_criteria>

<action>
Major update to `src/app/grows/[id]/page.tsx` with full plant tracker, timeline, and log entries.

#### Task 03: New Grow Page (`/grows/new`)

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/grows/new/page.tsx (existing page to check)
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/strains/strain-card.tsx (strain selection UI)
</read_first>

<acceptance_criteria>
- Create grow form: title, grow_type (indoor/outdoor/greenhouse), strain selection
- Start date picker
- is_public toggle (default true for explore visibility)
- On submit: calls `createGrow` server action
- Redirect to new grow detail page on success
- Error handling with toast
- `'use client'` directive at top
</acceptance_criteria>

<action>
Update `src/app/grows/new/page.tsx` to use `createGrow` server action instead of direct Supabase insert.

#### Task 04: Explore Grows Page (`/grows/explore`)

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/community/page.tsx (community feed pattern)
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/social/activity-card.tsx
</read_first>

<acceptance_criteria>
- Public grows list from `grows WHERE is_public = true`
- GrowCard showing: title, grow_type, strain name, status, plant count, start_date
- Filter by grow_type (indoor/outdoor/greenhouse)
- Search by grow title
- Paginated (20 per page)
- Compliance disclaimer at top: "Wissensaustausch für den legalen Eigenanbau nach KCanG. Der Handel oder die Weitergabe von privat angebautem Cannabis an Dritte ist gesetzlich verboten (§ 9 Abs. 2 KCanG)."
- Link to individual grow detail at `/grows/explore/[id]`
- `'use client'` directive at top
</acceptance_criteria>

<action>
Create `src/app/grows/explore/page.tsx` with public grows feed.

#### Task 05: Explore Grow Detail Page (`/grows/explore/[id]`)

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/grows/[id]/page.tsx (reference for detail layout)
</read_first>

<acceptance_criteria>
- Read-only view of public grow (must check `is_public = true`)
- Shows: title, grow_type, strain, all plants with PhaseBadge, all milestones
- Shows all grow_entries (photo entries have image)
- Flat comments section (read-only for non-followers, write for followers)
- Follow grow button (creates grow_follows entry)
- Follower count display
- Same compliance disclaimer as explore page
- Redirects to 404 if grow is not public and user is not owner
- `'use client'` directive at top
</acceptance_criteria>

<action>
Create `src/app/grows/explore/[id]/page.tsx` with read-only public grow view.

#### Task 06: KCanG § 9 Compliance Disclaimer Component

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/(legal)/datenschutz/page.tsx (disclaimer styling)
</read_first>

<acceptance_criteria>
- Function `KCanGDisclaimer()` default export from `src/components/grows/kcan-g-disclaimer.tsx`
- Exact German text: "Wissensaustausch für den legalen Eigenanbau nach KCanG. Der Handel oder die Weitergabe von privat angebautem Cannabis an Dritte ist gesetzlich verboten (§ 9 Abs. 2 KCanG)."
- Small yellow/amber warning box style
- Used at top of `/grows/explore` and `/grows/explore/[id]`
- `'use client'` directive at top
</acceptance_criteria>

<action>
Create `src/components/grows/kcan-g-disclaimer.tsx`:

```typescript
'use client';

import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function KCanGDisclaimer() {
  return (
    <Card className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-300 font-medium leading-relaxed">
          Wissensaustausch für den legalen Eigenanbau nach KCanG. Der Handel oder die Weitergabe von privat angebautem Cannabis an Dritte ist gesetzlich verboten (§ 9 Abs. 2 KCanG).
        </p>
      </div>
    </Card>
  );
}
```

### Verification

```bash
grep -l "KCanGDisclaimer\|LogEntryModal\|PlantLimitWarning" src/app/grows/**/*.tsx
grep "KCanG" src/app/grows/explore/page.tsx
```