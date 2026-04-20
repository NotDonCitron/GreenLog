-- Migration: Org-Ratings Foundation
-- Date: 2026-03-27

-- 1. Add organization_id to ratings
ALTER TABLE ratings ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- 2. Index
CREATE INDEX idx_ratings_org ON ratings(organization_id);

-- 3. Backfill: existing ratings = personal (null = public strain rating)
UPDATE ratings SET organization_id = NULL WHERE organization_id IS NULL;

-- 4. Drop old policies
DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON ratings;
DROP POLICY IF EXISTS "Users can create own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON ratings;

-- 5. RLS: View
--    - Own rating always
--    - Public ratings on public strains = public
--    - Org ratings = org members only
CREATE POLICY "Ratings viewable by all"
  ON ratings FOR SELECT USING (
    (auth.uid())::text = user_id
    OR (organization_id IS NULL AND is_public = true)
    OR (organization_id IS NOT NULL AND is_org_member(organization_id))
  );

-- 6. Insert: User can rate if:
--    - Their own user_id
--    - Org-strain: they are org member
--    - Public strain: no org required
CREATE POLICY "Users can create ratings"
  ON ratings FOR INSERT WITH CHECK (
    (auth.uid())::text = user_id
    AND (
      -- Public strain rating (no org)
      (organization_id IS NULL AND strain_id IN (
        SELECT id FROM strains WHERE organization_id IS NULL
      ))
      -- Org strain rating (must be org member)
      OR (organization_id IS NOT NULL AND is_org_member(organization_id))
    )
  );

-- 7. Update: Own rating only
CREATE POLICY "Users can update own ratings"
  ON ratings FOR UPDATE USING ((auth.uid())::text = user_id);

-- 8. Delete: Own rating only
CREATE POLICY "Users can delete own ratings"
  ON ratings FOR DELETE USING ((auth.uid())::text = user_id);
