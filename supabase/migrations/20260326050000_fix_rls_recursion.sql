-- =============================================
-- Fix RLS Recursion Issue
-- =============================================
-- The problem: is_org_member() queries organization_members, but the RLS policy
-- on organization_members also calls is_org_member(), causing infinite recursion.
-- Solution: Use SECURITY DEFINER functions that bypass RLS for the helper functions.

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Organization members can view memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Org managers can view all memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON organization_members;
DROP POLICY IF EXISTS "Org managers can insert members" ON organization_members;
DROP POLICY IF EXISTS "Org managers can update memberships" ON organization_members;

-- Create helper functions with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_org_member(p_organization_id UUID)
RETURNS BOOLEAN 
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = auth.uid()
      AND om.membership_status = 'active'
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_user_org_role(p_organization_id UUID)
RETURNS TEXT 
SECURITY DEFINER
AS $$
  SELECT om.role
  FROM organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = auth.uid()
    AND om.membership_status = 'active'
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION can_manage_org(p_organization_id UUID)
RETURNS BOOLEAN 
SECURITY DEFINER
AS $$
  SELECT COALESCE(current_user_org_role(p_organization_id) IN ('owner', 'admin'), false);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION can_write_org_data(p_organization_id UUID)
RETURNS BOOLEAN 
SECURITY DEFINER
AS $$
  SELECT COALESCE(current_user_org_role(p_organization_id) IN ('owner', 'admin', 'staff'), false);
$$ LANGUAGE SQL STABLE;

-- Recreate policies with direct auth.uid() check for organization_members
-- This avoids the recursion by checking membership directly

-- Policy for organizations: users can view organizations where they are members
CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = id
        AND om.user_id = auth.uid()
        AND om.membership_status = 'active'
    )
  );

-- Policy for organization_members: users can view their own membership
CREATE POLICY "Users can view their own memberships"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Policy for organization_members: org managers can view all members
CREATE POLICY "Org managers can view all memberships"
  ON organization_members FOR SELECT
  USING (can_manage_org(organization_id));

-- Policy for organization_members: users can insert their own membership (for accepting invites)
CREATE POLICY "Users can insert their own membership"
  ON organization_members FOR INSERT
  WITH CHECK (user_id = auth.uid() AND membership_status = 'active');

-- Policy for organization_members: org managers can insert members
CREATE POLICY "Org managers can insert members"
  ON organization_members FOR INSERT
  WITH CHECK (
    can_manage_org(organization_id)
    AND role IN ('admin', 'staff', 'member')
  );

-- Policy for organization_members: org managers can update memberships
CREATE POLICY "Org managers can update memberships"
  ON organization_members FOR UPDATE
  USING (can_manage_org(organization_id))
  WITH CHECK (can_manage_org(organization_id));

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_org_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_org(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_write_org_data(UUID) TO authenticated;
