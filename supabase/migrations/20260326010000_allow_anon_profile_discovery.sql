-- Migration: Allow browse/discovery to show all profiles, including private ones, to anon users
-- This matches the app behavior where Browse All should list every profile.

-- Remove previous authenticated-only visibility policy if present
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view all profiles" ON profiles;

-- Allow both anon and authenticated users to read profile rows
CREATE POLICY "Anyone can view all profiles"
  ON profiles FOR SELECT
  USING (auth.role() IN ('anon', 'authenticated'));
