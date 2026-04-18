'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { calculateDLI, validateEntryContent } from './utils';

async function getServerUser() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.error('[getServerUser] No user from Supabase:', error?.message);
      return null;
    }
    return { userId: user.id, supabase };
  } catch (e: any) {
    console.error('[getServerUser] error:', e?.message);
    return null;
  }
}

type CreateGrowInput = {
  title: string;
  strain_id: string | null;
  grow_type: string;
  start_date: string;
  is_public: boolean;
  accessToken?: string;
};

type ServerActionResult = {
  success: boolean;
  data?: { grow: unknown };
  error?: { message: string; code?: string; details?: unknown };
};

function dateOnlyToUtcTimestamp(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function calculateGrowDayNumber(startDate: string | null | undefined, entryDate: string): number | null {
  if (!startDate) return null;

  const startTime = dateOnlyToUtcTimestamp(startDate);
  const entryTime = dateOnlyToUtcTimestamp(entryDate);

  if (Number.isNaN(startTime) || Number.isNaN(entryTime)) return null;

  const diffDays = Math.floor((entryTime - startTime) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

function normalizePlantIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0)));
}

export async function createGrow(input: CreateGrowInput): Promise<ServerActionResult> {
  const { accessToken, ...growData } = input;

  let userId: string;
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;

  if (accessToken) {
    // Use access token passed from browser (stored in localStorage by Supabase client)
    const { getAuthenticatedClient } = await import('@/lib/supabase/client');
    const client = await getAuthenticatedClient(accessToken);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { success: false, error: { message: 'Unauthorized' } };
    userId = user.id;
    supabase = client;
  } else {
    // Fallback to cookie-based auth (for internal/server-to-server calls)
    const server = await getServerUser();
    if (!server) return { success: false, error: { message: 'Unauthorized' } };
    userId = server.userId;
    supabase = server.supabase;
  }

  try {
    const { title, strain_id, grow_type, start_date, is_public = true } = growData;

    if (!title?.trim()) return { success: false, error: { message: 'Title is required' } };
    if (!grow_type || !['indoor', 'outdoor', 'greenhouse'].includes(grow_type)) {
      return { success: false, error: { message: 'Valid grow_type is required' } };
    }

    console.log('[createGrow] Attempting insert:', { userId, title: title.trim(), strain_id, grow_type, start_date, is_public });

    const { data: grow, error } = await supabase
      .from('grows')
      .insert({
        user_id: userId,
        title: title.trim(),
        strain_id: strain_id || null,
        grow_type,
        start_date: start_date || new Date().toISOString().split('T')[0],
        is_public,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('[createGrow] Supabase error:', JSON.stringify(error, null, 2));
      return { success: false, error: { message: 'Failed to create grow', code: error.code, details: error.message } };
    }
    return { success: true, data: { grow } };
  } catch (e) {
    console.error('createGrow error:', e);
    return { success: false, error: { message: 'Invalid request body' } };
  }
}

export async function addPlantToGrow(request: Request): Promise<Response> {
  const server = await getServerUser();
  if (!server) return jsonError('Unauthorized', 401) as unknown as Response;
  const { userId, supabase } = server;

  try {
    const body = await request.json();
    const { grow_id, plant_name, strain_id } = body;

    if (!grow_id) return jsonError('grow_id is required', 400) as Response;
    if (!plant_name?.trim()) return jsonError('plant_name is required', 400) as Response;

    // KCanG § 9: Check active plant count (seedling/vegetative/flowering/flushing)
    const { count: activeCount } = await supabase
      .from('plants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
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
        user_id: userId,
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
  const server = await getServerUser();
  if (!server) return jsonError('Unauthorized', 401) as unknown as Response;
  const { userId, supabase } = server;

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
    if (existing.user_id !== userId) return jsonError('Forbidden', 403) as Response;

    // KCanG § 9: Check limit when moving TO active status
    if (['seedling', 'vegetative', 'flowering', 'flushing'].includes(status) &&
        !['seedling', 'vegetative', 'flowering', 'flushing'].includes(existing.status)) {
      const { count: activeCount } = await supabase
        .from('plants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
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

export async function addGrowLogEntry(request: Request, preAuth?: { userId: string; supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> }): Promise<Response> {
  let userId: string;
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;

  if (preAuth) {
    userId = preAuth.userId;
    supabase = preAuth.supabase;
  } else {
    const server = await getServerUser();
    if (!server) return jsonError('Unauthorized', 401) as unknown as Response;
    userId = server.userId;
    supabase = server.supabase;
  }

  try {
    const body = await request.json();
    const { grow_id, plant_id, entry_type, content, entry_date, affected_plant_ids } = body;

    if (!grow_id) return jsonError('grow_id is required', 400) as Response;
    if (!entry_type) return jsonError('entry_type is required', 400) as Response;

    const validTypes = ['watering', 'feeding', 'note', 'photo', 'ph_ec', 'dli', 'milestone'];
    if (!validTypes.includes(entry_type)) {
      return jsonError(`entry_type must be one of: ${validTypes.join(', ')}`, 400) as Response;
    }

    if (content && !validateEntryContent(entry_type, content)) {
      return jsonError(`Invalid content shape for entry_type "${entry_type}"`, 400) as Response;
    }

    // Verify user owns this grow
    const { data: grow } = await supabase
      .from('grows')
      .select('user_id, organization_id, start_date')
      .eq('id', grow_id)
      .single();

    if (!grow) return jsonError('Grow not found', 404) as Response;
    if (grow.user_id !== userId) return jsonError('Forbidden', 403) as Response;

    const affectedPlantIds = normalizePlantIds(affected_plant_ids);
    if (typeof plant_id === 'string' && plant_id.length > 0 && affectedPlantIds.length === 0) {
      affectedPlantIds.push(plant_id);
    }

    if (affectedPlantIds.length > 0) {
      const { data: matchingPlants, error: plantsError } = await supabase
        .from('plants')
        .select('id')
        .eq('grow_id', grow_id)
        .eq('user_id', userId)
        .in('id', affectedPlantIds);

      if (plantsError) return jsonError('Failed to validate selected plants', 500, plantsError.code, plantsError.message) as Response;
      if ((matchingPlants ?? []).length !== affectedPlantIds.length) {
        return jsonError('One or more selected plants are invalid for this grow', 400) as Response;
      }
    }

    // Calculate DLI if entry_type is dli
    let finalContent = content || {};
    if (entry_type === 'dli' && content?.ppfd && content?.light_hours) {
      finalContent = { ...content, dli: calculateDLI(content.ppfd, content.light_hours) };
    }
    if (affectedPlantIds.length > 0) {
      finalContent = { ...finalContent, affected_plant_ids: affectedPlantIds };
    }

    const finalEntryDate = entry_date || new Date().toISOString().split('T')[0];
    const dayNumber = calculateGrowDayNumber(grow.start_date, finalEntryDate);
    const entryPlantId = affectedPlantIds.length === 1 ? affectedPlantIds[0] : null;

    const { data: entry, error } = await supabase
      .from('grow_entries')
      .insert({
        grow_id,
        organization_id: grow.organization_id,
        user_id: userId,
        plant_id: entryPlantId,
        entry_type,
        content: finalContent,
        entry_date: finalEntryDate,
        day_number: dayNumber,
      })
      .select()
      .single();

    if (error) {
      console.error('[addGrowLogEntry] Supabase error:', JSON.stringify(error));
      return jsonError('Failed to add log entry', 500, error.code, error.message) as Response;
    }
    return jsonSuccess({ entry }) as Response;
  } catch (e: any) {
    console.error('[addGrowLogEntry] CATCH error:', e?.message);
    return jsonError('Invalid request body', 400) as Response;
  }
}
