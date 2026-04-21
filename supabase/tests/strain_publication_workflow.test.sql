begin;
select plan(8);

insert into public.strains (
  id,
  name,
  slug,
  type
) values (
  '11111111-1111-1111-1111-111111111111',
  'Canon Draft',
  'canon-draft',
  'hybrid'
);

select is(
  (select publication_status from public.strains where id = '11111111-1111-1111-1111-111111111111'),
  'draft',
  'new strains default to draft'
);

select ok(
  (select quality_score from public.strains where id = '11111111-1111-1111-1111-111111111111') = 0,
  'new strains default quality_score to zero'
);

select throws_ok(
  $$
    insert into public.strains (id, name, slug, type, publication_status)
    values ('22222222-2222-2222-2222-222222222222', 'Bad Status', 'bad-status', 'indica', 'live');
  $$,
  '23514',
  null,
  'publication status check rejects unknown values'
);

update public.strains
set
  description = 'Complete enough for publication',
  thc_min = 18,
  thc_max = 22,
  cbd_min = 0,
  cbd_max = 1,
  terpenes = array['Myrcene', 'Limonene'],
  flavors = array['Citrus'],
  effects = array['Relaxed'],
  image_url = 'https://example.com/storage/v1/object/public/strains-images/canon-draft.webp',
  canonical_image_path = 'strains-images/canon-draft.webp',
  primary_source = 'manual-curation'
where id = '11111111-1111-1111-1111-111111111111';

update public.strains
set publication_status = 'published'
where id = '11111111-1111-1111-1111-111111111111';

select is(
  (select publication_status from public.strains where id = '11111111-1111-1111-1111-111111111111'),
  'published',
  'complete strain can be published'
);

select ok(
  (select reviewed_at is not null from public.strains where id = '11111111-1111-1111-1111-111111111111'),
  'reviewed_at is auto-set on publish'
);

insert into public.strains (
  id,
  name,
  slug,
  type,
  publication_status
) values (
  '33333333-3333-3333-3333-333333333333',
  'Blocked Publish',
  'blocked-publish',
  'sativa',
  'draft'
);

select throws_ok(
  $$
    update public.strains
    set publication_status = 'published'
    where id = '33333333-3333-3333-3333-333333333333';
  $$,
  'P0001',
  'strain publish gate failed',
  'incomplete strain cannot be published'
);

select ok(
  exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'strains'
      and column_name = 'canonical_image_path'
  ),
  'canonical_image_path column exists'
);

select * from finish();
rollback;
