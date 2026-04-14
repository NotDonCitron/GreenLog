import { NextResponse } from 'next/server';
import { addGrowLogEntry } from '@/lib/grows/actions';

export async function POST(request: Request) {
  return addGrowLogEntry(request);
}
