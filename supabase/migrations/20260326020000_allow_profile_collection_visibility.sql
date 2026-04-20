-- Allow profile collections to be viewed according to profile visibility and follow relationship

DROP POLICY IF EXISTS "Users can view own collection" ON user_collection;
DROP POLICY IF EXISTS "Users can view their own collection" ON user_collection;
DROP POLICY IF EXISTS "Public collections are viewable" ON user_collection;
DROP POLICY IF EXISTS "Followers can view private collections" ON user_collection;

CREATE POLICY "Users can view own collection"
  ON user_collection FOR SELECT
  USING ((auth.uid())::text = user_id);

CREATE POLICY "Public collections are viewable"
  ON user_collection FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = user_collection.user_id
        AND profiles.profile_visibility = 'public'
    )
  );

CREATE POLICY "Followers can view private collections"
  ON user_collection FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM follows
      WHERE follows.follower_id = auth.uid()
        AND follows.following_id = user_collection.user_id
    )
  );
