-- Migration: Org-Collection Foundation
-- Date: 2026-03-27

-- 1. Add organization_id to user_collection
ALTER TABLE user_collection ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- 2. Index
CREATE INDEX idx_user_collection_org ON user_collection(organization_id) WHERE organization_id IS NOT NULL;

-- 3. Backfill: existing entries = personal (null)
UPDATE user_collection SET organization_id = NULL WHERE organization_id IS NULL;

-- 4. Drop old policies
DROP POLICY IF EXISTS "Users can view their own collection" ON user_collection;
DROP POLICY IF EXISTS "Users can insert into their own collection" ON user_collection;
DROP POLICY IF EXISTS "Users can update their own collection" ON user_collection;
DROP POLICY IF EXISTS "Users can delete from their own collection" ON user_collection;

-- 5. RLS: View
--    - Own collection always visible
--    - Org-strain collection = org members can see each other's
CREATE POLICY "Users can view own collection"
  ON user_collection FOR SELECT USING (
    auth.uid() = user_id
    OR (organization_id IS NOT NULL AND is_org_member(organization_id))
  );

-- 6. Insert
CREATE POLICY "Users can add to collection"
  ON user_collection FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      organization_id IS NULL
      OR is_org_member(organization_id)
    )
  );

-- 7. Update
CREATE POLICY "Users can update own collection"
  ON user_collection FOR UPDATE USING (auth.uid() = user_id);

-- 8. Delete
CREATE POLICY "Users can delete from own collection"
  ON user_collection FOR DELETE USING (auth.uid() = user_id);
