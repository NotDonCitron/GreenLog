-- =============================================
-- Migration: Org-strains public read policy
-- Date: 2026-03-28 11:00:05
--
-- Per plan Step 6: Org-scoped strains should be publicly readable
-- This is in addition to the existing "Strains viewable by all" policy
-- which requires org membership for org strains.
-- =============================================

-- Make org-scoped strains publicly readable
-- Public strains (organization_id IS NULL) are already publicly readable via existing policy
CREATE POLICY "org_strains_public_read" ON strains FOR SELECT USING (organization_id IS NOT NULL);