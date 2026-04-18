INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'grow-entry-photos',
  'grow-entry-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "grow-entry-photos owner upload" ON storage.objects;
CREATE POLICY "grow-entry-photos owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'grow-entry-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );

DROP POLICY IF EXISTS "grow-entry-photos owner read" ON storage.objects;
CREATE POLICY "grow-entry-photos owner read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'grow-entry-photos'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );

DROP POLICY IF EXISTS "grow-entry-photos owner delete" ON storage.objects;
CREATE POLICY "grow-entry-photos owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'grow-entry-photos'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );
