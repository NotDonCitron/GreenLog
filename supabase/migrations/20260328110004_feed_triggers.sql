-- =============================================
-- Migration: Feed triggers for community_feed
-- Date: 2026-03-28 11:00:04
--
-- Trigger function creates community_feed entry when:
-- - A strain with organization_id is inserted
-- - A grow with organization_id is inserted
-- - A rating with organization_id is inserted
-- =============================================

-- 1. Create trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_community_feed_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Required for SECURITY DEFINER functions to prevent privilege escalation
  PERFORM pg_catalog.set_config('search_path', '', false);

  -- Only create feed entry if organization_id is set
  IF NEW.organization_id IS NOT NULL THEN
    IF TG_TABLE_NAME = 'strains' THEN
      INSERT INTO community_feed (organization_id, event_type, reference_id, user_id)
      VALUES (NEW.organization_id, 'strain_created', NEW.id, NEW.created_by);
    ELSIF TG_TABLE_NAME = 'grows' THEN
      INSERT INTO community_feed (organization_id, event_type, reference_id, user_id)
      VALUES (NEW.organization_id, 'grow_logged', NEW.id, NEW.user_id);
    ELSIF TG_TABLE_NAME = 'ratings' THEN
      INSERT INTO community_feed (organization_id, event_type, reference_id, user_id)
      VALUES (NEW.organization_id, 'rating_added', NEW.id, NEW.user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger on strains table
DROP TRIGGER IF EXISTS trg_strain_community_feed ON strains;
CREATE TRIGGER trg_strain_community_feed
  AFTER INSERT ON strains
  FOR EACH ROW
  EXECUTE FUNCTION create_community_feed_entry();

-- 3. Create trigger on grows table
DROP TRIGGER IF EXISTS trg_grow_community_feed ON grows;
CREATE TRIGGER trg_grow_community_feed
  AFTER INSERT ON grows
  FOR EACH ROW
  EXECUTE FUNCTION create_community_feed_entry();

-- 4. Create trigger on ratings table
DROP TRIGGER IF EXISTS trg_rating_community_feed ON ratings;
CREATE TRIGGER trg_rating_community_feed
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION create_community_feed_entry();
