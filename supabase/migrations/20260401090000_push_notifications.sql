-- =============================================
-- Push Notifications Infrastructure
-- =============================================

-- Add pushed_at column to notifications (for deduplication)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_unpushed
    ON notifications(user_id) WHERE pushed_at IS NULL AND read = FALSE;

-- Table for storing browser push subscriptions
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
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- RLS: Users manage only their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
    ON push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant access to service role for sending pushes
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-set updated_at
CREATE TRIGGER set_push_subscription_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
