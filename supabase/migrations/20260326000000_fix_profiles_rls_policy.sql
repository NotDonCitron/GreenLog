-- Migration: Fix profiles RLS policy for discovery
-- Allows authenticated users to view all profiles (for discovery purposes)

-- Drop the restrictive bio policy that was blocking private profiles
DROP POLICY IF EXISTS "Bio is viewable with follow relationship" ON profiles;

-- Create a permissive policy that allows all authenticated users to view all profile info
-- This enables discovery of all users including private profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Keep the user update policy for their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Keep the user insert policy for profile creation
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
