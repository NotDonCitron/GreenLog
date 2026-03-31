# Strain Image Admin Override - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow GreenLog app developers/team members to replace strain images in the global collection via admin-only API.

**Architecture:** Env-variable-based admin auth (APP_ADMIN_IDS), new storage bucket (strains-images), PATCH endpoint for image replacement.

**Tech Stack:** Next.js API Routes, Supabase Storage, Supabase Postgres RLS

---

## File Structure

| File | Action |
|------|--------|
| `supabase/migrations/20260330150000_strain_image_admin.sql` | Create storage bucket + RLS policy |
| `src/app/api/strains/[id]/image/route.ts` | New PATCH endpoint for admin image upload |
| `.env.local` | Add APP_ADMIN_IDS placeholder |
| `CLAUDE.md` | Document feature |

---

## Tasks

### Task 1: SQL Migration

**Files:**
- Create: `supabase/migrations/20260330150000_strain_image_admin.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Storage bucket for strain images (admin upload only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('strains-images', 'strains-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- RLS policy: Anyone can read from strains-images bucket (public)
CREATE POLICY "strains-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'strains-images');

-- RLS policy: Authenticated users can upload to strains-images bucket
CREATE POLICY "strains-images auth upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'strains-images' AND auth.role() = 'authenticated');

-- RLS policy: Authenticated users can update their own files in strains-images
CREATE POLICY "strains-images auth update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'strains-images' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'strains-images' AND auth.role() = 'authenticated');

-- RLS policy: Authenticated users can delete their own files in strains-images
CREATE POLICY "strains-images auth delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'strains-images' AND auth.role() = 'authenticated');
```

- [ ] **Step 2: Run migration**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && supabase db push`
Expected: Migration applies successfully, storage bucket created

- [ ] **Step 3: Commit**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
git add supabase/migrations/20260330150000_strain_image_admin.sql
git commit -m "feat: add strains-images storage bucket for admin strain image overrides"
```

---

### Task 2: API Route

**Files:**
- Create: `src/app/api/strains/[id]/image/route.ts`

- [ ] **Step 1: Create API route directory and file**

Create file: `src/app/api/strains/[id]/image/route.ts`

```typescript
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
```

- [ ] **Step 2: Verify file is created correctly**

Run: `ls -la src/app/api/strains/[id]/image/route.ts`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add src/app/api/strains/[id]/image/route.ts
git commit -m "feat: add admin strain image override API endpoint"
```

---

### Task 3: Environment Variable

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Add APP_ADMIN_IDS placeholder to .env.local**

```bash
# Strain Image Admin - Comma-separated user IDs of app developers who can override strain images
APP_ADMIN_IDS=
```

- [ ] **Step 2: Commit**

```bash
git add .env.local
git commit -m "feat: add APP_ADMIN_IDS env variable for strain image admin override"
```

---

### Task 4: Documentation Update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add feature section to CLAUDE.md**

Find the "Bekannte Issues & Technical Debt" section and add:

```markdown
### Strain Image Admin Override

**Feature:** App developers can replace global strain images when incorrect.

| Aspect | Detail |
|--------|--------|
| Auth | User ID in APP_ADMIN_IDS env variable |
| Endpoint | `PATCH /api/strains/[id]/image` |
| Storage | `strains-images` bucket (public read) |
| Max Size | 5MB |
| MIME Types | image/jpeg, image/png, image/webp, image/gif |

**Files:**
- `supabase/migrations/YYYYMMDDHHMMSS_strain_image_admin.sql` - Storage bucket + RLS
- `src/app/api/strains/[id]/image/route.ts` - PATCH endpoint
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document strain image admin override feature"
```

---

## Verification Steps

After completing all tasks:

1. **Test migration:** Run `supabase db push` and verify bucket exists in Supabase dashboard
2. **Test API (auth required):** Use Postman/curl with admin user token:
   ```bash
   curl -X PATCH "http://localhost:3000/api/strains/[STRAIN_ID]/image" \
     -H "Authorization: Bearer [ADMIN_TOKEN]" \
     -F "image=@/path/to/image.jpg"
   ```
3. **Test non-admin rejection:** Use token from non-admin user, expect 403
4. **Verify image updates:** Check `strains.image_url` in database after upload

---

## Summary

| Task | Status |
|------|--------|
| Task 1: SQL Migration | Pending |
| Task 2: API Route | Pending |
| Task 3: Environment Variable | Pending |
| Task 4: Documentation | Pending |