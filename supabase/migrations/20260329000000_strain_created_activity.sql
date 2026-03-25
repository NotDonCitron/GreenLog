-- Migration: Add strain_created activity type and trigger
-- Date: 2026-03-29
-- Description: Adds 'strain_created' to activity_type enum and creates trigger to auto-create activity when org strain is created

-- 1. Add strain_created to the activity_type check constraint
ALTER TABLE user_activities DROP CONSTRAINT IF EXISTS user_activities_activity_type_check;
ALTER TABLE user_activities ADD CONSTRAINT user_activities_activity_type_check
  CHECK (activity_type IN ('rating', 'grow_started', 'grow_completed', 'badge_earned', 'favorite_added', 'strain_created'));

-- 2. Create trigger function for strain_created activity
CREATE OR REPLACE FUNCTION create_strain_created_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.organization_id IS NOT NULL THEN
    INSERT INTO user_activities (user_id, activity_type, target_id, target_name, target_image_url, metadata)
    VALUES (
      NEW.created_by,
      'strain_created',
      NEW.id,
      NEW.name,
      NEW.image_url,
      jsonb_build_object('type', NEW.type, 'organization_id', NEW.organization_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Attach trigger to strains table (AFTER INSERT, for new strains with org_id)
DROP TRIGGER IF EXISTS on_strain_created ON strains;
CREATE TRIGGER on_strain_created
  AFTER INSERT ON strains
  FOR EACH ROW EXECUTE FUNCTION create_strain_created_activity();
