import { NextResponse } from 'next/server';
import { addGrowLogEntry } from '@/lib/grows/actions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    return await addGrowLogEntry(request);
  } catch (e: any) {
    console.error('[DEBUG /api/grows/log-entry]', e?.message);
    return NextResponse.json({ error: { message: e?.message } }, { status: 401 });
  }
}
