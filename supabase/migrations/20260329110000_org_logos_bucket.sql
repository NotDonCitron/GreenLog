-- =============================================
-- Org Logos Storage Bucket
-- Creates a dedicated bucket for community/organization logos
-- =============================================

-- Create the org-logos bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'org-logos',
    'org-logos',
    true,
    2097152, -- 2MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Note: storage.objects already has RLS enabled by Supabase
-- We only create bucket and policies below

-- Policy: Anyone (including anon) can read org logos
DROP POLICY IF EXISTS "Anyone can read org logos" ON storage.objects;
CREATE POLICY "Anyone can read org logos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'org-logos');

-- Policy: Authenticated users can upload org logos
DROP POLICY IF EXISTS "Authenticated users can upload org logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload org logos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'org-logos'
        AND auth.role() = 'authenticated'
    );

-- Policy: Authenticated users can update their own org logos (org managers)
DROP POLICY IF EXISTS "Users can update org logos" ON storage.objects;
CREATE POLICY "Users can update org logos"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'org-logos'
        AND auth.role() = 'authenticated'
    )
    WITH CHECK (
        bucket_id = 'org-logos'
        AND auth.role() = 'authenticated'
    );

-- Policy: Users can delete their own org logos
DROP POLICY IF EXISTS "Users can delete org logos" ON storage.objects;
CREATE POLICY "Users can delete org logos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'org-logos'
        AND auth.role() = 'authenticated'
    );
