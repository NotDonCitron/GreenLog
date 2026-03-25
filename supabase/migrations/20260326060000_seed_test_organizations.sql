-- =============================================
-- Seed Test Organizations for Development
-- =============================================
-- This creates test organizations for development/testing purposes

-- Create a test club organization
INSERT INTO organizations (id, name, slug, organization_type, status, created_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Test Club Berlin',
  'test-club-berlin',
  'club',
  'active',
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create a test pharmacy organization
INSERT INTO organizations (id, name, slug, organization_type, status, created_at)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Test Apotheke München',
  'test-apotheke-muenchen',
  'pharmacy',
  'active',
  now()
) ON CONFLICT (id) DO NOTHING;

-- Add current users as owners of test organizations
-- Note: Replace 'YOUR_USER_ID' with actual user IDs from your database
-- You can get your user ID from the profiles table

-- Example: Add a user as owner of Test Club Berlin
-- INSERT INTO organization_members (organization_id, user_id, role, membership_status, joined_at)
-- VALUES (
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
--   'YOUR_USER_ID',
--   'owner',
--   'active',
--   now()
-- ) ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Example: Add a user as staff of Test Apotheke München
-- INSERT INTO organization_members (organization_id, user_id, role, membership_status, joined_at)
-- VALUES (
--   'b2c3d4e5-f6a7-8901-bcde-f12345678901',
--   'YOUR_USER_ID',
--   'staff',
--   'active',
--   now()
-- ) ON CONFLICT (organization_id, user_id) DO NOTHING;
