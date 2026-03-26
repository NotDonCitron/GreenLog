-- =============================================
-- Migration: community_feed table
-- Date: 2026-03-28 11:00:01
-- =============================================

CREATE TABLE community_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('strain_created', 'grow_logged', 'rating_added')),
  reference_id UUID,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE community_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_feed_read_all" ON community_feed FOR SELECT USING (true);
CREATE POLICY "community_feed_insert_trigger" ON community_feed FOR INSERT WITH CHECK (true);

CREATE INDEX idx_community_feed_org_created ON community_feed(organization_id, created_at DESC);
