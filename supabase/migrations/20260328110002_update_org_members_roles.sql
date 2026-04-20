-- =============================================
-- Migration: Update organization_members role constraint
-- Date: 2026-03-28 11:00:02
--
-- Role darf nur noch 'gründer' | 'admin' sein
-- Bestehende 'owner' → 'gründer' umbenennen
-- Bestehende 'staff' und 'member' → 'admin' umbenennen
-- =============================================

-- 1. Update existing rows: owner → gründer
UPDATE organization_members
SET role = 'gründer', updated_at = now()
WHERE role = 'owner';

-- 2. Update existing rows: staff/member → admin
UPDATE organization_members
SET role = 'admin', updated_at = now()
WHERE role IN ('staff', 'member');

-- 3. Drop old role constraint
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;

-- 4. Add new role constraint
ALTER TABLE organization_members ADD CONSTRAINT organization_members_role_check CHECK (role IN ('gründer', 'admin'));

-- 5. Update can_manage_org function to use new role names
CREATE OR REPLACE FUNCTION can_manage_org(p_organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(current_user_org_role(p_organization_id) IN ('gründer', 'admin'), false);
$$ LANGUAGE SQL STABLE;

-- 6. Update can_write_org_data function to use new role names
CREATE OR REPLACE FUNCTION can_write_org_data(p_organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(current_user_org_role(p_organization_id) IN ('gründer', 'admin'), false);
$$ LANGUAGE SQL STABLE;

-- 7. Update the "Owners can add themselves as owner" policy name and role reference
-- First drop the old policy
DROP POLICY IF EXISTS "Owners can add themselves as owner" ON organization_members;

-- Create new policy for gründer self-add (only when creating org, gründer is set)
CREATE POLICY "Gründer can be added by themselves"
  ON organization_members FOR INSERT
  WITH CHECK (
    (auth.uid())::text = user_id
    AND role = 'gründer'
    AND membership_status = 'active'
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
  );

-- 8. Update "Org managers can invite or add members" policy to only allow 'admin' role
DROP POLICY IF EXISTS "Org managers can invite or add members" ON organization_members;

CREATE POLICY "Org managers can invite or add admin members"
  ON organization_members FOR INSERT
  WITH CHECK (
    can_manage_org(organization_id)
    AND role = 'admin'
  );
