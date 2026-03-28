-- =============================================
-- Add composite indexes for common query patterns
-- =============================================

-- Composite index for user_strain_relations (favorites lookup)
CREATE INDEX IF NOT EXISTS idx_user_strain_relations_user_favorite
  ON user_strain_relations(user_id, is_favorite)
  WHERE is_favorite = true;

-- Composite index for ratings (user strain activity)
CREATE INDEX IF NOT EXISTS idx_ratings_user_strain
  ON ratings(user_id, strain_id);

-- Composite index for follows (who is following whom)
CREATE INDEX IF NOT EXISTS idx_follows_follower_following
  ON follows(follower_id, following_id);

-- Composite index for user_activities (public activity feed)
CREATE INDEX IF NOT EXISTS idx_user_activities_public
  ON user_activities(user_id, is_public, created_at DESC);

-- Composite index for user_collection (user strain lookup)
CREATE INDEX IF NOT EXISTS idx_user_collection_user_strain
  ON user_collection(user_id, strain_id);
