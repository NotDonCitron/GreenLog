-- Create strains storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('strains', 'strains', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- RLS policies for strains bucket
DROP POLICY IF EXISTS "Anyone can view strains images" ON storage.objects;
CREATE POLICY "Anyone can view strains images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'strains');

DROP POLICY IF EXISTS "Authenticated can upload strains images" ON storage.objects;
CREATE POLICY "Authenticated can upload strains images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'strains' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update strains images" ON storage.objects;
CREATE POLICY "Authenticated can update strains images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'strains' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'strains' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can delete strains images" ON storage.objects;
CREATE POLICY "Authenticated can delete strains images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'strains' AND auth.role() = 'authenticated');
