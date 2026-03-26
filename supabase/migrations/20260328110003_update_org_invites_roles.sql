-- =============================================
-- Migration: Update organization_invites role constraint
-- Date: 2026-03-28 11:00:03
--
-- Role darf nur noch 'admin' sein
-- =============================================

-- 1. Update existing rows (staff, member → admin)
UPDATE organization_invites
SET role = 'admin', updated_at = now()
WHERE role IN ('staff', 'member');

-- 2. Drop old role constraint
ALTER TABLE organization_invites DROP CONSTRAINT IF EXISTS organization_invites_role_check;

-- 3. Add new role constraint (only 'admin' allowed)
ALTER TABLE organization_invites ADD CONSTRAINT organization_invites_role_check CHECK (role IN ('admin'));
