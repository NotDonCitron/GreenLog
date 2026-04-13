import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/consumption - List user's consumption logs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const strainId = searchParams.get('strain_id');
  const limit = parseInt(searchParams.get('limit') || '30');
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = createClient();

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
  const supabase = createClient();

  const {
    strain_id,
    consumption_method,
    amount_grams,
    subjective_notes,
    mood_before,
    mood_after,
    consumed_at
  } = await request.json();

  // Validate
  if (!consumption_method || !consumed_at) {
    return NextResponse.json(
      { error: 'consumption_method and consumed_at are required' },
      { status: 400 }
    );
  }

  const validMethods = ['vaporizer', 'joint', 'bong', 'pipe', 'edible', 'oil', 'topical', 'other'];
  if (!validMethods.includes(consumption_method)) {
    return NextResponse.json(
      { error: 'Invalid consumption_method' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('consumption_logs')
    .insert({
      strain_id: strain_id || null,
      consumption_method,
      amount_grams: amount_grams || null,
      subjective_notes: subjective_notes || null,
      mood_before: mood_before || null,
      mood_after: mood_after || null,
      consumed_at: new Date(consumed_at).toISOString()
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
