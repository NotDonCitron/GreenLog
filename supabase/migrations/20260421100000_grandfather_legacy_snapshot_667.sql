-- Transitional migration:
-- Allow publishing the pre-big-import legacy snapshot (approx 667 strains)
-- without the strict canon gate, to restore prior catalog state.

CREATE OR REPLACE FUNCTION public.enforce_strain_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.publication_status <> 'published' THEN
    RETURN NEW;
  END IF;

  -- Grandfathered legacy snapshot:
  -- non-kushy, catalog-level, non-custom entries created up to 2026-04-20 12:00:00 UTC.
  IF NEW.source <> 'kushy-csv'
     AND COALESCE(NEW.is_custom, false) = false
     AND NEW.organization_id IS NULL
     AND NEW.created_at <= '2026-04-20T12:00:00Z'::timestamptz THEN
    IF NEW.reviewed_at IS NULL THEN
      NEW.reviewed_at := now();
    END IF;
    RETURN NEW;
  END IF;

  -- Strict canon gate for all other records.
  IF NEW.name IS NULL
     OR NEW.slug IS NULL
     OR NEW.type IS NULL
     OR NEW.description IS NULL
     OR (
       NEW.terpenes IS NULL
       OR jsonb_array_length(to_jsonb(NEW.terpenes)) < 2
     )
     OR (
       NEW.flavors IS NULL
       OR jsonb_array_length(to_jsonb(NEW.flavors)) < 1
     )
     OR (
       NEW.effects IS NULL
       OR jsonb_array_length(to_jsonb(NEW.effects)) < 1
     )
     OR (
       NEW.thc_min IS NULL
       AND NEW.thc_max IS NULL
       AND nullif(to_jsonb(NEW)->>'avg_thc', '') IS NULL
     )
     OR (
       NEW.cbd_min IS NULL
       AND NEW.cbd_max IS NULL
       AND nullif(to_jsonb(NEW)->>'avg_cbd', '') IS NULL
     )
     OR NEW.image_url IS NULL
     OR NEW.canonical_image_path IS NULL
     OR NEW.primary_source IS NULL THEN
    RAISE EXCEPTION 'strain publish gate failed';
  END IF;

  IF NEW.reviewed_at IS NULL THEN
    NEW.reviewed_at := now();
  END IF;

  RETURN NEW;
END;
$$;
