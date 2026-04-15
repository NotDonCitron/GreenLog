import { NextResponse } from 'next/server';
import { addGrowLogEntry } from '@/lib/grows/actions';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  // DEBUG: check auth state before calling server action
  try {
    const { userId, getToken } = await auth();
    const token = await getToken();
    console.log('[DEBUG /api/grows/log-entry] auth().userId:', userId, 'token exists:', !!token, 'token prefix:', token?.substring(0, 20));
  } catch (e: any) {
    console.error('[DEBUG /api/grows/log-entry] auth() threw:', e?.message);
  }
  return addGrowLogEntry(request);
}
