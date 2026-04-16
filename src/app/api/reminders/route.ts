import { NextRequest, NextResponse } from 'next/server';
import { jsonSuccess, jsonError, authenticateRequest } from '@/lib/api-response';
import { getAuthenticatedClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// GET /api/reminders - List user's reminders
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const growId = searchParams.get('grow_id');
  const status = searchParams.get('status'); // 'pending' | 'completed' | 'all'

  let query = supabase
    .from('grow_reminders')
    .select('*, grows(title, strain_id)')
    .order('due_date', { ascending: true });

  if (status === 'pending') {
    query = query.eq('is_completed', false);
  } else if (status === 'completed') {
    query = query.eq('is_completed', true);
  }
  // 'all' = no filter

  if (growId) {
    query = query.eq('grow_id', growId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/reminders - Create a reminder
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const {
    grow_id,
    reminder_type,
    title,
    notes,
    due_date,
    repeat_interval_days
  } = await request.json();

  // Validate
  if (!title || !due_date || !reminder_type) {
    return jsonError('title, due_date and reminder_type are required', 400);
  }

  const validTypes = ['water', 'nutrient', 'repot', 'ph_check', 'temp_check', 'defoliation', 'harvest', 'general'];
  if (!validTypes.includes(reminder_type)) {
    return jsonError('Invalid reminder_type', 400);
  }

  const { data, error } = await supabase
    .from('grow_reminders')
    .insert({
      grow_id,
      reminder_type,
      title,
      notes,
      due_date: new Date(due_date).toISOString(),
      repeat_interval_days: repeat_interval_days || null
    })
    .select()
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return jsonSuccess(data, 201);
}
