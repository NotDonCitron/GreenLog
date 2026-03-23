-- Migration: Fix profiles RLS policy for discovery
-- Drop restrictive bio policy and ensure all profiles are visible

-- Drop the restrictive bio policy that was blocking private profiles
DROP POLICY IF EXISTS "Bio is viewable with follow relationship" ON profiles;

-- Drop existing permissive policy if exists
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;

-- Create a permissive policy that allows all authenticated users to view all profile info
-- This enables discovery of all users including private profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Ensure user update policy exists
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Ensure user insert policy exists
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
