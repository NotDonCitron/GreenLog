-- =============================================
-- Create badges table for user achievements
-- =============================================

CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial badges
INSERT INTO badges (id, name, description, icon_url, rarity) VALUES
    ('starter', 'Starter', 'Created your first profile', 'star', 'common'),
    ('first-strain', ' Strain Collector', 'Added your first strain to collection', 'leaf', 'common'),
    ('first-grow', 'Green Thumb', 'Started your first grow', 'sprout', 'common'),
    ('five-strains', 'Collector', 'Added 5 strains to collection', 'bookmark', 'common'),
    ('ten-strains', 'Enthusiast', 'Added 10 strains to collection', 'bookmark', 'rare'),
    ('first-review', 'Critic', 'Wrote your first strain review', 'message-square', 'common'),
    ('five-reviews', 'Reviewer', 'Wrote 5 strain reviews', 'message-circle', 'rare'),
    ('first-follower', 'Popular', 'Got your first follower', 'users', 'common'),
    ('ten-followers', 'Influencer', 'Got 10 followers', 'users', 'rare'),
    ('first-org', 'Community Builder', 'Created your first organization', 'building', 'rare'),
    ('scanner', 'Scanner Pro', 'Used the OCR scanner', 'scan', 'common'),
    ('night-owl', 'Night Owl', 'Used the app after midnight', 'moon', 'common'),
    ('early-bird', 'Early Bird', 'Used the app before 6am', 'sunrise', 'common')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Badges are viewable by everyone
CREATE POLICY "Badges are viewable by everyone"
  ON badges FOR SELECT USING (true);
