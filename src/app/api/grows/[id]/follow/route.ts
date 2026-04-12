import { jsonSuccess, jsonError, authenticateRequest } from '@/lib/api-response';
import { getAuthenticatedClient } from '@/lib/supabase/client';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;
  const { id: growId } = await params;

  // Verify grow exists and is public
  const { data: grow } = await supabase
    .from('grows')
    .select('id, is_public')
    .eq('id', growId)
    .single();

  if (!grow) return jsonError('Grow not found', 404) as Response;
  if (!grow.is_public) return jsonError('Cannot follow private grow', 403) as Response;

  const { data: follow, error } = await supabase
    .from('grow_follows')
    .insert({ user_id: user.id, grow_id: growId })
    .select()
    .single();

  if (error) return jsonError('Failed to follow grow', 500, error.code, error.message) as Response;
  return jsonSuccess({ follow }) as Response;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;
  const { id: growId } = await params;

  const { error } = await supabase
    .from('grow_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('grow_id', growId);

  if (error) return jsonError('Failed to unfollow grow', 500, error.code, error.message) as Response;
  return jsonSuccess({ unfollowed: true }) as Response;
}
