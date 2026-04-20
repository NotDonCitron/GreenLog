-- Migration: Add custom strain fields to strains table
-- Date: 2026-03-23
-- Description: Adds is_custom and source fields to support user-created strains

-- 1. Add is_custom column to strains
ALTER TABLE strains ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

-- 2. Add source column to strains (for tracking origin)
ALTER TABLE strains ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'pharmacy';

-- 3. Update RLS policy to allow authenticated users to insert custom strains
DROP POLICY IF EXISTS "Authenticated users can add strains" ON strains;
CREATE POLICY "Authenticated users can add custom strains"
  ON strains FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_custom = true);

-- 4. Update RLS policy to allow users to update their own custom strains
DROP POLICY IF EXISTS "Users can update own custom strains" ON strains;
CREATE POLICY "Users can update own custom strains"
  ON strains FOR UPDATE
  USING ((auth.uid())::text = created_by AND is_custom = true);

-- 5. Update RLS policy to allow users to delete their own custom strains
DROP POLICY IF EXISTS "Users can delete own custom strains" ON strains;
CREATE POLICY "Users can delete own custom strains"
  ON strains FOR DELETE
  USING ((auth.uid())::text = created_by AND is_custom = true);

-- 6. Create index for filtering custom strains
CREATE INDEX IF NOT EXISTS idx_strains_is_custom ON strains(is_custom) WHERE is_custom = true;

-- 7. Create index for source filtering
CREATE INDEX IF NOT EXISTS idx_strains_source ON strains(source);

-- 8. Seed data: mark all existing strains as non-custom (pharmacy)
UPDATE strains SET is_custom = false, source = 'pharmacy' WHERE is_custom IS NULL OR is_custom = false;

-- 9. Create function to generate slug for custom strains
CREATE OR REPLACE FUNCTION generate_custom_strain_slug(name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Convert name to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := trim(regexp_replace(base_slug, '\s+', '-', 'g'));
  base_slug := substring(base_slug from 1 for 50);
  
  final_slug := base_slug;
  
  -- Check for existing slug and append counter if needed
  WHILE EXISTS (SELECT 1 FROM strains WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- 10. Create report table for community moderation
CREATE TABLE IF NOT EXISTS strain_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE NOT NULL,
  reporter_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'duplicate', 'copyright', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by TEXT REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(strain_id, reporter_id)
);

ALTER TABLE strain_reports ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can view reports (for transparency)
CREATE POLICY "Reports are viewable by everyone"
  ON strain_reports FOR SELECT USING (true);

-- Policy: authenticated users can create reports
CREATE POLICY "Users can report strains"
  ON strain_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid())::text = reporter_id);

-- Policy: admins can update report status
CREATE POLICY "Admins can update reports"
  ON strain_reports FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_strain_reports_strain ON strain_reports(strain_id);
CREATE INDEX IF NOT EXISTS idx_strain_reports_status ON strain_reports(status);
