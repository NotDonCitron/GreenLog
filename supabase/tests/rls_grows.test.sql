-- =============================================
-- RLS Test: Grows Visibility
-- Verifiziert, dass private Grows geschützt sind.
-- =============================================

BEGIN;
SELECT plan(4); -- Wir erwarten 4 Tests

-- 1. Setup: Test-Profile erstellen
-- Wir nutzen IDs, die wir später referenzieren können
INSERT INTO auth.users (id, email) 
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'owner@test.com'),
  ('00000000-0000-0000-0000-000000000002', 'stranger@test.com');

INSERT INTO public.profiles (id, username)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'owner'),
  ('00000000-0000-0000-0000-000000000002', 'stranger');

-- 2. Setup: Test-Grows erstellen
INSERT INTO public.grows (id, user_id, title, grow_type, is_public)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Public Grow', 'indoor', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Private Grow', 'indoor', false);

-- 3. Tests durchführen

-- Test A: Stranger sieht öffentlichen Grow
SELECT tests.authenticate_as('00000000-0000-0000-0000-000000000002');
SELECT results_eq(
    'SELECT count(*)::int FROM public.grows WHERE id = ''10000000-0000-0000-0000-000000000001''',
    ARRAY[1],
    'Ein fremder User sollte öffentliche Grows sehen können.'
);

-- Test B: Stranger sieht privaten Grow NICHT
SELECT results_eq(
    'SELECT count(*)::int FROM public.grows WHERE id = ''10000000-0000-0000-0000-000000000002''',
    ARRAY[0],
    'Ein fremder User darf private Grows NICHT sehen.'
);

-- Test C: Owner sieht eigenen privaten Grow
SELECT tests.authenticate_as('00000000-0000-0000-0000-000000000001');
SELECT results_eq(
    'SELECT count(*)::int FROM public.grows WHERE id = ''10000000-0000-0000-0000-000000000002''',
    ARRAY[1],
    'Der Besitzer muss seinen eigenen privaten Grow sehen können.'
);

-- Test D: Nicht angemeldeter User (anon) sieht privaten Grow NICHT
SELECT tests.clear_authentication();
SELECT results_eq(
    'SELECT count(*)::int FROM public.grows WHERE id = ''10000000-0000-0000-0000-000000000002''',
    ARRAY[0],
    'Anonyme User dürfen private Grows NICHT sehen.'
);

ROLLBACK;
