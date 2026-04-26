import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedClient } from '@/lib/supabase/client';
import { deleteFromMinio, uploadToMinio } from '@/lib/minio-storage';
import { storagePathFromMediaUrl } from '@/lib/storage/media';

const VALID_STATUSES = new Set(['active', 'completed', 'abandoned']);
const VALID_GROW_TYPES = new Set(['indoor', 'outdoor', 'greenhouse']);
const MINIO_BUCKET = 'grows';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { message, details } }, { status });
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim();
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value
    && typeof value === 'object'
    && 'arrayBuffer' in value
    && 'type' in value
    && 'size' in value
  );
}

function extractGrowObjectKey(value: string | null | undefined): string | null {
  const storagePath = storagePathFromMediaUrl(value);
  if (!storagePath?.startsWith(`${MINIO_BUCKET}/`)) return null;
  const key = storagePath.slice(`${MINIO_BUCKET}/`.length);
  return key.length > 0 ? key : null;
}

async function getAuthenticatedUserAndClient(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const supabase = authHeader?.startsWith('Bearer ')
    ? await getAuthenticatedClient(authHeader.slice(7))
    : await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, supabase };
  return { user, supabase };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: growId } = await params;
    const { user, supabase } = await getAuthenticatedUserAndClient(request);
    if (!user) return jsonError('Unauthorized', 401);

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if ('title' in body) {
      const title = normalizeString(body.title);
      if (!title) return jsonError('Title is required', 400);
      if (title.length > 120) return jsonError('Title must be 120 characters or fewer', 400);
      updates.title = title;
    }

    if ('grow_notes' in body) {
      if (body.grow_notes === null || body.grow_notes === '') {
        updates.grow_notes = null;
      } else {
        const growNotes = normalizeString(body.grow_notes);
        if (growNotes === undefined) return jsonError('grow_notes must be a string or null', 400);
        if (growNotes.length > 2000) return jsonError('grow_notes must be 2000 characters or fewer', 400);
        updates.grow_notes = growNotes;
      }
    }

    if ('is_public' in body) {
      if (typeof body.is_public !== 'boolean') return jsonError('is_public must be a boolean', 400);
      updates.is_public = body.is_public;
    }

    if ('status' in body) {
      if (typeof body.status !== 'string' || !VALID_STATUSES.has(body.status)) {
        return jsonError('status must be active, completed, or abandoned', 400);
      }
      updates.status = body.status;
    }

    if ('grow_type' in body) {
      if (typeof body.grow_type !== 'string' || !VALID_GROW_TYPES.has(body.grow_type)) {
        return jsonError('grow_type must be indoor, outdoor, or greenhouse', 400);
      }
      updates.grow_type = body.grow_type;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError('No valid grow fields provided', 400);
    }

    const { data: existingGrow, error: growError } = await supabase
      .from('grows')
      .select('id, user_id')
      .eq('id', growId)
      .single();

    if (growError || !existingGrow) return jsonError('Grow not found', 404);
    if (existingGrow.user_id !== user.id) return jsonError('Forbidden', 403);

    const { data: grow, error: updateError } = await supabase
      .from('grows')
      .update(updates)
      .eq('id', growId)
      .select('*, strains(id, name, slug, image_url)')
      .single();

    if (updateError) {
      return jsonError('Failed to update grow', 500, updateError.message);
    }

    return NextResponse.json({ data: { grow } });
  } catch (error) {
    console.error('[PATCH /api/grows/[id]]', error);
    return jsonError('Invalid request body', 400);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: growId } = await params;
    const { user, supabase } = await getAuthenticatedUserAndClient(request);
    if (!user) return jsonError('Unauthorized', 401);

    const { data: existingGrow, error: growError } = await supabase
      .from('grows')
      .select('id, user_id, cover_image_url')
      .eq('id', growId)
      .single();

    if (growError || !existingGrow) return jsonError('Grow not found', 404);
    if (existingGrow.user_id !== user.id) return jsonError('Forbidden', 403);

    const formData = await request.formData();
    const image = formData.get('image');
    if (!isUploadFile(image)) return jsonError('image is required', 400);

    if (!ALLOWED_MIME_TYPES.has(image.type)) {
      return jsonError('Invalid file type. Allowed: JPG, PNG, WEBP', 400);
    }

    if (image.size > MAX_UPLOAD_BYTES) {
      return jsonError('File too large. Maximum size is 5MB', 400);
    }

    const extension = extensionForMimeType(image.type);
    const key = `${user.id}/${growId}/cover-${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await image.arrayBuffer());
    const upload = await uploadToMinio(MINIO_BUCKET, key, buffer, image.type, { upsert: false });

    const { data: grow, error: updateError } = await supabase
      .from('grows')
      .update({ cover_image_url: upload.publicUrl ?? `/media/${upload.path}` })
      .eq('id', growId)
      .select('*, strains(id, name, slug, image_url)')
      .single();

    if (updateError || !grow) {
      await deleteFromMinio(MINIO_BUCKET, key);
      return jsonError('Failed to update grow image', 500, updateError?.message);
    }

    const previousKey = extractGrowObjectKey(existingGrow.cover_image_url);
    if (previousKey && previousKey !== key) {
      try {
        await deleteFromMinio(MINIO_BUCKET, previousKey);
      } catch (error) {
        console.warn('[grows image upload] failed to delete previous image', error);
      }
    }

    return NextResponse.json({ data: { grow } });
  } catch (error) {
    console.error('[POST /api/grows/[id]]', error);
    return jsonError(error instanceof Error ? error.message : 'Internal server error', 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: growId } = await params;
    const { user, supabase } = await getAuthenticatedUserAndClient(request);
    if (!user) return jsonError('Unauthorized', 401);

    const { data: existingGrow, error: growError } = await supabase
      .from('grows')
      .select('id, user_id, cover_image_url')
      .eq('id', growId)
      .single();

    if (growError || !existingGrow) return jsonError('Grow not found', 404);
    if (existingGrow.user_id !== user.id) return jsonError('Forbidden', 403);

    const previousKey = extractGrowObjectKey(existingGrow.cover_image_url);

    const { data: grow, error: updateError } = await supabase
      .from('grows')
      .update({ cover_image_url: null })
      .eq('id', growId)
      .select('*, strains(id, name, slug, image_url)')
      .single();

    if (updateError || !grow) {
      return jsonError('Failed to remove grow image', 500, updateError?.message);
    }

    if (previousKey) {
      try {
        await deleteFromMinio(MINIO_BUCKET, previousKey);
      } catch (error) {
        console.warn('[grows image delete] failed to delete image', error);
      }
    }

    return NextResponse.json({ data: { grow } });
  } catch (error) {
    console.error('[DELETE /api/grows/[id]]', error);
    return jsonError(error instanceof Error ? error.message : 'Internal server error', 500);
  }
}
