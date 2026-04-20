-- Migration: Add update policy for strains
-- Allows users to update strains they have created themselves

CREATE POLICY "Users can update own strains"
  ON strains FOR UPDATE
  USING ((auth.uid())::text = created_by)
  WITH CHECK ((auth.uid())::text = created_by);

CREATE POLICY "Users can delete own strains"
  ON strains FOR DELETE
  USING ((auth.uid())::text = created_by);
