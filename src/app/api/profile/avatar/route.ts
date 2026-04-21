import { getAuthenticatedClient } from "@/lib/supabase/client";
import { getBearerToken, jsonError, jsonSuccess } from "@/lib/api-response";
import { uploadToMinio } from "@/lib/minio-storage";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value === "object" && "arrayBuffer" in value && "type" in value && "size" in value);
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) return jsonError("Unauthorized", 401);

  const supabase = await getAuthenticatedClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const formData = await request.formData();
  const image = formData.get("image");
  if (!isUploadFile(image)) return jsonError("image is required", 400);
  if (!ALLOWED_MIME_TYPES.has(image.type)) return jsonError("Invalid file type. Allowed: JPG, PNG, WEBP, GIF", 400);
  if (image.size > MAX_UPLOAD_BYTES) return jsonError("File too large. Maximum size is 2MB", 400);

  const ext = extensionForMimeType(image.type);
  const key = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await image.arrayBuffer());
  const upload = await uploadToMinio("avatars", key, buffer, image.type, { upsert: false });
  if (!upload.publicUrl) return jsonError("Failed to create public image URL", 500);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: upload.publicUrl })
    .eq("id", user.id);

  if (updateError) return jsonError("Failed to update avatar", 500, updateError.code, updateError.message);

  return jsonSuccess({ avatar_url: upload.publicUrl, path: upload.path });
}
