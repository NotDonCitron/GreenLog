import { NextResponse } from 'next/server';
import { addGrowLogEntry } from '@/lib/grows/actions';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  // DEBUG: return auth state in response for inspection
  try {
    const { userId, getToken } = await auth();
    const token = await getToken();
    const debug = {
      authUserId: userId,
      hasToken: !!token,
      tokenPrefix: token?.substring(0, 20),
    };
    console.log('[DEBUG /api/grows/log-entry]', JSON.stringify(debug));
    const result = await addGrowLogEntry(request);
    // If 401, inject debug info into the error response
    if (result.status === 401) {
      const body = await result.json().catch(() => ({}));
      return NextResponse.json({ ...body, _debug: debug }, { status: 401 });
    }
    return result;
  } catch (e: any) {
    console.error('[DEBUG /api/grows/log-entry] auth() threw:', e?.message);
    return NextResponse.json({ error: { message: e?.message }, _debug: { authError: true } }, { status: 401 });
  }
}
