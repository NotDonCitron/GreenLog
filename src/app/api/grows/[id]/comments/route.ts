import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from '@/lib/supabase/client';

export async function GET(request: Request, { params: _params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get('entry_id');
  if (!entryId) return jsonError('entry_id is required', 400) as Response;

  const { data: comments, error } = await supabase
    .from('grow_comments')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('grow_entry_id', entryId)
    .order('created_at', { ascending: true });

  if (error) return jsonError('Failed to fetch comments', 500, error.code, error.message) as Response;
  return jsonSuccess({ comments }) as Response;
}

export async function POST(request: Request, { params: _params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  const body = await request.json();
  const { grow_entry_id, comment } = body;

  if (!grow_entry_id) return jsonError('grow_entry_id is required', 400) as Response;
  if (!comment?.trim()) return jsonError('comment is required', 400) as Response;

  const { data: newComment, error } = await supabase
    .from('grow_comments')
    .insert({
      grow_entry_id,
      user_id: user.id,
      comment: comment.trim(),
    })
    .select('*, profiles(username, display_name, avatar_url)')
    .single();

  if (error) return jsonError('Failed to create comment', 500, error.code, error.message) as Response;
  return jsonSuccess({ comment: newComment }) as Response;
}

export async function DELETE(request: Request, { params: _params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth) return jsonError('Unauthorized', 401) as unknown as Response;
  if (auth instanceof Response) return auth;
  const { user, supabase } = auth;

  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get('comment_id');
  if (!commentId) return jsonError('comment_id is required', 400) as Response;

  // Verify ownership
  const { data: existing } = await supabase
    .from('grow_comments')
    .select('user_id')
    .eq('id', commentId)
    .single();

  if (!existing) return jsonError('Comment not found', 404) as Response;
  if (existing.user_id !== user.id) return jsonError('Forbidden', 403) as Response;

  const { error } = await supabase
    .from('grow_comments')
    .delete()
    .eq('id', commentId);

  if (error) return jsonError('Failed to delete comment', 500, error.code, error.message) as Response;
  return jsonSuccess({ deleted: true }) as Response;
}
