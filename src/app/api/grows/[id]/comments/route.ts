import { jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from '@/lib/supabase/client';

const COMMENTS_DISABLED_MESSAGE = 'Grow comments are disabled for closed beta';

export async function GET(request: Request, { params: _params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;

  return jsonError(COMMENTS_DISABLED_MESSAGE, 410, 'COMMENTS_DISABLED') as Response;
}

export async function POST(request: Request, { params: _params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;

  return jsonError(COMMENTS_DISABLED_MESSAGE, 410, 'COMMENTS_DISABLED') as Response;
}

export async function DELETE(request: Request, { params: _params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;

  return jsonError(COMMENTS_DISABLED_MESSAGE, 410, 'COMMENTS_DISABLED') as Response;
}
