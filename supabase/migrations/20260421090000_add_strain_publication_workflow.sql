alter table public.strains
  add column if not exists publication_status text not null default 'draft',
  add column if not exists quality_score integer not null default 0,
  add column if not exists primary_source text,
  add column if not exists source_notes text,
  add column if not exists canonical_image_path text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

alter table public.strains
  drop constraint if exists strains_publication_status_check;

alter table public.strains
  add constraint strains_publication_status_check
  check (publication_status in ('draft', 'review', 'published', 'rejected'));

update public.strains
set publication_status = 'draft'
where publication_status is distinct from 'published';

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
     or (
       new.thc_min is null
       and new.thc_max is null
       and nullif(to_jsonb(new)->>'avg_thc', '') is null
     )
     or (
       new.cbd_min is null
       and new.cbd_max is null
       and nullif(to_jsonb(new)->>'avg_cbd', '') is null
     )
     or new.image_url is null
     or new.canonical_image_path is null
     or new.primary_source is null then
    raise exception 'strain publish gate failed';
  end if;

  if new.reviewed_at is null then
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_strain_publish_gate on public.strains;
create trigger trg_enforce_strain_publish_gate
before insert or update on public.strains
for each row
execute function public.enforce_strain_publish_gate();
