-- Fix publish gate for installations where terpenes/flavors/effects are jsonb.
-- array_length(jsonb, int) fails on some projects and blocks unrelated updates
-- (e.g. image_url/canonical_image_path migration) for already-published rows.

drop trigger if exists trg_enforce_strain_publish_gate on public.strains;

create or replace function public.enforce_strain_publish_gate()
returns trigger
language plpgsql
as $$
declare
  terpenes_len int := 0;
  flavors_len int := 0;
  effects_len int := 0;
begin
  if new.publication_status <> 'published' then
    return new;
  end if;

  if jsonb_typeof(to_jsonb(new.terpenes)) = 'array' then
    terpenes_len := jsonb_array_length(to_jsonb(new.terpenes));
  end if;

  if jsonb_typeof(to_jsonb(new.flavors)) = 'array' then
    flavors_len := jsonb_array_length(to_jsonb(new.flavors));
  end if;

  if jsonb_typeof(to_jsonb(new.effects)) = 'array' then
    effects_len := jsonb_array_length(to_jsonb(new.effects));
  end if;

  if new.name is null
     or new.slug is null
     or new.type is null
     or new.description is null
     or terpenes_len < 2
     or flavors_len < 1
     or effects_len < 1
     or (new.thc_min is null and new.thc_max is null)
     or (new.image_url is null and new.canonical_image_path is null)
     or new.primary_source is null then
    raise exception 'strain publish gate failed: missing required fields';
  end if;

  if new.reviewed_at is null then
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

create trigger trg_enforce_strain_publish_gate
before insert or update on public.strains
for each row
execute function public.enforce_strain_publish_gate();
