import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

const APP_ADMIN_IDS = process.env.APP_ADMIN_IDS || "";

function isAppAdmin(userId: string): boolean {
  if (!APP_ADMIN_IDS) return false;
  const adminIds = APP_ADMIN_IDS.split(",").map(id => id.trim()).filter(Boolean);
  return adminIds.includes(userId);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: strainId } = await params;

    // Check Authorization header
    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get authenticated user
    const supabaseAuth = supabase;
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is app admin
    if (!isAppAdmin(user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Validate MIME type
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedMimeTypes.includes(imageFile.type)) {
      return NextResponse.json({
        error: "Invalid file type. Allowed: JPG, PNG, WEBP, GIF"
      }, { status: 400 });
    }

    // Validate file size (5MB = 5242880 bytes)
    if (imageFile.size > 5242880) {
      return NextResponse.json({
        error: "File too large. Maximum size is 5MB"
      }, { status: 400 });
    }

    // Check if strain exists
    const { data: strain, error: strainError } = await supabase
      .from("strains")
      .select("id, image_url")
      .eq("id", strainId)
      .single();

    if (strainError || !strain) {
      return NextResponse.json({ error: "Strain not found" }, { status: 404 });
    }

    // Get file extension from original filename or default to jpg
    const fileExt = imageFile.name.split(".").pop() || "jpg";
    const storagePath = `strains-images/${strainId}.${fileExt}`;

    // Convert file to ArrayBuffer for upload
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Delete old image if exists (extract path from URL)
    if (strain.image_url && strain.image_url.includes("/strains-images/")) {
      try {
        const oldPathMatch = strain.image_url.match(/\/strains-images\/(.+)$/);
        if (oldPathMatch) {
          await supabase.storage.from("strains-images").remove([oldPathMatch[1]]);
        }
      } catch (deleteError) {
        console.error("Failed to delete old image:", deleteError);
        // Continue anyway - old image cleanup is not critical
      }
    }

    // Upload new image (upsert: true to overwrite)
    const { error: uploadError } = await supabase.storage
      .from("strains-images")
      .upload(storagePath, buffer, {
        contentType: imageFile.type,
        upsert: true
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({
        error: "Failed to upload image: " + getErrorMessage(uploadError, "Unknown error")
      }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("strains-images")
      .getPublicUrl(storagePath);

    // Update strain record
    const { error: updateError } = await supabase
      .from("strains")
      .update({ image_url: publicUrl })
      .eq("id", strainId);

    if (updateError) {
      console.error("Strain update error:", updateError);
      return NextResponse.json({
        error: "Failed to update strain image URL"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      image_url: publicUrl
    }, { status: 200 });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}