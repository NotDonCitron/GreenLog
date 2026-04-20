-- =============================================
-- KCanG Test: Tier-1 dispensations limits
-- =============================================

BEGIN;
SELECT plan(7);

INSERT INTO public.profiles (id, username)
VALUES
  ('user-adult', 'user_adult'),
  ('user-young', 'user_young'),
  ('user-missing', 'user_missing'),
  ('staff-1', 'staff_1');

INSERT INTO public.organizations (id, name, slug, organization_type, created_by)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  'Tier1 Test Org',
  'tier1-test-org',
  'club',
  'staff-1'
);

INSERT INTO public.organization_members (
  organization_id,
  user_id,
  role,
  membership_status,
  legal_age_group
)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'user-adult', 'member', 'active', 'adult'),
  ('40000000-0000-0000-0000-000000000001', 'user-young', 'member', 'active', 'heranwachsend'),
  ('40000000-0000-0000-0000-000000000001', 'user-missing', 'member', 'active', NULL),
  ('40000000-0000-0000-0000-000000000001', 'staff-1', 'admin', 'active', 'adult');

SELECT tests.authenticate_as('staff-1');

INSERT INTO public.dispensations (
  organization_id,
  member_id,
  dispensed_by,
  grams,
  dispensed_at
)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  'user-adult',
  'staff-1',
  25,
  now()
);

SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.dispensations
    WHERE organization_id = '40000000-0000-0000-0000-000000000001'
      AND member_id = 'user-adult'$$,
  ARRAY[1],
  'Adult baseline dispense is stored.'
);

SELECT throws_ok(
  $$INSERT INTO public.dispensations (
      organization_id,
      member_id,
      dispensed_by,
      grams,
      dispensed_at
    )
    VALUES (
      '40000000-0000-0000-0000-000000000001',
      'user-adult',
      'staff-1',
      1,
      now()
    )$$,
  'KCANG_DAILY_LIMIT_EXCEEDED: 25g/day',
  'Daily limit is enforced by the trigger.'
);

SELECT lives_ok(
  $$INSERT INTO public.dispensations (
      organization_id,
      member_id,
      dispensed_by,
      grams,
      dispensed_at
    )
    VALUES (
      '40000000-0000-0000-0000-000000000001',
      'user-adult',
      'staff-1',
      25,
      date_trunc('month', now()) + interval '10 days'
    )$$,
  'Second adult monthly dispense within daily limits succeeds.'
);

SELECT throws_ok(
  $$INSERT INTO public.dispensations (
      organization_id,
      member_id,
      dispensed_by,
      grams,
      dispensed_at
    )
    VALUES (
      '40000000-0000-0000-0000-000000000001',
      'user-adult',
      'staff-1',
      1,
      date_trunc('month', now()) + interval '11 days'
    )$$,
  'KCANG_MONTHLY_LIMIT_EXCEEDED: 50g/month',
  'Adult monthly limit is enforced by the trigger.'
);

INSERT INTO public.dispensations (
  organization_id,
  member_id,
  dispensed_by,
  grams,
  dispensed_at
)
VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    'user-young',
    'staff-1',
    25,
    date_trunc('month', now()) + interval '11 days'
  ),
  (
    '40000000-0000-0000-0000-000000000001',
    'user-young',
    'staff-1',
    5,
    date_trunc('month', now()) + interval '12 days'
  );

SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.dispensations
    WHERE organization_id = '40000000-0000-0000-0000-000000000001'
      AND member_id = 'user-young'$$,
  ARRAY[2],
  'Young adult baseline dispensations are stored.'
);

SELECT throws_ok(
  $$INSERT INTO public.dispensations (
      organization_id,
      member_id,
      dispensed_by,
      grams,
      dispensed_at
    )
    VALUES (
      '40000000-0000-0000-0000-000000000001',
      'user-young',
      'staff-1',
      1,
      date_trunc('month', now()) + interval '13 days'
    )$$,
  'KCANG_MONTHLY_LIMIT_EXCEEDED: 30g/month',
  'Young adult monthly limit is enforced by the trigger.'
);

SELECT throws_ok(
  $$INSERT INTO public.dispensations (
      organization_id,
      member_id,
      dispensed_by,
      grams,
      dispensed_at
    )
    VALUES (
      '40000000-0000-0000-0000-000000000001',
      'user-missing',
      'staff-1',
      1,
      date_trunc('month', now()) + interval '14 days'
    )$$,
  'KCANG_MEMBER_AGE_GROUP_MISSING',
  'Missing age-group context is blocked explicitly.'
);

SELECT tests.clear_authentication();

ROLLBACK;
