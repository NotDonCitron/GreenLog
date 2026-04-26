-- Disable grow comments during the closed beta safety slice.
-- The product surface is paused until moderation and visibility rules are explicit.

DROP POLICY IF EXISTS "Authenticated users can read comments" ON grow_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON grow_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON grow_comments;

CREATE POLICY "Grow comments are closed beta disabled for read"
  ON grow_comments FOR SELECT USING (false);

CREATE POLICY "Grow comments are closed beta disabled for create"
  ON grow_comments FOR INSERT WITH CHECK (false);

CREATE POLICY "Grow comments are closed beta disabled for delete"
  ON grow_comments FOR DELETE USING (false);
