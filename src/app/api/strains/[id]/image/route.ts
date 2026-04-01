import { NextResponse } from "next/server";
import { supabase, getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonError, jsonSuccess } from "@/lib/api-response";

const APP_ADMIN_IDS = process.env.APP_ADMIN_IDS || "";

function isAppAdmin(userId: string): boolean {
    if (!APP_ADMIN_IDS) return false;
    const adminIds = APP_ADMIN_IDS.split(",").map(id => id.trim()).filter(Boolean);
    return adminIds.includes(userId);
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
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

        const supabaseAuth = getAuthenticatedClient(accessToken);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

        if (authError || !user) {
            return jsonError("Unauthorized", 401);
        }

        if (!isAppAdmin(user.id)) {
            return jsonError("Forbidden", 403);
        }

        const formData = await request.formData();
        const imageFile = formData.get("image") as File | null;

        if (!imageFile) {
            return jsonError("No image provided", 400);
        }

        const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedMimeTypes.includes(imageFile.type)) {
            return jsonError("Invalid file type. Allowed: JPG, PNG, WEBP, GIF", 400);
        }

        if (imageFile.size > 5242880) {
            return jsonError("File too large. Maximum size is 5MB", 400);
        }

        const { data: strain, error: strainError } = await supabaseAuth
            .from("strains")
            .select("id, image_url")
            .eq("id", strainId)
            .single();

        if (strainError || !strain) {
            return jsonError("Strain not found", 404);
        }

        const fileExt = imageFile.name.split(".").pop() || "jpg";
        const storagePath = `strains-images/${strainId}.${fileExt}`;

        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (strain.image_url && strain.image_url.includes("/strains-images/")) {
            try {
                const oldPathMatch = strain.image_url.match(/\/strains-images\/(.+)$/);
                if (oldPathMatch) {
                    await supabaseAuth.storage.from("strains-images").remove([oldPathMatch[1]]);
                }
            } catch (deleteError) {
                console.error("Failed to delete old image:", deleteError);
            }
        }

        const { error: uploadError } = await supabaseAuth.storage
            .from("strains-images")
            .upload(storagePath, buffer, { contentType: imageFile.type, upsert: true });

        if (uploadError) {
            return jsonError("Failed to upload image: " + getErrorMessage(uploadError, "Unknown error"), 500);
        }

        const { data: { publicUrl } } = supabaseAuth.storage
            .from("strains-images")
            .getPublicUrl(storagePath);

        const { error: updateError } = await supabaseAuth
            .from("strains")
            .update({ image_url: publicUrl })
            .eq("id", strainId);

        if (updateError) {
            return jsonError("Failed to update strain image URL", 500, updateError.code, updateError.message);
        }

        return jsonSuccess({ success: true, image_url: publicUrl });

    } catch (error) {
        console.error("Unexpected error:", error);
        return jsonError("Internal server error", 500);
    }
}
