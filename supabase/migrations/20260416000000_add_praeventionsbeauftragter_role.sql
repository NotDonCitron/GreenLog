-- Update organization_members role constraint
ALTER TABLE organization_members
DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE organization_members
ADD CONSTRAINT organization_members_role_check
CHECK (role IN ('gründer', 'admin', 'member', 'viewer', 'präventionsbeauftragter'));

-- Update organization_invites role constraint
ALTER TABLE organization_invites
DROP CONSTRAINT IF EXISTS organization_invites_role_check;

ALTER TABLE organization_invites
ADD CONSTRAINT organization_invites_role_check
CHECK (role IN ('admin', 'staff', 'member', 'viewer', 'präventionsbeauftragter'));
