---
phase: 6
plan: 01
type: feature
wave: 1
depends_on: []
files_modified:
  - src/lib/types.ts
  - src/lib/grows/actions.ts
autonomous: true
requirements:
  - GROW-04
  - GROW-07
  - GROW-15
---

## Plan 01: Server Actions & TypeScript Types

### Context

The SQL migration `20260412000000_grow_diary_module_abc.sql` is already committed. This plan implements the TypeScript types and server actions for the Grow-Diary feature.

### Tasks

#### Task 01: Extend TypeScript Types for Grow-Diary

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/lib/types.ts (existing Grow interface, add Plant/GrowEntry types)
</read_first>

<acceptance_criteria>
- `grep -n "plant_status" src/lib/types.ts` returns `plant_status` type definition
- `grep -n "Plant\|GrowEntry\|GrowMilestone\|GrowPreset\|GrowComment" src/lib/types.ts` returns all 5 new interfaces
- `entry_type` union in `GrowEntry` includes: `'watering' | 'feeding' | 'note' | 'photo' | 'ph_ec' | 'dli' | 'milestone'`
- `Plant` interface has: `id, grow_id, user_id, strain_id, plant_name, status, planted_at, harvested_at`
- `GrowEntry` extended with: `plant_id, entry_type, content (JSONB), entry_date`
</acceptance_criteria>

<action>
Add to `src/lib/types.ts`:

```typescript
export type PlantStatus = 'seedling' | 'vegetative' | 'flowering' | 'flushing' | 'harvested' | 'destroyed';

export interface Plant {
  id: string;
  grow_id: string;
  user_id: string;
  strain_id: string | null;
  plant_name: string;
  status: PlantStatus;
  planted_at: string;
  harvested_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GrowEntryType = 'watering' | 'feeding' | 'note' | 'photo' | 'ph_ec' | 'dli' | 'milestone';

// JSONB content per entry_type
export interface WateringContent { amount_liters: number; }
export interface FeedingContent { nutrient: string; amount: string; ec?: number; }
export interface NoteContent { note_text: string; }
export interface PhotoContent { photo_url: string; caption?: string; }
export interface PhEcContent { ph: number; ec: number; }
export interface DliContent { ppfd: number; light_hours: number; dli: number; }
export interface MilestoneContent { milestone_phase: string; notes?: string; }

export interface GrowEntry {
  id: string;
  grow_id: string;
  user_id: string;
  plant_id?: string | null;
  entry_type?: GrowEntryType | null;
  content?: Record<string, unknown>;
  entry_date?: string;
  day_number?: number;
  title?: string;
  notes?: string;
  image_url?: string;
  height_cm?: number;
  temperature?: number;
  humidity?: number;
  ph_value?: number;
  created_at: string;
}

export interface GrowMilestone {
  id: string;
  grow_id: string;
  phase: 'germination' | 'vegetation' | 'flower' | 'flush' | 'harvest';
  started_at: string;
  ended_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface GrowPreset {
  id: string;
  name: string;
  grow_mode: 'autoflower' | 'photoperiod';
  light_cycle: string;
  estimated_veg_days: number;
  estimated_flower_days: number;
  ppfd_value?: number | null;
  is_public: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface GrowComment {
  id: string;
  grow_entry_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: ProfileRow;
}

export interface GrowFollow {
  id: string;
  user_id: string;
  grow_id: string;
  created_at: string;
}

// Extend Grow interface
export interface Grow {
  id: string;
  user_id: string;
  organization_id?: string;
  strain_id?: string | null;
  title: string;
  grow_type: 'indoor' | 'outdoor' | 'greenhouse';
  status: 'active' | 'completed' | 'archived';
  start_date: string;
  harvest_date?: string | null;
  is_public: boolean;
  strains?: { name: string } | null;
  plants?: Plant[];
}
```

#### Task 02: Implement Server Actions

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/lib/api-response.ts (jsonSuccess, jsonError, authenticateRequest)
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/api/badges/check/route.ts (pattern for auth + server action style)
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/lib/supabase/client.ts (getAuthenticatedClient)
</read_first>

