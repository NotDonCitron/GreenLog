# Strain Image Admin Override - Design

**Date:** 2026-03-30
**Status:** Approved

## Overview

Allows GreenLog app developers/team members to replace strain images in the global collection when they are incorrect or unflattering. This is a temporary admin feature until a proper organization-based strain management is implemented.

## Architecture

### Components

1. **Storage Bucket** - `strains-images` (public read, admin write)
2. **Environment Variable** - `APP_ADMIN_IDS` (comma-separated user IDs)
3. **API Route** - `PATCH /api/strains/[id]/image`
4. **SQL Policy** - App-admin-only UPDATE on `strains.image_url`

### Data Flow

```
Admin Upload → API validates admin → Upload to Storage → Delete old image →
Update strains.image_url → Return new URL
```

## API Endpoint

**`PATCH /api/strains/[id]/image`**

| Aspect | Detail |
|--------|--------|
| Auth | Bearer token, user ID in APP_ADMIN_IDS |
| Content-Type | multipart/form-data |
| Max File Size | 5MB |
| Allowed MIME | image/jpeg, image/png, image/webp, image/gif |
| Storage Path | `strains-images/${strain-id}.jpg` (upsert) |
| Response | `{ success: true, image_url: string }` |

### SQL Migration (required)

```sql
-- Add storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('strains-images', 'strains-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880;

-- App admin RLS policy for strains.image_url update
CREATE POLICY "App admins can update strain images"
  ON strains FOR UPDATE
  USING (auth.uid() IN (
    SELECT unnest(string_to_array(current_setting('app.admin_ids', true), ','))
    ::uuid[]
  ))
  WITH CHECK (auth.uid() IN (
    SELECT unnest(string_to_array(current_setting('app.admin_ids', true), ','))
    ::uuid[]
  ));
```

## Security

- App-admins identified by `APP_ADMIN_IDS` env variable (comma-separated UUIDs)
- Storage bucket has public READ, admin-only WRITE
- RLS policy restricts `strains.image_url` UPDATE to admin IDs only

## Error Handling

| Error | Response |
|-------|----------|
| Not authenticated | 401 Unauthorized |
| Not in APP_ADMIN_IDS | 403 Forbidden |
| Invalid MIME type | 400 Bad Request |
| File too large | 400 Bad Request |
| Strain not found | 404 Not Found |
| Storage upload failed | 500 Internal Server Error |

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/YYYYMMDDHHMMSS_strain_image_admin.sql` | New migration |
| `src/app/api/strains/[id]/image/route.ts` | New API route |
| `.env.local` | Add APP_ADMIN_IDS |
| `CLAUDE.md` | Document feature |