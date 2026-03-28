-- Migration: Create badges table with full schema
-- Note: The remote already has a badges table from migration 20260329160000 with different schema
-- This migration transforms it to the new schema

-- Drop existing badges table and recreate with correct schema (clean slate for badge system)
DROP TABLE IF EXISTS badges CASCADE;

-- Create badges definition table
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  category TEXT NOT NULL CHECK (category IN ('collection', 'grow', 'social', 'engagement')),
  tier INT DEFAULT 1,
  criteria_key TEXT NOT NULL UNIQUE
);

-- Add featured_badges column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_badges TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Insert all badge definitions
INSERT INTO badges (id, name, description, icon, category, tier, criteria_key) VALUES
  ('first-strain', 'Greenie', '1 Strain gesammelt', 'trophy', 'collection', 1, 'first-strain'),
  ('collector-10', 'Sammler', '10 Strains gesammelt', 'leaf', 'collection', 2, 'collector-10'),
  ('archive-50', 'Archiv', '50 Strains gesammelt', 'archive', 'collection', 3, 'archive-50'),
  ('champion-100', 'Champion', '100 Strains gesammelt', 'crown', 'collection', 4, 'champion-100'),
  ('first-grow', 'Greenhorn', 'Erster Grow gestartet', 'sprout', 'grow', 1, 'first-grow'),
  ('harvest-1', 'Erntezeit', '1 Grow abgeschlossen', 'wheat', 'grow', 2, 'harvest-1'),
  ('perfectionist-5', 'Perfektionist', '5 Grows abgeschlossen', 'star', 'grow', 3, 'perfectionist-5'),
  ('first-follower', 'Neuling', 'Erster Follower', 'users', 'social', 1, 'first-follower'),
  ('community-10', 'Community', '10 Follower', 'users', 'social', 2, 'community-10'),
  ('critic-5', 'Kritiker', '5 Reviews geschrieben', 'pen', 'social', 2, 'critic-5'),
  ('lover-10', 'Liebhaber', '10 Favoriten', 'heart', 'engagement', 2, 'lover-10'),
  ('streak-7', 'Streak', '7 Tage aktiv', 'flame', 'engagement', 2, 'streak-7'),
  ('all-star-50', 'All-Star', '50 verschiedene Strains reviewed', 'sparkles', 'engagement', 3, 'all-star-50');

-- RLS for badges table
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);
