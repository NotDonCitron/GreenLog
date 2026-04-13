import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// PATCH /api/reminders/[id] - Update a reminder (complete, reschedule)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient();
  
  const body = await request.json();
  const { is_completed, due_date, title, notes, repeat_interval_days } = body;

  // If completing a reminder with repeat, also create next
  if (is_completed === true) {
    // Use the DB function to handle completion + repeat
    const { data, error } = await supabase
      .rpc('complete_reminder_and_repeat', { p_reminder_id: id });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      next_reminder_id: data 
    });
  }

  // Regular update
  const updates: Record<string, unknown> = {};
  if (due_date !== undefined) updates.due_date = new Date(due_date).toISOString();
  if (title !== undefined) updates.title = title;
  if (notes !== undefined) updates.notes = notes;
  if (repeat_interval_days !== undefined) updates.repeat_interval_days = repeat_interval_days;
  if (is_completed !== undefined) {
    updates.is_completed = is_completed;
    if (is_completed) updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('grow_reminders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// DELETE /api/reminders/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient();

  const { error } = await supabase
    .from('grow_reminders')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
