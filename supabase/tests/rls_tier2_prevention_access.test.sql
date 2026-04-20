-- =============================================
-- RLS Test: Tier-2 prevention access
-- Verifies owner-private raw reads and consent-gated prevention access.
-- =============================================

BEGIN;
SELECT plan(2);

INSERT INTO public.profiles (id, username)
VALUES
  ('tier2-member-1', 'tier2_member_1'),
  ('tier2-admin-1', 'tier2_admin_1'),
  ('tier2-prevention-1', 'tier2_prevention_1');

INSERT INTO public.organizations (id, name, slug, organization_type, created_by)
VALUES (
  '50000000-0000-0000-0000-000000000001',
  'Tier2 Test Org',
  'tier2-test-org',
  'club',
  'tier2-admin-1'
);

INSERT INTO public.organization_members (
  organization_id,
  user_id,
  role,
  membership_status
)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'tier2-member-1', 'member', 'active'),
  ('50000000-0000-0000-0000-000000000001', 'tier2-admin-1', 'admin', 'active'),
  ('50000000-0000-0000-0000-000000000001', 'tier2-prevention-1', 'präventionsbeauftragter', 'active');

INSERT INTO public.strains (id, name, slug, type)
VALUES (
  '60000000-0000-0000-0000-000000000001',
  'Tier 2 Test Strain',
  'tier-2-test-strain',
  'hybrid'
);

INSERT INTO public.ratings (
  id,
  strain_id,
  user_id,
  organization_id,
  overall_rating,
  taste_rating,
  effect_rating,
  look_rating,
  review,
  side_effects,
  effect_tags,
  is_public,
  is_club_feedback
)
VALUES (
  '70000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'tier2-member-1',
  '50000000-0000-0000-0000-000000000001',
  4,
  4,
  5,
  3,
  'Private Tier-2 note',
  ARRAY['dry_mouth'],
  ARRAY['calming'],
  false,
  true
);

SELECT tests.authenticate_as('tier2-admin-1');

SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.ratings
    WHERE id = '70000000-0000-0000-0000-000000000001'$$,
  ARRAY[0],
  'Org admin without consent cannot read raw Tier-2 ratings.'
);

SELECT tests.clear_authentication();

INSERT INTO public.prevention_consents (
  id,
  organization_id,
  member_id,
  granted_to_role,
  data_scopes,
  granted_at
)
VALUES (
  '80000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'tier2-member-1',
  'präventionsbeauftragter',
  ARRAY['ratings'],
  now()
);

SELECT tests.authenticate_as('tier2-prevention-1');

SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.ratings
    WHERE id = '70000000-0000-0000-0000-000000000001'$$,
  ARRAY[1],
  'Prevention officer with active consent can read scoped Tier-2 ratings.'
);

SELECT tests.clear_authentication();

ROLLBACK;
