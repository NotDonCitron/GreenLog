-- Fix: Publish Gate Trigger used outdated checks
-- 1. Removed CBD requirement (not all strains have CBD data)
-- 2. Changed image check from AND to OR (image_url OR canonical_image_path)
-- 3. Removed references to non-existent avg_thc/avg_cbd columns

create or replace function public.enforce_strain_publish_gate()
returns trigger
language plpgsql
as $$
begin
  if new.publication_status <> 'published' then
    return new;
  end if;

  if new.name is null
     or new.slug is null
     or new.type is null
     or new.description is null
     or coalesce(array_length(new.terpenes, 1), 0) < 2
     or coalesce(array_length(new.flavors, 1), 0) < 1
     or coalesce(array_length(new.effects, 1), 0) < 1
     or (new.thc_min is null and new.thc_max is null)
     -- Image: EITHER image_url OR canonical_image_path must exist (OR logic)
     or (new.image_url is null and new.canonical_image_path is null)
     or new.primary_source is null then
    raise exception 'strain publish gate failed';
  end if;

  if new.reviewed_at is null then
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;
