-- =============================================
-- GreenLog Test Data Seed
-- Used for E2E tests with Playwright + Clerk
-- =============================================

-- IMPORTANT: Use a fixed UUID for /grows/1 in tests
-- This ID matches the test URL pattern in tests/e2e/

DO $$
DECLARE
  test_user_id TEXT := 'user_3CIDpuez504b2VngAliYVSbWpB4'; -- clerk test user
  test_strain_id UUID;
  test_grow_id UUID := '11111111-1111-1111-1111-111111111111';
  plant1_id UUID := '22222222-2222-2222-2222-222222222222';
  plant2_id UUID := '33333333-3333-3333-3333-333333333333';
  plant3_id UUID := '44444444-4444-4444-4444-444444444444';
BEGIN

  -- Insert test user profile (if not exists)
  INSERT INTO profiles (id, username, display_name, created_at, updated_at)
  VALUES (test_user_id, 'playwrightfinal', 'Playwright Test User', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert test strain (if not exists)
  INSERT INTO strains (id, name, slug, type, thc_level, cbd_level, created_at)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Gorilla Glue #4', 'gorilla-glue-4', 'hybrid', 'high', 'medium', now())
  ON CONFLICT (id) DO NOTHING;

  test_strain_id := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Insert test grow (public, owned by test user)
  INSERT INTO grows (id, user_id, strain_id, title, grow_type, status, is_public, start_date, created_at)
  VALUES (test_grow_id, test_user_id, test_strain_id, 'My First Grow', 'indoor', 'active', true, '2026-04-01', now())
  ON CONFLICT (id) DO UPDATE SET title = 'My First Grow';

  -- Insert 3 plants (2 active, 1 harvested — stays under KCanG limit)
  INSERT INTO plants (id, grow_id, user_id, plant_name, strain_id, status, planted_at, created_at)
  VALUES
    (plant1_id, test_grow_id, test_user_id, 'Plant Alpha', test_strain_id, 'vegetative', '2026-04-01', now()),
    (plant2_id, test_grow_id, test_user_id, 'Plant Beta', test_strain_id, 'flowering', '2026-04-02', now()),
    (plant3_id, test_grow_id, test_user_id, 'Plant Gamma', test_strain_id, 'harvested', '2026-03-15', now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert timeline entries (4 entries spanning 3 days)
  INSERT INTO grow_entries (id, grow_id, user_id, plant_id, entry_type, content, entry_date, created_at)
  VALUES
    ('aaaaaaaa-0001-0001-0001-000000000001', test_grow_id, test_user_id, plant1_id, 'watering', '{"amount_liters": 2.5}', '2026-04-13', now()),
    ('aaaaaaaa-0001-0001-0001-000000000002', test_grow_id, test_user_id, plant1_id, 'feeding', '{"nutrient": "BioBloom", "amount": "5ml/L"}', '2026-04-12', now()),
    ('aaaaaaaa-0001-0001-0001-000000000003', test_grow_id, test_user_id, plant2_id, 'photo', '{"photo_url": "https://example.com/plant.jpg", "caption": "Week 2 flower"}', '2026-04-11', now()),
    ('aaaaaaaa-0001-0001-0001-000000000004', test_grow_id, test_user_id, plant1_id, 'note', '{"note_text": "First signs of buds appearing!"}', '2026-04-10', now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert 2 reminders
  INSERT INTO grow_reminders (id, grow_id, user_id, title, due_date, reminder_type, is_completed, created_at)
  VALUES
    ('bbbbbbbb-0001-0001-0001-000000000001', test_grow_id, test_user_id, 'Water plants', '2026-04-15', 'watering', false, now()),
    ('bbbbbbbb-0001-0001-0001-000000000002', test_grow_id, test_user_id, 'Check pH levels', '2026-04-16', 'ph_ec', false, now())
  ON CONFLICT (id) DO NOTHING;

END $$;