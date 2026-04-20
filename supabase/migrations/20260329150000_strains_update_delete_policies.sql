-- =============================================
-- Fix missing RLS policies for strains
-- =============================================

DROP POLICY IF EXISTS "Users can update own strains" ON strains;
CREATE POLICY "Users can update own strains"
  ON strains FOR UPDATE
  USING ((auth.uid())::text = created_by);

DROP POLICY IF EXISTS "Users can delete own strains" ON strains;
CREATE POLICY "Users can delete own strains"
  ON strains FOR DELETE
  USING ((auth.uid())::text = created_by);
