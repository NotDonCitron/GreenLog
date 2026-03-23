-- =============================================
-- GreenLog Bio/Caption Feature Migration
-- =============================================

-- Add bio column to profiles table for Instagram-style captions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Users can view bio if profile is public or they are the owner
CREATE POLICY "Bio is viewable if profile is public"
  ON profiles FOR SELECT USING (
    profile_visibility = 'public'
    OR auth.uid() = id
  );

-- Users can update their own bio
CREATE POLICY "Users can update own bio"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- DATA MIGRATION
-- =============================================

-- Migrate tagline to bio for existing public profiles (optional one-time migration)
-- This is commented out to preserve existing taglines
-- UPDATE profiles SET bio = tagline WHERE bio IS NULL AND profile_visibility = 'public';
