import { NextRequest, NextResponse } from 'next/server';
import { jsonSuccess, jsonError, authenticateRequest } from '@/lib/api-response';
import { getAuthenticatedClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// POST /api/grow-entries - Create a grow entry with EC/Wasser tracking
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const {
    grow_id,
    day_number,
    title,
    notes,
    image_url,
    height_cm,
    temperature,
    humidity,
    ph_value,
    ec_value,
    water_temperature,
    nutrient_dose
  } = await request.json();

  if (!grow_id) {
    return jsonError('grow_id is required', 400);
  }

  // Verify ownership
  const { data: grow, error: growError } = await supabase
    .from('grows')
    .select('user_id')
    .eq('id', grow_id)
    .single();

  if (growError || !grow) {
    return jsonError('Grow not found', 404);
  }

  if (grow.user_id !== user.id) {
    return jsonError('Forbidden', 403);
  }

  const { data, error } = await supabase
    .from('grow_entries')
    .insert({
      grow_id,
      day_number: day_number || null,
      title: title || null,
      notes: notes || null,
      image_url: image_url || null,
      height_cm: height_cm || null,
      temperature: temperature || null,
      humidity: humidity || null,
      ph_value: ph_value || null,
      ec_value: ec_value || null,
      water_temperature: water_temperature || null,
      nutrient_dose: nutrient_dose || null
    })
    .select()
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return jsonSuccess(data, 201);
}
