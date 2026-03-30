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