<acceptance_criteria>
- File `src/lib/grows/actions.ts` exists with all 4 exported async functions
- `createGrow` returns `{ data: Grow, error: null }` or `{ data: null, error: {...} }`
- `addPlantToGrow` throws if user already has 3 active plants (KCanG check)
- `updatePlantStatus` only allows valid status transitions
- `addGrowLogEntry` validates entry_type and content shape
- All actions use `authenticateRequest` to get user + supabase client
- Server-side only — no `'use client'` directive
</acceptance_criteria>

<action>
Create `src/lib/grows/actions.ts`:

```typescript
'use server';

import { getAuthenticatedClient } from '@/lib/supabase/client';
import { jsonSuccess, jsonError, authenticateRequest } from '@/lib/api-response';
import type { GrowEntryType } from '@/lib/types';

// DLI = PPFD × LightHours × 0.0036
export function calculateDLI(ppfd: number, lightHours: number): number {
  return Math.round(ppfd * lightHours * 0.0036 * 100) / 100;
}

// Validation for entry_type content shapes
function validateEntryContent(entryType: GrowEntryType, content: Record<string, unknown>): boolean {
  switch (entryType) {
    case 'watering':
      return typeof content.amount_liters === 'number' && content.amount_liters > 0;
    case 'feeding':
      return typeof content.nutrient === 'string' && content.amount?.length > 0;
    case 'note':
      return typeof content.note_text === 'string';
    case 'photo':
      return typeof content.photo_url === 'string';
    case 'ph_ec':
      return typeof content.ph === 'number' && typeof content.ec === 'number';
    case 'dli':
      return typeof content.ppfd === 'number' && typeof content.light_hours === 'number';
    case 'milestone':
      return typeof content.milestone_phase === 'string';
    default:
      return false;
  }
}

export async function createGrow(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  try {
    const body = await request.json();
    const { title, strain_id, grow_type, start_date, is_public = true } = body;

    if (!title?.trim()) return jsonError('Title is required', 400) as Response;
    if (!grow_type || !['indoor', 'outdoor', 'greenhouse'].includes(grow_type)) {
      return jsonError('Valid grow_type is required', 400) as Response;
    }

    const { data: grow, error } = await supabase
      .from('grows')
      .insert({
        user_id: user.id,
        title: title.trim(),
        strain_id: strain_id || null,
        grow_type,
        start_date: start_date || new Date().toISOString().split('T')[0],
        is_public,
        status: 'active',
      })
      .select()
      .single();

    if (error) return jsonError('Failed to create grow', 500, error.code, error.message) as Response;
    return jsonSuccess({ grow }) as Response;
  } catch (e) {
    console.error('createGrow error:', e);
    return jsonError('Invalid request body', 400) as Response;
  }
}

export async function addPlantToGrow(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  try {
    const body = await request.json();
    const { grow_id, plant_name, strain_id } = body;

    if (!grow_id) return jsonError('grow_id is required', 400) as Response;
    if (!plant_name?.trim()) return jsonError('plant_name is required', 400) as Response;

    // KCanG § 9: Check active plant count (seedling/vegetative/flowering/flushing)
    const { count: activeCount } = await supabase
      .from('plants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['seedling', 'vegetative', 'flowering', 'flushing']);

    if (activeCount !== null && activeCount >= 3) {
      return jsonError(
        'KCanG Compliance Error: Max 3 active plants allowed per user (§ 9 KCanG).',
        400,
        'KCANG_PLANT_LIMIT',
        { activeCount }
      ) as Response;
    }

    const { data: plant, error } = await supabase
      .from('plants')
      .insert({
        grow_id,
        user_id: user.id,
        plant_name: plant_name.trim(),
        strain_id: strain_id || null,
        status: 'seedling',
        planted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return jsonError('Failed to add plant', 500, error.code, error.message) as Response;
    return jsonSuccess({ plant }) as Response;
  } catch (e) {
    console.error('addPlantToGrow error:', e);
    return jsonError('Invalid request body', 400) as Response;
  }
}

export async function updatePlantStatus(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  try {
    const body = await request.json();
    const { plant_id, status } = body;
    const validStatuses = ['seedling', 'vegetative', 'flowering', 'flushing', 'harvested', 'destroyed'];

    if (!plant_id) return jsonError('plant_id is required', 400) as Response;
    if (!status || !validStatuses.includes(status)) {
      return jsonError(`Valid status required: ${validStatuses.join(', ')}`, 400) as Response;
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('plants')
      .select('user_id, status')
      .eq('id', plant_id)
      .single();

    if (!existing) return jsonError('Plant not found', 404) as Response;
    if (existing.user_id !== user.id) return jsonError('Forbidden', 403) as Response;

    // KCanG § 9: Check limit when moving TO active status
    if (['seedling', 'vegetative', 'flowering', 'flushing'].includes(status) &&
        !['seedling', 'vegetative', 'flowering', 'flushing'].includes(existing.status)) {
      const { count: activeCount } = await supabase
        .from('plants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['seedling', 'vegetative', 'flowering', 'flushing']);

      if (activeCount !== null && activeCount >= 3) {
        return jsonError(
          'KCanG Compliance Error: Max 3 active plants allowed per user (§ 9 KCanG).',
          400,
          'KCANG_PLANT_LIMIT',
          { activeCount }
        ) as Response;
      }
    }

    const updates: Record<string, unknown> = { status };
    if (status === 'harvested') updates.harvested_at = new Date().toISOString();

    const { data: plant, error } = await supabase
      .from('plants')
      .update(updates)
      .eq('id', plant_id)
      .select()
      .single();

    if (error) return jsonError('Failed to update plant', 500, error.code, error.message) as Response;
    return jsonSuccess({ plant }) as Response;
  } catch (e) {
    console.error('updatePlantStatus error:', e);
    return jsonError('Invalid request body', 400) as Response;
  }
}

export async function addGrowLogEntry(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  try {
    const body = await request.json();
    const { grow_id, plant_id, entry_type, content, entry_date } = body;

    if (!grow_id) return jsonError('grow_id is required', 400) as Response;
    if (!entry_type) return jsonError('entry_type is required', 400) as Response;

    const validTypes: GrowEntryType[] = ['watering', 'feeding', 'note', 'photo', 'ph_ec', 'dli', 'milestone'];
    if (!validTypes.includes(entry_type)) {
      return jsonError(`entry_type must be one of: ${validTypes.join(', ')}`, 400) as Response;
    }

    if (content && !validateEntryContent(entry_type, content)) {
      return jsonError(`Invalid content shape for entry_type "${entry_type}"`, 400) as Response;
    }

    // Verify user owns this grow
    const { data: grow } = await supabase
      .from('grows')
      .select('user_id')
      .eq('id', grow_id)
      .single();

    if (!grow) return jsonError('Grow not found', 404) as Response;
    if (grow.user_id !== user.id) return jsonError('Forbidden', 403) as Response;

    // Calculate DLI if entry_type is dli
    let finalContent = content || {};
    if (entry_type === 'dli' && content?.ppfd && content?.light_hours) {
      finalContent = { ...content, dli: calculateDLI(content.ppfd, content.light_hours) };
    }

    const { data: entry, error } = await supabase
      .from('grow_entries')
      .insert({
        grow_id,
        user_id: user.id,
        plant_id: plant_id || null,
        entry_type,
        content: finalContent,
        entry_date: entry_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) return jsonError('Failed to add log entry', 500, error.code, error.message) as Response;
    return jsonSuccess({ entry }) as Response;
  } catch (e) {
    console.error('addGrowLogEntry error:', e);
    return jsonError('Invalid request body', 400) as Response;
  }
}
```

#### Task 03: Create `src/lib/grows/index.ts` barrel export

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/lib/badges.ts (barrel export pattern)
</read_first>

<acceptance_criteria>
- `grep "export.*from.*actions" src/lib/grows/index.ts` returns all 4 server action imports
- `ls src/lib/grows/` shows `actions.ts` and `index.ts`
</acceptance_criteria>

<action>
Create `src/lib/grows/index.ts`:

```typescript
export { createGrow, addPlantToGrow, updatePlantStatus, addGrowLogEntry, calculateDLI } from './actions';
```
</action>

### Dependencies

- SQL migration `20260412000000_grow_diary_module_abc.sql` must be applied first
- Supabase RLS policies are enforced by the server actions

### Verification

```bash
grep -n "PlantStatus\|GrowEntryType\|interface Plant\|interface GrowEntry" src/lib/types.ts
grep -n "export async function createGrow\|export async function addPlantToGrow\|export async function updatePlantStatus\|export async function addGrowLogEntry" src/lib/grows/actions.ts
```