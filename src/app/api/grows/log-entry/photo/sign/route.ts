import { getBearerToken, jsonError, jsonSuccess } from "@/lib/api-response";
import { getSignedMinioUrl } from "@/lib/minio-storage";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sanitizeObjectKey } from "@/lib/storage/media";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) return jsonError("Unauthorized", 401);

  const supabase = await getAuthenticatedClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const body = await request.json().catch(() => null) as { photo_path?: unknown } | null;
  if (typeof body?.photo_path !== "string") return jsonError("photo_path is required", 400);

  let photoPath: string;
  try {
    photoPath = sanitizeObjectKey(body.photo_path);
  } catch {
    return jsonError("Invalid photo_path", 400);
  }

  if (!photoPath.startsWith(`${user.id}/`)) {
    return jsonError("Forbidden", 403);
  }

  try {
    const minioUrl = await getSignedMinioUrl("grow-entry-photos", photoPath, 60 * 60);
    if (minioUrl) return jsonSuccess({ signed_photo_url: minioUrl });
  } catch {}

  try {
    const admin = getSupabaseAdmin();
    const { data: adminData, error } = await admin.storage
      .from("grow-entry-photos")
      .createSignedUrl(photoPath, 60 * 60);
    if (!error && adminData?.signedUrl) {
      return jsonSuccess({ signed_photo_url: adminData.signedUrl });
    }
  } catch {}

  return jsonError("Failed to generate signed URL", 500);
}
