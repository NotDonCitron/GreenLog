import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase/client';
import { uploadToMinio, deleteFromMinio, getSignedMinioUrl } from '@/lib/minio-storage';

const MINIO_BUCKET = 'grow-entry-photos';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function serializeErrorDetails(details: unknown): unknown {
  if (!details) return undefined;
  if (typeof details === 'string') return details;
  if (details instanceof Error) return details.message;
  if (typeof details === 'object') {
    const record = details as Record<string, unknown>;
    return {
      message: typeof record.message === 'string' ? record.message : undefined,
      error: typeof record.error === 'string' ? record.error : undefined,
      statusCode: typeof record.statusCode === 'string' || typeof record.statusCode === 'number' ? record.statusCode : undefined,
      code: typeof record.code === 'string' ? record.code : undefined,
    };
  }
  return String(details);
}

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { message, details } }, { status });
}

function dateOnlyToUtcTimestamp(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function calculateGrowDayNumber(startDate: string | null | undefined, entryDate: string): number | null {
  if (!startDate) return null;

  const startTime = dateOnlyToUtcTimestamp(startDate);
  const entryTime = dateOnlyToUtcTimestamp(entryDate);

  if (Number.isNaN(startTime) || Number.isNaN(entryTime)) return null;

  const diffDays = Math.floor((entryTime - startTime) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

function normalizePlantIds(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string' || value.length === 0) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return Array.from(new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0)));
    }
  } catch {
    return [value];
  }

  return [];
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

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!accessToken) {
      return jsonError('Unauthorized', 401);
    }

    const supabase = await getAuthenticatedClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('Unauthorized', 401);
    }

    const formData = await request.formData();
    const growId = formData.get('grow_id');
    const image = formData.get('image');
    const caption = formData.get('caption');
    const entryDateValue = formData.get('entry_date');
    const affectedPlantIds = normalizePlantIds(formData.get('affected_plant_ids'));

    if (typeof growId !== 'string' || growId.length === 0) {
      return jsonError('grow_id is required', 400);
    }

    if (!isUploadFile(image)) {
      return jsonError('image is required', 400);
    }

    if (!ALLOWED_MIME_TYPES.has(image.type)) {
      return jsonError('Invalid file type. Allowed: JPG, PNG, WEBP', 400);
    }

    if (image.size > MAX_UPLOAD_BYTES) {
      return jsonError('File too large. Maximum size is 5MB', 400);
    }

    const { data: grow, error: growError } = await supabase
      .from('grows')
      .select('user_id, organization_id, start_date')
      .eq('id', growId)
      .single();

    if (growError || !grow) {
      return jsonError('Grow not found', 404);
    }

    if (grow.user_id !== user.id) {
      return jsonError('Forbidden', 403);
    }

    if (affectedPlantIds.length > 0) {
      const { data: matchingPlants, error: plantsError } = await supabase
        .from('plants')
        .select('id')
        .eq('grow_id', growId)
        .eq('user_id', user.id)
        .in('id', affectedPlantIds);

      if (plantsError) {
      return jsonError('Failed to validate selected plants', 500, plantsError);
      }

      if ((matchingPlants ?? []).length !== affectedPlantIds.length) {
        return jsonError('One or more selected plants are invalid for this grow', 400);
      }
    }

    const extension = extensionForMimeType(image.type);
    const photoPath = `${user.id}/${growId}/${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await image.arrayBuffer());

    await uploadToMinio(MINIO_BUCKET, photoPath, buffer, image.type, { upsert: false });

    const entryDate = typeof entryDateValue === 'string' && entryDateValue.length > 0
      ? entryDateValue
      : new Date().toISOString().split('T')[0];
    const content = {
      photo_path: photoPath,
      ...(typeof caption === 'string' && caption.trim().length > 0 ? { caption: caption.trim() } : {}),
      ...(affectedPlantIds.length > 0 ? { affected_plant_ids: affectedPlantIds } : {}),
    };

    const { data: entry, error: entryError } = await supabase
      .from('grow_entries')
      .insert({
        grow_id: growId,
        organization_id: grow.organization_id,
        user_id: user.id,
        plant_id: affectedPlantIds.length === 1 ? affectedPlantIds[0] : null,
        entry_type: 'photo',
        content,
        entry_date: entryDate,
        day_number: calculateGrowDayNumber(grow.start_date, entryDate),
      })
      .select()
      .single();

    if (entryError) {
      await deleteFromMinio(MINIO_BUCKET, photoPath);
      return jsonError('Failed to add log entry', 500, serializeErrorDetails(entryError));
    }

    const signedPhotoUrl = await getSignedMinioUrl(MINIO_BUCKET, photoPath, 60 * 60);

    return NextResponse.json({
      data: {
        entry: {
          ...entry,
          content: {
            ...entry.content,
            ...(signedPhotoUrl ? { signed_photo_url: signedPhotoUrl } : {}),
          },
        },
      },
    });
  } catch (error) {
    console.error('[POST /api/grows/log-entry/photo]', error);
    return jsonError('Internal server error', 500);
  }
}
