-- =============================================
-- Migration: community_followers table
-- Date: 2026-03-28 11:00:00
-- =============================================

CREATE TABLE community_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE community_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_followers_read_all" ON community_followers FOR SELECT USING (true);
CREATE POLICY "community_followers_insert_own" ON community_followers FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "community_followers_delete_own" ON community_followers FOR DELETE USING ((auth.uid())::text = user_id);

CREATE INDEX idx_community_followers_org ON community_followers(organization_id);
CREATE INDEX idx_community_followers_user ON community_followers(user_id);
