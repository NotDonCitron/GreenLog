-- Storage bucket for grow images
-- Run this in Supabase Dashboard > SQL Editor

-- Insert storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'grows',
  'grows',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- RLS Policies for grows bucket
-- Note: You need service_role to create these. Use Dashboard > Storage > Policies for UI-based policy creation

-- Policy 1: Anyone can read/download (public read)
-- In Storage UI: SELECT, download, getPublicUrl → Target: public → bucket_id = 'grows'

-- Policy 2: Authenticated users can upload
-- In Storage UI: INSERT, upload → Target: authenticated → bucket_id = 'grows'

-- Policy 3: Authenticated users can update their own files  
-- In Storage UI: update → Target: authenticated → bucket_id = 'grows'

-- Policy 4: Authenticated users can delete their own files
-- In Storage UI: delete, remove → Target: authenticated → bucket_id = 'grows'
