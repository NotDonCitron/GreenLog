-- Migration: Org-Strains Foundation
-- Date: 2026-03-27

-- 1. Add organization_id to strains
ALTER TABLE strains ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- 2. Index for org strains
CREATE INDEX idx_strains_org ON strains(organization_id) WHERE organization_id IS NOT NULL;

-- 3. Backfill: existing strains = public (no org)
UPDATE strains SET organization_id = NULL WHERE organization_id IS NULL;

-- 4. Drop old strains policies
DROP POLICY IF EXISTS "Strains are viewable by everyone" ON strains;
DROP POLICY IF EXISTS "Authenticated users can add strains" ON strains;
DROP POLICY IF EXISTS "Users can update own custom strains" ON strains;
DROP POLICY IF EXISTS "Users can delete own custom strains" ON strains;

-- 5. NEW RLS: Public strains = all see, Org strains = org members only
CREATE POLICY "Strains viewable by all"
  ON strains FOR SELECT USING (
    organization_id IS NULL
    OR is_org_member(organization_id)
  );

-- 6. Anyone can create public strains
CREATE POLICY "Users can create public strains"
  ON strains FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND organization_id IS NULL
  );

-- 7. Org managers can create org strains
CREATE POLICY "Org managers can create org strains"
  ON strains FOR INSERT WITH CHECK (
    can_manage_org(organization_id)
  );

-- 8. Users can update their own public strains
CREATE POLICY "Users can update own public strains"
  ON strains FOR UPDATE USING (
    (auth.uid())::text = created_by
    AND organization_id IS NULL
  );

-- 9. Org managers can update org strains
CREATE POLICY "Org managers can update org strains"
  ON strains FOR UPDATE USING (
    can_manage_org(organization_id)
  );

-- 10. Users can delete their own public strains
CREATE POLICY "Users can delete own public strains"
  ON strains FOR DELETE USING (
    (auth.uid())::text = created_by
    AND organization_id IS NULL
  );

-- 11. Org managers can delete org strains
CREATE POLICY "Org managers can delete org strains"
  ON strains FOR DELETE USING (
    can_manage_org(organization_id)
  );
