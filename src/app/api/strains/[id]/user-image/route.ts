import { getAuthenticatedClient } from "@/lib/supabase/client";
import { getBearerToken, jsonError, jsonSuccess } from "@/lib/api-response";
import { uploadToMinio } from "@/lib/minio-storage";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

function optionalText(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value === "object" && "arrayBuffer" in value && "type" in value && "size" in value);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getBearerToken(request);
  if (!token) return jsonError("Unauthorized", 401);

  const { id: strainId } = await params;
  const supabase = await getAuthenticatedClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const formData = await request.formData();
  const image = formData.get("image");
  if (!isUploadFile(image)) return jsonError("image is required", 400);
  if (!ALLOWED_MIME_TYPES.has(image.type)) return jsonError("Invalid file type. Allowed: JPG, PNG, WEBP, GIF", 400);
  if (image.size > MAX_UPLOAD_BYTES) return jsonError("File too large. Maximum size is 5MB", 400);

  const { data: strain, error: strainError } = await supabase
    .from("strains")
    .select("id, slug, avg_thc, thc_max, avg_cbd, cbd_max")
    .eq("id", strainId)
    .single();

  if (strainError || !strain) return jsonError("Strain not found", 404);

  const ext = extensionForMimeType(image.type);
  const key = `${user.id}/${strainId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await image.arrayBuffer());
  const upload = await uploadToMinio("user-strains", key, buffer, image.type, { upsert: false });
  if (!upload.publicUrl) return jsonError("Failed to create public image URL", 500);

  const { error: collectionError } = await supabase.from("user_collection").upsert({
    user_id: user.id,
    strain_id: strainId,
    user_image_url: upload.publicUrl,
    batch_info: optionalText(formData.get("batch_info")),
    user_notes: optionalText(formData.get("user_notes")),
    user_thc_percent: strain.avg_thc ?? strain.thc_max ?? null,
    user_cbd_percent: strain.avg_cbd ?? strain.cbd_max ?? null,
  }, { onConflict: "user_id,strain_id" });

  if (collectionError) return jsonError("Failed to update collection image", 500, collectionError.code, collectionError.message);

  return jsonSuccess({ user_image_url: upload.publicUrl, path: upload.path });
}
