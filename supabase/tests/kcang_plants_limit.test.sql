-- =============================================
-- KCanG Test: Max 3 active plants per user
-- =============================================

BEGIN;
SELECT plan(4);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000031', 'plants-limit@test.com');

INSERT INTO public.profiles (id, username)
VALUES ('00000000-0000-0000-0000-000000000031', 'plants_limit_user');

INSERT INTO public.grows (id, user_id, title, grow_type, is_public)
VALUES ('30000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', 'KCanG Test Grow', 'indoor', false);

INSERT INTO public.plants (id, grow_id, user_id, plant_name, status)
VALUES
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', 'Plant 1', 'seedling'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', 'Plant 2', 'vegetative'),
  ('31000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', 'Plant 3', 'flowering');

SELECT results_eq(
  'SELECT count(*)::int FROM public.plants WHERE user_id = ''00000000-0000-0000-0000-000000000031'' AND status IN (''seedling'', ''vegetative'', ''flowering'', ''flushing'')',
  ARRAY[3],
  '3 active plants are allowed.'
);

SELECT throws_ok(
  $$INSERT INTO public.plants (id, grow_id, user_id, plant_name, status)
    VALUES ('31000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', 'Plant 4', 'flushing')$$,
  'KCANG_PLANT_LIMIT: Max 3 active plants allowed per user',
  '4th active plant is blocked.'
);

INSERT INTO public.plants (id, grow_id, user_id, plant_name, status)
VALUES ('31000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', 'Harvested Plant', 'harvested');

SELECT results_eq(
  'SELECT count(*)::int FROM public.plants WHERE user_id = ''00000000-0000-0000-0000-000000000031'' AND status = ''harvested''',
  ARRAY[1],
  'Harvested plants are allowed beyond the active limit.'
);

SELECT throws_ok(
  $$UPDATE public.plants SET status = 'flowering' WHERE id = '31000000-0000-0000-0000-000000000005'$$,
  'KCANG_PLANT_LIMIT: Max 3 active plants allowed per user',
  'Moving a non-active plant back to active is blocked when 3 active plants exist.'
);

ROLLBACK;
