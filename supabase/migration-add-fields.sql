-- =============================================
-- GreenLog Migration: Add Missing Fields
-- Run this AFTER the initial schema
-- =============================================

-- 1. Add profile_visibility to profiles (if column doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'profile_visibility'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private'));
  END IF;
END $$;

-- 2. Create user_strain_relations table (if not exists)
CREATE TABLE IF NOT EXISTS user_strain_relations (
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

DROP POLICY IF EXISTS "Users can view own relations" ON user_strain_relations;
CREATE POLICY "Users can view own relations"
  ON user_strain_relations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own relations" ON user_strain_relations;
CREATE POLICY "Users can insert own relations"
  ON user_strain_relations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own relations" ON user_strain_relations;
CREATE POLICY "Users can update own relations"
  ON user_strain_relations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own relations" ON user_strain_relations;
CREATE POLICY "Users can delete own relations"
  ON user_strain_relations FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_strain_relations_user ON user_strain_relations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_strain_relations_strain ON user_strain_relations(strain_id);


-- 3. Create user_badges table (if not exists)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own badges" ON user_badges;
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own badges" ON user_badges;
CREATE POLICY "Users can insert own badges"
  ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own badges" ON user_badges;
CREATE POLICY "Users can delete own badges"
  ON user_badges FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);


-- 4. Create user_collection table (if not exists)
CREATE TABLE IF NOT EXISTS user_collection (
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

DROP POLICY IF EXISTS "Users can view own collection" ON user_collection;
CREATE POLICY "Users can view own collection"
  ON user_collection FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own collection" ON user_collection;
CREATE POLICY "Users can insert own collection"
  ON user_collection FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own collection" ON user_collection;
CREATE POLICY "Users can update own collection"
  ON user_collection FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own collection" ON user_collection;
CREATE POLICY "Users can delete own collection"
  ON user_collection FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_collection_user ON user_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collection_strain ON user_collection(strain_id);
