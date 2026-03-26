-- Add logo_url column to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Policy: org managers can update logo
DROP POLICY IF EXISTS "Org managers can update logo" ON organizations;
CREATE POLICY "Org managers can update logo"
  ON organizations FOR UPDATE
  USING (can_manage_org(id))
  WITH CHECK (can_manage_org(id));

-- Policy: everyone can view logo
DROP POLICY IF EXISTS "Anyone can view org logo" ON organizations;
CREATE POLICY "Anyone can view org logo"
  ON organizations FOR SELECT
  USING (true);
