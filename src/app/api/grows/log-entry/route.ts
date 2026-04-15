import { NextResponse } from 'next/server';
import { addGrowLogEntry } from '@/lib/grows/actions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    // Check for Authorization header token first (passed from browser)
    const authHeader = request.headers.get('Authorization');
    let supabase;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      supabase = await getAuthenticatedClient(token);
    } else {
      // Fallback to cookie-based auth
      supabase = await createServerSupabaseClient();
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    return await addGrowLogEntry(request, { userId: user.id, supabase });
  } catch (e: any) {
    console.error('[DEBUG /api/grows/log-entry]', e?.message);
    return NextResponse.json({ error: { message: e?.message } }, { status: 401 });
  }
}
