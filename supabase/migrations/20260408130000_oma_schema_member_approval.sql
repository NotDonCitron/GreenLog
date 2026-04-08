-- =============================================
-- Organization Member Approval Schema
-- Adds optional manual approval for org membership requests
-- =============================================

-- 1. Add requires_member_approval flag to organizations
ALTER TABLE organizations
ADD COLUMN requires_member_approval BOOLEAN DEFAULT false NOT NULL;

-- 2. Add rejection_reason to organization_members for transparency when requests are denied
ALTER TABLE organization_members
ADD COLUMN rejection_reason TEXT;

-- 3. Update CHECK constraint on membership_status to include 'pending'
-- First, drop the existing check constraint
ALTER TABLE organization_members
DROP CONSTRAINT IF EXISTS organization_members_membership_status_check;

-- Add new check constraint with 'pending' status
ALTER TABLE organization_members
ADD CONSTRAINT organization_members_membership_status_check
CHECK (membership_status IN ('active', 'invited', 'removed', 'pending'));

-- 4. Create index for efficient pending member queries
CREATE INDEX idx_org_members_status ON organization_members(organization_id, membership_status);

-- 5. Update RLS policies for pending member visibility
-- Update "Members can view org members" policy to exclude pending members
DROP POLICY IF EXISTS "Members can view org members" ON organization_members;
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_members.organization_id
      AND m.user_id = auth.uid()
      AND m.membership_status = 'active'
    )
    AND membership_status != 'pending'
  );

-- Add policy for admins/gründer to view pending members
DROP POLICY IF EXISTS "Admins can view pending members" ON organization_members;
CREATE POLICY "Admins can view pending members"
  ON organization_members FOR SELECT USING (
    membership_status = 'pending'
    AND EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_members.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'gründer')
      AND m.membership_status = 'active'
    )
  );
