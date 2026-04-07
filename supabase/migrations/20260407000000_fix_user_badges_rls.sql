-- =============================================
-- Fix user_badges RLS: Block Direct Badge Inserts
-- =============================================
-- Problem: The INSERT policy "Users can insert own badges" allows any
-- authenticated user to directly INSERT badges via Supabase client,
-- bypassing the criteria validation in /api/badges/check.
--
-- Solution: Drop the user INSERT policy and replace with a policy
-- that blocks ALL direct inserts. The badge check API uses service
-- role key which bypasses RLS, so badge assignment still works via
-- the API endpoint only.
-- =============================================

-- Drop the INSERT policy that allows users to insert their own badges
DROP POLICY IF EXISTS "Users can insert own badges" ON user_badges;

-- Create a new INSERT policy that blocks ALL direct inserts from anon/authenticated
-- Only the service role (used by /api/badges/check) can bypass RLS
CREATE POLICY "Service role only for badge inserts" ON user_badges
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- SELECT and DELETE policies remain unchanged (auth.uid() = user_id)
-- We only modified the INSERT policy to prevent direct client-side badge creation