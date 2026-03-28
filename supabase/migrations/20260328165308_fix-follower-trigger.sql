-- Fix the notify_new_follower trigger function
-- Remove reference to non-existent full_name column

CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  follower_username TEXT;
BEGIN
  SELECT username INTO follower_username
  FROM profiles WHERE id = NEW.follower_id;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.following_id,
    'new_follower',
    'Neuer Follower',
    COALESCE(follower_username, 'Jemand') || ' folgt dir jetzt',
    jsonb_build_object(
      'follower_id', NEW.follower_id,
      'following_id', NEW.following_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_new_follow ON follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_new_follower();
