import { NextRequest, NextResponse } from 'next/server';
import { jsonSuccess, jsonError, authenticateRequest } from '@/lib/api-response';
import {
  isQuickLogStatus,
  normalizeQuickLogEffects,
  normalizeQuickLogSideEffects,
} from '@/lib/quick-log';
import { getAuthenticatedClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// GET /api/consumption - List user's consumption logs
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const strainId = searchParams.get('strain_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('consumption_logs')
    .select('*, strains(name, type, image_url)')
    .order('consumed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (strainId) {
    query = query.eq('strain_id', strainId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get total count
  let countQuery = supabase
    .from('consumption_logs')
    .select('id', { count: 'exact', head: true });

  if (strainId) {
    countQuery = countQuery.eq('strain_id', strainId);
  }

  const { count } = await countQuery;

  return NextResponse.json({ 
    data, 
    total: count || 0,
    limit,
    offset 
  });
}

// POST /api/consumption - Log a consumption
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const {
    strain_id,
    consumption_method,
    amount_grams,
    subjective_notes,
    mood_before,
    mood_after,
    consumed_at,
    effect_chips,
    side_effects,
    overall_rating,
    private_status,
    private_note,
    setting_context
  } = await request.json();

  // Validate
  if (!consumption_method || !consumed_at) {
    return jsonError('consumption_method and consumed_at are required', 400);
  }

  const validMethods = ['vaporizer', 'joint', 'bong', 'pipe', 'edible', 'oil', 'topical', 'other'];
  if (!validMethods.includes(consumption_method)) {
    return jsonError('Invalid consumption_method', 400);
  }

  const normalizedEffects = normalizeQuickLogEffects(effect_chips);
  if (
    effect_chips !== undefined &&
    (!Array.isArray(effect_chips) || normalizedEffects.length !== effect_chips.length)
  ) {
    return jsonError('effect_chips contains unsupported values', 400);
  }

  const normalizedSideEffects = normalizeQuickLogSideEffects(side_effects);
  if (
    side_effects !== undefined &&
    (!Array.isArray(side_effects) || normalizedSideEffects.length !== side_effects.length)
  ) {
    return jsonError('side_effects contains unsupported values', 400);
  }

  if (overall_rating !== undefined && overall_rating !== null) {
    if (!Number.isInteger(overall_rating) || overall_rating < 1 || overall_rating > 5) {
      return jsonError('overall_rating must be an integer between 1 and 5', 400);
    }
  }

  if (private_status !== undefined && private_status !== null && !isQuickLogStatus(private_status)) {
    return jsonError('private_status is invalid', 400);
  }

  const { data, error } = await supabase
    .from('consumption_logs')
    .insert({
      user_id: user.id,
      strain_id: strain_id || null,
      consumption_method,
      amount_grams: amount_grams || null,
      subjective_notes: subjective_notes || null,
      mood_before: mood_before || null,
      mood_after: mood_after || null,
      consumed_at: new Date(consumed_at).toISOString(),
      effect_chips: normalizedEffects,
      side_effects: normalizedSideEffects,
      overall_rating: overall_rating ?? null,
      private_status: private_status || null,
      private_note: private_note?.trim() || null,
      setting_context: setting_context?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return jsonSuccess(data, 201);
}
