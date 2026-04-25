-- Consolidated publish gate: resolves TEXT[] vs jsonb ambiguity,
-- enforces gate only on transition to 'published', and cleans
-- malformed media URLs containing newlines.
-- Supersedes: 20260421090000, 20260421093000, 20260421100000,
--             20260421120001, 20260421121000

-- 1. Drop old trigger and function
drop trigger if exists trg_enforce_strain_publish_gate on public.strains;
drop function if exists public.enforce_strain_publish_gate();

-- 2. Create consolidated function
create or replace function public.enforce_strain_publish_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  terpenes_len int := 0;
  flavors_len int := 0;
  effects_len int := 0;
  terpenes_json jsonb;
begin
  -- No gate enforcement if record is not transitioning to published
  if new.publication_status <> 'published' then
    return new;
  end if;

  -- Skip gate on maintenance updates to already-published strains
  if tg_op = 'UPDATE' and old.publication_status = 'published' then
    return new;
  end if;

  -- Handle TEXT[] (native postgres array) - most common case
  begin
    terpenes_len := coalesce(array_length(new.terpenes, 1), 0);
    flavors_len := coalesce(array_length(new.flavors, 1), 0);
    effects_len := coalesce(array_length(new.effects, 1), 0);
  exception when others then
    -- Fallback: treat as jsonb if TEXT[] operations fail
    terpenes_json := to_jsonb(new.terpenes);
    if jsonb_typeof(terpenes_json) = 'array' then
      terpenes_len := jsonb_array_length(terpenes_json);
    end if;
    terpenes_json := to_jsonb(new.flavors);
    if jsonb_typeof(terpenes_json) = 'array' then
      flavors_len := jsonb_array_length(terpenes_json);
    end if;
    terpenes_json := to_jsonb(new.effects);
    if jsonb_typeof(terpenes_json) = 'array' then
      effects_len := jsonb_array_length(terpenes_json);
    end if;
  end;

  -- Enforce strict gate on transition to published
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

  -- Auto-set reviewed_at if not already set
  if new.reviewed_at is null then
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

-- 3. Recreate trigger
create trigger trg_enforce_strain_publish_gate
before insert or update on public.strains
for each row
execute function public.enforce_strain_publish_gate();

-- 4. Clean malformed media URLs with newlines
update public.strains
set image_url = replace(image_url, E'\n', '')
where image_url like '%' || E'\n' || '%';

update public.user_collection
set user_image_url = replace(user_image_url, E'\n', '')
where user_image_url like '%' || E'\n' || '%';

update public.profiles
set avatar_url = replace(avatar_url, E'\n', '')
where avatar_url like '%' || E'\n' || '%';

update public.organizations
set logo_url = replace(logo_url, E'\n', '')
where logo_url like '%' || E'\n' || '%';

update public.organizations
set avatar_url = replace(avatar_url, E'\n', '')
where avatar_url like '%' || E'\n' || '%';

update public.grow_entries
set image_url = replace(image_url, E'\n', '')
where image_url like '%' || E'\n' || '%';
