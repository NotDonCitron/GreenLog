-- =============================================
-- Fix follow_requests approve flow - RLS policy issue
-- The follows INSERT policy was blocking the approve flow because
-- when approving, the authenticated user is the target (not the follower)
-- =============================================

-- Create a SECURITY DEFINER function to create follows on behalf of users
-- This bypasses RLS and allows the approve flow to work
CREATE OR REPLACE FUNCTION create_follow(follower_uuid UUID, following_uuid UUID)
RETURNS UUID AS $$
DECLARE
  follow_id UUID;
BEGIN
  -- Check if follow already exists
  IF EXISTS (SELECT 1 FROM follows WHERE follower_id = follower_uuid AND following_id = following_uuid) THEN
    RETURN NULL; -- Already exists
  END IF;

  -- Insert the follow
  INSERT INTO follows (follower_id, following_id)
  VALUES (follower_uuid, following_uuid)
  RETURNING id INTO follow_id;

  RETURN follow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the follows INSERT policy to allow the function to work
-- The function itself bypasses RLS via SECURITY DEFINER
DROP POLICY IF EXISTS "Users can create follows" ON follows;
CREATE POLICY "Users can create follows"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);
