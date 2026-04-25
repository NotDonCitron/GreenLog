-- Fix publish gate function for installations where terpenes/flavors/effects are jsonb arrays
-- instead of native Postgres arrays.

CREATE OR REPLACE FUNCTION public.enforce_strain_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.publication_status <> 'published' THEN
    RETURN NEW;
  END IF;

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
