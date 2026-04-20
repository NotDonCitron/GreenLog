
-- 0. LEGACY BOOTSTRAP (for local migration chain)
-- This repository's migration history predates a proper baseline migration.
-- Ensure core tables exist before legacy ALTER/CREATE statements run.
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('indica', 'sativa', 'hybrid')) NOT NULL,
  thc_min DECIMAL(4,1),
  thc_max DECIMAL(4,1),
  cbd_min DECIMAL(4,1),
  cbd_max DECIMAL(4,1),
  description TEXT,
  effects TEXT[] DEFAULT '{}',
  flavors TEXT[] DEFAULT '{}',
  terpenes TEXT[] DEFAULT '{}',
  image_url TEXT,
  image_attribution JSONB DEFAULT '{"source": "none"}',
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  overall_rating NUMERIC(2,1) CHECK (overall_rating >= 0 AND overall_rating <= 5) NOT NULL,
  taste_rating NUMERIC(2,1) CHECK (taste_rating >= 0 AND taste_rating <= 5),
  effect_rating NUMERIC(2,1) CHECK (effect_rating >= 0 AND effect_rating <= 5),
  look_rating NUMERIC(2,1) CHECK (look_rating >= 0 AND look_rating <= 5),
  review TEXT,
  consumption_method TEXT CHECK (consumption_method IN ('joint', 'bong', 'vaporizer', 'pipe', 'edible', 'other')),
  location TEXT,
  image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(strain_id, user_id)
);

-- 1. RATINGS AUF 0.5 SCHRITTE AKTUALISIEREN
-- View zuerst droppen, da sie von den Spalten abhängt
DROP VIEW IF EXISTS strain_ratings;

ALTER TABLE ratings
  ALTER COLUMN overall_rating TYPE NUMERIC(2,1),
  ALTER COLUMN taste_rating TYPE NUMERIC(2,1),
  ALTER COLUMN effect_rating TYPE NUMERIC(2,1),
  ALTER COLUMN look_rating TYPE NUMERIC(2,1);

-- Constraints anpassen für 0.5 Schritte (0 bis 5)
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_overall_rating_check;
ALTER TABLE ratings ADD CONSTRAINT ratings_overall_rating_check CHECK (overall_rating >= 0 AND overall_rating <= 5);

ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_taste_rating_check;
ALTER TABLE ratings ADD CONSTRAINT ratings_taste_rating_check CHECK (taste_rating >= 0 AND taste_rating <= 5);

ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_effect_rating_check;
ALTER TABLE ratings ADD CONSTRAINT ratings_effect_rating_check CHECK (effect_rating >= 0 AND effect_rating <= 5);

ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_look_rating_check;
ALTER TABLE ratings ADD CONSTRAINT ratings_look_rating_check CHECK (look_rating >= 0 AND look_rating <= 5);

-- 2. USER_COLLECTION ERSTELLEN (Das persönliche Journal)
CREATE TABLE IF NOT EXISTS user_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE NOT NULL,
  date_added TIMESTAMPTZ DEFAULT now(),
  user_thc_percent DECIMAL(4,1),
  user_cbd_percent DECIMAL(4,1),
  batch_info TEXT, -- Chargennummer / Apotheken-Info
  user_notes TEXT,
  user_image_url TEXT,
  UNIQUE(user_id, strain_id)
);

-- 3. FAVORITES & WISHLIST
CREATE TABLE IF NOT EXISTS user_strain_relations (
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE NOT NULL,
  is_wishlisted BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  favorite_rank INT CHECK (favorite_rank BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, strain_id)
);

-- 4. BADGES SYSTEM
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  rarity TEXT DEFAULT 'common'
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- 5. PRIVACY SETTINGS FÜR PROFILE
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_visibility TEXT CHECK (profile_visibility IN ('public', 'private')) DEFAULT 'private';

-- RLS für neue Tabellen
ALTER TABLE user_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_strain_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Policies für user_collection
CREATE POLICY "Users can view their own collection" ON user_collection FOR SELECT USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can insert into their own collection" ON user_collection FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Users can update their own collection" ON user_collection FOR UPDATE USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can delete from their own collection" ON user_collection FOR DELETE USING ((auth.uid())::text = user_id);

-- Policies für user_strain_relations
CREATE POLICY "Users can view their own relations" ON user_strain_relations FOR SELECT USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can insert their own relations" ON user_strain_relations FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Users can update their own relations" ON user_strain_relations FOR UPDATE USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can delete their own relations" ON user_strain_relations FOR DELETE USING ((auth.uid())::text = user_id);

-- Policies für badges
CREATE POLICY "Badges are viewable by everyone" ON badges FOR SELECT USING (true);

-- Policies für user_badges
CREATE POLICY "User badges are viewable by everyone" ON user_badges FOR SELECT USING (true);
CREATE POLICY "Users can unlock badges" ON user_badges FOR INSERT WITH CHECK ((auth.uid())::text = user_id);

-- 6. MVP BADGES EINFÜGEN
INSERT INTO badges (name, description, icon_url, rarity) VALUES
  ('Starter', 'Ersten Strain in der Collection gespeichert', '/badges/starter.svg', 'common'),
  ('Connoisseur', '5 Strains bewertet', '/badges/connoisseur.svg', 'uncommon'),
  ('Highflyer', 'Strain mit über 20% THC bewertet', '/badges/highflyer.svg', 'rare')
ON CONFLICT (name) DO NOTHING;

-- 7. INDEXES für Performance
CREATE INDEX IF NOT EXISTS idx_user_collection_user ON user_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collection_strain ON user_collection(strain_id);
CREATE INDEX IF NOT EXISTS idx_user_strain_relations_user ON user_strain_relations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_strain_relations_strain ON user_strain_relations(strain_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- 8. STRAIN_RATINGS VIEW NEU ERSTELLEN
CREATE VIEW strain_ratings AS
SELECT
  strain_id,
  COUNT(*) as rating_count,
  ROUND(AVG(overall_rating), 1) as avg_overall,
  ROUND(AVG(taste_rating), 1) as avg_taste,
  ROUND(AVG(effect_rating), 1) as avg_effect,
  ROUND(AVG(look_rating), 1) as avg_look
FROM ratings
GROUP BY strain_id;
