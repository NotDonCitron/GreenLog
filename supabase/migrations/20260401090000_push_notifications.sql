-- =============================================
-- Push Notifications Infrastructure
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Add pushed_at column to notifications (for deduplication)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_unpushed
    ON notifications(user_id) WHERE pushed_at IS NULL AND read = FALSE;

-- 2. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- RLS: Users manage only their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions"
    ON push_subscriptions
    FOR ALL
    USING ((auth.uid())::text = user_id)
    WITH CHECK ((auth.uid())::text = user_id);
