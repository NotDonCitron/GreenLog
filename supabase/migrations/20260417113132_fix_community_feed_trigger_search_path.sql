-- Fix community feed trigger after hardening search_path.
-- The function intentionally clears search_path, so table references inside it
-- must be schema-qualified.

CREATE OR REPLACE FUNCTION public.create_community_feed_entry()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_catalog.set_config('search_path', '', false);

  IF NEW.organization_id IS NOT NULL THEN
    IF TG_TABLE_NAME = 'strains' THEN
      INSERT INTO public.community_feed (organization_id, event_type, reference_id, user_id)
      VALUES (NEW.organization_id, 'strain_created', NEW.id, NEW.created_by);
    ELSIF TG_TABLE_NAME = 'grows' THEN
      INSERT INTO public.community_feed (organization_id, event_type, reference_id, user_id)
      VALUES (NEW.organization_id, 'grow_logged', NEW.id, NEW.user_id);
    ELSIF TG_TABLE_NAME = 'ratings' THEN
      INSERT INTO public.community_feed (organization_id, event_type, reference_id, user_id)
      VALUES (NEW.organization_id, 'rating_added', NEW.id, NEW.user_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
