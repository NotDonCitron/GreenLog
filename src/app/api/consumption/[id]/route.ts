import { NextRequest, NextResponse } from 'next/server';
import { jsonSuccess, jsonError, authenticateRequest } from '@/lib/api-response';
import { getAuthenticatedClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const { id } = await params;

  const { data, error } = await supabase
    .from('consumption_logs')
    .select('*, strains(name, type, image_url)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data) {
    return jsonError('Consumption log not found', 404);
  }

  return jsonSuccess(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const { id } = await params;

  const body = await request.json();
  const allowedFields = [
    'consumption_method', 'amount_grams', 'subjective_notes',
    'mood_before', 'mood_after', 'consumed_at'
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'consumed_at') {
        updates[field] = new Date(body[field]).toISOString();
      } else {
        updates[field] = body[field];
      }
    }
  }

  const { data, error } = await supabase
    .from('consumption_logs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data) {
    return jsonError('Consumption log not found', 404);
  }

  return jsonSuccess(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const { id } = await params;

  const { error } = await supabase
    .from('consumption_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return jsonError(error.message, 500);
  }

  return jsonSuccess({ success: true });
}
