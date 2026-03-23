-- =============================================
-- GreenLog Database Schema
-- =============================================

-- 1. PROFILES (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);


-- 2. STRAINS (Cannabis-Sorten)
CREATE TABLE strains (
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
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE strains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strains are viewable by everyone"
  ON strains FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add strains"
  ON strains FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- 3. RATINGS (Bewertungen)
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  overall_rating SMALLINT CHECK (overall_rating BETWEEN 1 AND 5) NOT NULL,
  taste_rating SMALLINT CHECK (taste_rating BETWEEN 1 AND 5),
  effect_rating SMALLINT CHECK (effect_rating BETWEEN 1 AND 5),
  look_rating SMALLINT CHECK (look_rating BETWEEN 1 AND 5),
  review TEXT,
  consumption_method TEXT CHECK (consumption_method IN ('joint', 'bong', 'vaporizer', 'pipe', 'edible', 'other')),
  location TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(strain_id, user_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone"
  ON ratings FOR SELECT USING (true);

CREATE POLICY "Users can create own ratings"
  ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON ratings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON ratings FOR DELETE USING (auth.uid() = user_id);


-- 4. GROWS (Grow-Tagebuch)
CREATE TABLE grows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  grow_type TEXT CHECK (grow_type IN ('indoor', 'outdoor', 'greenhouse')) NOT NULL,
  medium TEXT CHECK (medium IN ('soil', 'coco', 'hydro', 'aero')),
  light_type TEXT,
  nutrients TEXT,
  start_date DATE,
  harvest_date DATE,
  yield_grams DECIMAL(6,1),
  status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE grows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public grows are viewable by everyone"
  ON grows FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own grows"
  ON grows FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own grows"
  ON grows FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own grows"
  ON grows FOR DELETE USING (auth.uid() = user_id);


-- 5. GROW ENTRIES (Tagebuch-Einträge)
CREATE TABLE grow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grow_id UUID REFERENCES grows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  day_number INT,
  title TEXT,
  notes TEXT,
  image_url TEXT,
  height_cm DECIMAL(5,1),
  temperature DECIMAL(4,1),
  humidity DECIMAL(4,1),
  ph_value DECIMAL(3,1),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE grow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grow entries follow grow visibility"
  ON grow_entries FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM grows
      WHERE grows.id = grow_entries.grow_id
      AND (grows.is_public = true OR grows.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create entries for own grows"
  ON grow_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON grow_entries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON grow_entries FOR DELETE USING (auth.uid() = user_id);


-- 6. VIEWS & INDEXES for Performance

-- Average rating per strain
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

-- Indexes
CREATE INDEX idx_ratings_strain ON ratings(strain_id);
CREATE INDEX idx_ratings_user ON ratings(user_id);
CREATE INDEX idx_grows_user ON grows(user_id);
CREATE INDEX idx_grows_strain ON grows(strain_id);
CREATE INDEX idx_grow_entries_grow ON grow_entries(grow_id);
CREATE INDEX idx_strains_slug ON strains(slug);
CREATE INDEX idx_strains_type ON strains(type);


-- 7. USER STRAIN RELATIONS (Favorites/Wishlist)
CREATE TABLE user_strain_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  is_wishlist BOOLEAN DEFAULT false,
  favorite_rank SMALLINT CHECK (favorite_rank BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, strain_id)
);

ALTER TABLE user_strain_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own relations"
  ON user_strain_relations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own relations"
  ON user_strain_relations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relations"
  ON user_strain_relations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own relations"
  ON user_strain_relations FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_strain_relations_user ON user_strain_relations(user_id);
CREATE INDEX idx_user_strain_relations_strain ON user_strain_relations(strain_id);


-- 8. USER BADGES
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges"
  ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own badges"
  ON user_badges FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);


-- 9. USER COLLECTION (Private notes, batch info, personal data)
CREATE TABLE user_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE NOT NULL,
  user_notes TEXT,
  batch_info TEXT,
  user_image_url TEXT,
  user_thc_percent DECIMAL(4,1),
  user_cbd_percent DECIMAL(4,1),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, strain_id)
);

ALTER TABLE user_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collection"
  ON user_collection FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collection"
  ON user_collection FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collection"
  ON user_collection FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collection"
  ON user_collection FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_collection_user ON user_collection(user_id);
CREATE INDEX idx_user_collection_strain ON user_collection(strain_id);
