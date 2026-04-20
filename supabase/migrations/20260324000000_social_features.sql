-- =============================================
-- GreenLog Social Features Migration
-- =============================================

-- 1. Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- 2. Add is_public column to ratings table
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- 3. Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- 4. Create user_activities table (denormalized activity feed)
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('rating', 'grow_started', 'grow_completed', 'badge_earned', 'favorite_added')),
  target_id UUID NOT NULL,
  target_name TEXT NOT NULL,
  target_image_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create follow_requests table (for private profiles)
CREATE TABLE IF NOT EXISTS follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, target_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target ON follow_requests(target_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

-- Follows: Anyone can view follows if the followed user's profile is public
CREATE POLICY "Follows are viewable if profile is public"
  ON follows FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = following_id AND p.profile_visibility = 'public'
    )
    OR auth.uid()::text = follower_id
    OR auth.uid()::text = following_id
  );

-- Users can create follows for themselves
CREATE POLICY "Users can create own follows"
  ON follows FOR INSERT WITH CHECK (auth.uid()::text = follower_id);

-- Profile owners can create follows when someone follows them (for approved requests)
CREATE POLICY "Profile owners can create follows for requesters"
  ON follows FOR INSERT WITH CHECK (auth.uid()::text = following_id);

-- Users can delete their own follows
CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE USING (auth.uid()::text = follower_id);

-- Users can view their own follows
CREATE POLICY "Users can view own follows"
  ON follows FOR SELECT USING (auth.uid()::text = follower_id);

-- Users can view who follows them
CREATE POLICY "Users can view their followers"
  ON follows FOR SELECT USING (auth.uid()::text = following_id);

-- User Activities: View own, public activities, or activities from followed users
CREATE POLICY "Users can view own activities"
  ON user_activities FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Public activities visible to all"
  ON user_activities FOR SELECT USING (is_public = true);

CREATE POLICY "Followers can view followed user activities"
  ON user_activities FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM follows
      WHERE follows.follower_id = auth.uid()::text AND follows.following_id = user_id
    )
  );

-- Users can create activities for themselves
CREATE POLICY "Users can create own activities"
  ON user_activities FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can delete their own activities
CREATE POLICY "Users can delete own activities"
  ON user_activities FOR DELETE USING (auth.uid()::text = user_id);

-- Follow Requests: View own requests or requests targeting own profile
CREATE POLICY "Users can view own requests"
  ON follow_requests FOR SELECT USING (auth.uid()::text = requester_id OR auth.uid()::text = target_id);

-- Users can create follow requests for themselves
CREATE POLICY "Users can create own follow requests"
  ON follow_requests FOR INSERT WITH CHECK (auth.uid()::text = requester_id);

-- Users can view their own sent requests
CREATE POLICY "Users can view own sent requests"
  ON follow_requests FOR SELECT USING (auth.uid()::text = requester_id);

-- Users can view requests sent to them
CREATE POLICY "Users can view requests sent to them"
  ON follow_requests FOR SELECT USING (auth.uid()::text = target_id);

-- Users can update their own requests (status changes)
CREATE POLICY "Users can update own requests"
  ON follow_requests FOR UPDATE USING (auth.uid()::text = target_id);

-- Users can update (approve/reject) requests targeting them
CREATE POLICY "Users can update requests targeting them"
  ON follow_requests FOR UPDATE USING (auth.uid()::text = target_id);

-- Users can delete (cancel) their own requests
CREATE POLICY "Users can delete own requests"
  ON follow_requests FOR DELETE USING (auth.uid()::text = requester_id);

-- =============================================
-- STORAGE BUCKET FOR AVATARS
-- =============================================

INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('avatars', 'avatars', true, now(), now())
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- HELPER FUNCTIONS & TRIGGERS
-- =============================================

-- Function to get follower count
CREATE OR REPLACE FUNCTION get_follower_count(p_user_id TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM follows WHERE following_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Function to get following count
CREATE OR REPLACE FUNCTION get_following_count(p_user_id TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM follows WHERE follower_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Function to check if user A follows user B
CREATE OR REPLACE FUNCTION is_following(follower_uuid TEXT, following_uuid TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = follower_uuid AND following_id = following_uuid
  );
$$ LANGUAGE SQL STABLE;

-- Trigger function to create activity on new rating
CREATE OR REPLACE FUNCTION create_rating_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_public = true THEN
    INSERT INTO user_activities (user_id, activity_type, target_id, target_name, target_image_url, metadata)
    SELECT
      NEW.user_id,
      'rating',
      NEW.strain_id,
      s.name,
      s.image_url,
      jsonb_build_object('rating', NEW.overall_rating, 'review', NEW.review)
    FROM strains s
    WHERE s.id = NEW.strain_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_rating_created
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION create_rating_activity();

-- Trigger function to create activity on grow started
CREATE OR REPLACE FUNCTION create_grow_started_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_public = true THEN
    INSERT INTO user_activities (user_id, activity_type, target_id, target_name, metadata)
    VALUES (
      NEW.user_id,
      'grow_started',
      NEW.id,
      NEW.title,
      jsonb_build_object('grow_type', NEW.grow_type, 'medium', NEW.medium)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to create activity on grow completed
CREATE OR REPLACE FUNCTION create_grow_completed_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.is_public = true THEN
    INSERT INTO user_activities (user_id, activity_type, target_id, target_name, metadata)
    VALUES (
      NEW.user_id,
      'grow_completed',
      NEW.id,
      NEW.title,
      jsonb_build_object('yield_grams', NEW.yield_grams, 'harvest_date', NEW.harvest_date)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create grow triggers only if grows table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grows') THEN
    DROP TRIGGER IF EXISTS on_grow_started ON grows;
    CREATE TRIGGER on_grow_started
      AFTER INSERT ON grows
      FOR EACH ROW EXECUTE FUNCTION create_grow_started_activity();

    DROP TRIGGER IF EXISTS on_grow_completed ON grows;
    CREATE TRIGGER on_grow_completed
      AFTER UPDATE ON grows
      FOR EACH ROW EXECUTE FUNCTION create_grow_completed_activity();
  END IF;
END;
$$;

-- Trigger function to create activity on badge earned
CREATE OR REPLACE FUNCTION create_badge_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_activities (user_id, activity_type, target_id, target_name, metadata)
    SELECT
      NEW.user_id,
      'badge_earned',
      NEW.id,
      NEW.badge_id,
      jsonb_build_object('unlocked_at', NEW.unlocked_at)
    FROM user_badges
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_badge_earned
  AFTER INSERT ON user_badges
  FOR EACH ROW EXECUTE FUNCTION create_badge_activity();

-- Trigger function to create activity on favorite added
CREATE OR REPLACE FUNCTION create_favorite_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_favorite = true THEN
    INSERT INTO user_activities (user_id, activity_type, target_id, target_name, target_image_url, metadata)
    SELECT
      NEW.user_id,
      'favorite_added',
      NEW.strain_id,
      s.name,
      s.image_url,
      jsonb_build_object('favorite_rank', NEW.favorite_rank)
    FROM strains s
    WHERE s.id = NEW.strain_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_favorite_added
  AFTER INSERT ON user_strain_relations
  FOR EACH ROW EXECUTE FUNCTION create_favorite_activity();
