'use server';

import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedClient } from '@/lib/supabase/client';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { calculateDLI, validateEntryContent } from './utils';

async function getServerUser() {
  const { userId, getToken } = await auth();
  if (!userId) return null;
  // Get Clerk's Supabase JWT token for RLS
  const supabaseToken = await getToken({ template: 'supabase' });
  const supabase = await getAuthenticatedClient(supabaseToken || '');
  return { userId, supabase };
}

type CreateGrowInput = {
  title: string;
  strain_id: string | null;
  grow_type: string;
  start_date: string;
  is_public: boolean;
};

type ServerActionResult = {
  success: boolean;
  data?: { grow: unknown };
  error?: { message: string; code?: string; details?: unknown };
};

export async function createGrow(input: CreateGrowInput): Promise<ServerActionResult> {
  const server = await getServerUser();
  if (!server) return { success: false, error: { message: 'Unauthorized' } };
  const { userId, supabase } = server;

  try {
    const { title, strain_id, grow_type, start_date, is_public = true } = input;

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
        organization_id: null,
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

export async function addGrowLogEntry(request: Request): Promise<Response> {
  const server = await getServerUser();
  if (!server) return jsonError('Unauthorized', 401) as unknown as Response;
  const { userId, supabase } = server;

  try {
    const body = await request.json();
    const { grow_id, plant_id, entry_type, content, entry_date } = body;

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
      .select('user_id')
      .eq('id', grow_id)
      .single();

    if (!grow) return jsonError('Grow not found', 404) as Response;
    if (grow.user_id !== userId) return jsonError('Forbidden', 403) as Response;

    // Calculate DLI if entry_type is dli
    let finalContent = content || {};
    if (entry_type === 'dli' && content?.ppfd && content?.light_hours) {
      finalContent = { ...content, dli: calculateDLI(content.ppfd, content.light_hours) };
    }

    const { data: entry, error } = await supabase
      .from('grow_entries')
      .insert({
        grow_id,
        user_id: userId,
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
