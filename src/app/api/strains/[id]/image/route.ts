import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { isAppAdmin } from "@/lib/auth";
import { deleteFromMinio, uploadToMinio } from "@/lib/minio-storage";
import { storagePathFromMediaUrl } from "@/lib/storage/media";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

function extensionForMimeType(mimeType: string): string {
    if (mimeType === "image/png") return "png";
    if (mimeType === "image/webp") return "webp";
    if (mimeType === "image/gif") return "gif";
    return "jpg";
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
    return Boolean(value && typeof value === "object" && "arrayBuffer" in value && "type" in value && "size" in value);
}

async function deletePreviousMinioImage(imageUrl: string | null, canonicalImagePath: string | null) {
    const path = storagePathFromMediaUrl(imageUrl) ?? canonicalImagePath;
    if (!path?.startsWith("strains/")) return;

    try {
        await deleteFromMinio("strains", path.slice("strains/".length));
    } catch (deleteError) {
        console.error("Failed to delete old MinIO image:", deleteError);
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: strainId } = await params;

        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return jsonError("Unauthorized", 401);
        }

        const supabaseAuth = await getAuthenticatedClient(accessToken);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

        if (authError || !user) {
            return jsonError("Unauthorized", 401);
        }

        if (!isAppAdmin(user.id)) {
            return jsonError("Forbidden", 403);
        }

        const formData = await request.formData();
        const imageFile = formData.get("image");

        if (!isUploadFile(imageFile)) {
            return jsonError("No image provided", 400);
        }

        if (!ALLOWED_MIME_TYPES.has(imageFile.type)) {
            return jsonError("Invalid file type. Allowed: JPG, PNG, WEBP, GIF", 400);
        }

        if (imageFile.size > MAX_UPLOAD_BYTES) {
            return jsonError("File too large. Maximum size is 5MB", 400);
        }

        const { data: strain, error: strainError } = await supabaseAuth
            .from("strains")
            .select("id, image_url, canonical_image_path")
            .eq("id", strainId)
            .single();

        if (strainError || !strain) {
            return jsonError("Strain not found", 404);
        }

        const fileExt = extensionForMimeType(imageFile.type);
        const storageKey = `${strainId}.${fileExt}`;
        const buffer = Buffer.from(await imageFile.arrayBuffer());

        await deletePreviousMinioImage(strain.image_url ?? null, strain.canonical_image_path ?? null);

        const upload = await uploadToMinio("strains", storageKey, buffer, imageFile.type, { upsert: true });
        if (!upload.publicUrl) {
            return jsonError("Failed to create public image URL", 500);
        }

        const { error: updateError } = await supabaseAuth
            .from("strains")
            .update({
                image_url: upload.publicUrl,
                canonical_image_path: upload.path,
            })
            .eq("id", strainId);

        if (updateError) {
            return jsonError("Failed to update strain image URL", 500, updateError.code, updateError.message);
        }

        return jsonSuccess({ success: true, image_url: upload.publicUrl, canonical_image_path: upload.path });

    } catch (error) {
        console.error("Unexpected error:", error);
        return jsonError("Internal server error", 500, undefined, getErrorMessage(error, "Unknown error"));
    }
}
