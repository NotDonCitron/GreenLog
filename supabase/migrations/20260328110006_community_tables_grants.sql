-- =============================================
-- Migration: Community tables grants
-- Date: 2026-03-28 11:00:06
--
-- Grant necessary permissions for community_followers and community_feed tables
-- to allow anon and authenticated roles to access them
-- =============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON community_followers TO anon, authenticated;
GRANT ALL ON community_feed TO anon, authenticated;