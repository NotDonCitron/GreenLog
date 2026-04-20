-- =============================================
-- GreenLog Bio/Caption Feature Migration
-- =============================================

-- Add bio column to profiles table for Instagram-style captions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Users can view bio if profile is public, they are the owner, or they have a follow relationship
CREATE POLICY "Bio is viewable with follow relationship"
  ON profiles FOR SELECT USING (
    profile_visibility = 'public'
    OR (auth.uid())::text = id
    OR EXISTS (
      SELECT 1 FROM follow_requests
      WHERE follow_requests.requester_id = auth.uid()
      AND follow_requests.target_id = profiles.id
      AND follow_requests.status IN ('pending', 'accepted')
    )
  );

-- Users can update their own bio
CREATE POLICY "Users can update own bio"
  ON profiles FOR UPDATE USING ((auth.uid())::text = id);

-- =============================================
-- DATA MIGRATION
-- =============================================

-- Migrate tagline to bio for existing public profiles (optional one-time migration)
-- This is commented out to preserve existing taglines
-- UPDATE profiles SET bio = tagline WHERE bio IS NULL AND profile_visibility = 'public';
