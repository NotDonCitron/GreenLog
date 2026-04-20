-- Privacy-first public profile preferences and item-level sharing.

CREATE TABLE IF NOT EXISTS user_public_preferences (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  show_badges BOOLEAN NOT NULL DEFAULT true,
  show_favorites BOOLEAN NOT NULL DEFAULT false,
  show_tried_strains BOOLEAN NOT NULL DEFAULT false,
  show_reviews BOOLEAN NOT NULL DEFAULT false,
  show_activity_feed BOOLEAN NOT NULL DEFAULT false,
  show_follow_counts BOOLEAN NOT NULL DEFAULT true,
  default_review_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_public_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own public preferences" ON user_public_preferences;
CREATE POLICY "Users can view own public preferences"
  ON user_public_preferences FOR SELECT
  USING (requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can insert own public preferences" ON user_public_preferences;
CREATE POLICY "Users can insert own public preferences"
  ON user_public_preferences FOR INSERT
  WITH CHECK (requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can update own public preferences" ON user_public_preferences;
CREATE POLICY "Users can update own public preferences"
  ON user_public_preferences FOR UPDATE
  USING (requesting_user_id() = user_id)
  WITH CHECK (requesting_user_id() = user_id);

ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS public_review_text TEXT;

CREATE INDEX IF NOT EXISTS idx_ratings_public_user
  ON ratings(user_id, is_public)
  WHERE is_public = true;

ALTER TABLE user_strain_relations
  ADD COLUMN IF NOT EXISTS public_status TEXT NOT NULL DEFAULT 'private'
  CHECK (public_status IN ('private', 'tried', 'favorite'));

CREATE INDEX IF NOT EXISTS idx_user_strain_relations_public_status
  ON user_strain_relations(user_id, public_status)
  WHERE public_status <> 'private';

ALTER TABLE user_activities
  ADD COLUMN IF NOT EXISTS public_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE user_activities
  ADD COLUMN IF NOT EXISTS private_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_activities_unique_public_target
  ON user_activities(user_id, activity_type, target_id)
  WHERE is_public = true;

UPDATE ratings
SET public_review_text = review
WHERE is_public = true
  AND public_review_text IS NULL
  AND review IS NOT NULL;

UPDATE user_activities
SET public_payload = metadata
WHERE is_public = true
  AND public_payload = '{}'::jsonb
  AND metadata IS NOT NULL;
