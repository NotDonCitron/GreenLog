-- =============================================
-- Secure Organization Invite Acceptance
-- =============================================
-- Purpose:
-- 1. Let invited users view only their own pending invites
-- 2. Let invited users accept only valid invites for their own email
-- 3. Remove the overly broad self-membership insert policy
-- Helper: normalize current authenticated email from JWT
CREATE OR REPLACE FUNCTION current_user_email()
RETURNS TEXT
SECURITY DEFINER
AS $$
 SELECT LOWER(COALESCE(auth.jwt()->>'email', ''));
$$ LANGUAGE SQL STABLE;

-- Helper: check whether the current authenticated user has a valid pending invite
-- for a given organization/role combination.
CREATE OR REPLACE FUNCTION has_valid_org_invite(
 p_organization_id UUID,
 p_role TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
 SELECT EXISTS (
    SELECT 1
    FROM organization_invites oi
    WHERE oi.organization_id = p_organization_id
      AND LOWER(oi.email) = current_user_email()
      AND oi.role = p_role
      AND oi.status = 'pending'
      AND oi.expires_at > now()
 );
$$ LANGUAGE SQL STABLE;

-- Invited users can see only their own pending invites.
CREATE POLICY "Invited users can view own pending invites"
 ON organization_invites FOR SELECT
 USING (
    LOWER(email) = current_user_email()
    AND status = 'pending'
    AND expires_at > now()
 );

-- Invited users can mark only their own pending invites as accepted.
CREATE POLICY "Invited users can accept own pending invites"
 ON organization_invites FOR UPDATE
 USING (
    LOWER(email) = current_user_email()
    AND status = 'pending'
    AND expires_at > now()
 )
 WITH CHECK (
    LOWER(email) = current_user_email()
    AND status = 'accepted'
    AND accepted_at IS NOT NULL
 );

-- Remove the overly broad policy that allowed arbitrary self-membership inserts.
DROP POLICY IF EXISTS "Users can insert their own membership" ON organization_members;

-- Re-add a secure self-membership policy that only works for valid invites.
CREATE POLICY "Invited users can insert invited membership"
 ON organization_members FOR INSERT
 WITH CHECK (
    user_id = auth.uid()
    AND membership_status = 'active'
    AND role IN ('admin', 'staff', 'member')
    AND has_valid_org_invite(organization_id, role)
 );

GRANT EXECUTE ON FUNCTION current_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION has_valid_org_invite(UUID, TEXT) TO authenticated;
