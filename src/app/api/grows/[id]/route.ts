import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedClient } from '@/lib/supabase/client';

const VALID_STATUSES = new Set(['active', 'completed', 'abandoned']);
const VALID_GROW_TYPES = new Set(['indoor', 'outdoor', 'greenhouse']);

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { message, details } }, { status });
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: growId } = await params;
    const authHeader = request.headers.get('Authorization');
    const supabase = authHeader?.startsWith('Bearer ')
      ? await getAuthenticatedClient(authHeader.slice(7))
      : await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonError('Unauthorized', 401);

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if ('title' in body) {
      const title = normalizeString(body.title);
      if (!title) return jsonError('Title is required', 400);
      if (title.length > 120) return jsonError('Title must be 120 characters or fewer', 400);
      updates.title = title;
    }

    if ('grow_notes' in body) {
      if (body.grow_notes === null || body.grow_notes === '') {
        updates.grow_notes = null;
      } else {
        const growNotes = normalizeString(body.grow_notes);
        if (growNotes === undefined) return jsonError('grow_notes must be a string or null', 400);
        if (growNotes.length > 2000) return jsonError('grow_notes must be 2000 characters or fewer', 400);
        updates.grow_notes = growNotes;
      }
    }

    if ('is_public' in body) {
      if (typeof body.is_public !== 'boolean') return jsonError('is_public must be a boolean', 400);
      updates.is_public = body.is_public;
    }

    if ('status' in body) {
      if (typeof body.status !== 'string' || !VALID_STATUSES.has(body.status)) {
        return jsonError('status must be active, completed, or abandoned', 400);
      }
      updates.status = body.status;
    }

    if ('grow_type' in body) {
      if (typeof body.grow_type !== 'string' || !VALID_GROW_TYPES.has(body.grow_type)) {
        return jsonError('grow_type must be indoor, outdoor, or greenhouse', 400);
      }
      updates.grow_type = body.grow_type;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError('No valid grow fields provided', 400);
    }

    const { data: existingGrow, error: growError } = await supabase
      .from('grows')
      .select('id, user_id')
      .eq('id', growId)
      .single();

    if (growError || !existingGrow) return jsonError('Grow not found', 404);
    if (existingGrow.user_id !== user.id) return jsonError('Forbidden', 403);

    const { data: grow, error: updateError } = await supabase
      .from('grows')
      .update(updates)
      .eq('id', growId)
      .select('*, strains(id, name, slug)')
      .single();

    if (updateError) {
      return jsonError('Failed to update grow', 500, updateError.message);
    }

    return NextResponse.json({ data: { grow } });
  } catch (error) {
    console.error('[PATCH /api/grows/[id]]', error);
    return jsonError('Invalid request body', 400);
  }
}
