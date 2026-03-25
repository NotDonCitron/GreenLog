-- =============================================
-- GreenLog B2B Multi-Tenancy Foundation
-- =============================================

-- 1. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  organization_type TEXT NOT NULL CHECK (organization_type IN ('club', 'pharmacy')),
  license_number TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- 2. ORGANIZATION MEMBERS
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff', 'member')),
  membership_status TEXT NOT NULL DEFAULT 'active' CHECK (membership_status IN ('invited', 'active', 'suspended')),
  joined_at TIMESTAMPTZ,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(membership_status);

-- 3. ORGANIZATION INVITES
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'member')),
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_org ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_status ON organization_invites(status);

-- 4. GROWS BECOME ORG-SCOPED
ALTER TABLE grows ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_grows_organization ON grows(organization_id);

ALTER TABLE grow_entries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_grow_entries_organization ON grow_entries(organization_id);

-- 5. UPDATED_AT TRIGGER HELPER
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_organizations ON organizations;
CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_organization_members ON organization_members;
CREATE TRIGGER set_updated_at_organization_members
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_organization_invites ON organization_invites;
CREATE TRIGGER set_updated_at_organization_invites
  BEFORE UPDATE ON organization_invites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. ORG HELPER FUNCTIONS FOR RLS
CREATE OR REPLACE FUNCTION is_org_member(p_organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = auth.uid()
      AND om.membership_status = 'active'
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_user_org_role(p_organization_id UUID)
RETURNS TEXT AS $$
  SELECT om.role
  FROM organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = auth.uid()
    AND om.membership_status = 'active'
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION can_manage_org(p_organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(current_user_org_role(p_organization_id) IN ('owner', 'admin'), false);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION can_write_org_data(p_organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(current_user_org_role(p_organization_id) IN ('owner', 'admin', 'staff'), false);
$$ LANGUAGE SQL STABLE;

-- 7. BACKFILL EXISTING GROWS INTO PERSONAL ORGANIZATIONS
INSERT INTO organizations (name, slug, organization_type, created_by)
SELECT
  COALESCE(p.display_name, p.username, 'Workspace') || ' Workspace' AS name,
  LOWER(REGEXP_REPLACE(COALESCE(p.username, p.id::text) || '-workspace', '[^a-zA-Z0-9-]', '-', 'g')) AS slug,
  'club' AS organization_type,
  p.id AS created_by
FROM profiles p
WHERE EXISTS (
  SELECT 1 FROM grows g WHERE g.user_id = p.id
)
AND NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.created_by = p.id
);

INSERT INTO organization_members (organization_id, user_id, role, membership_status, joined_at)
SELECT
  o.id,
  o.created_by,
  'owner',
  'active',
  now()
FROM organizations o
WHERE o.created_by IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.organization_id = o.id
    AND om.user_id = o.created_by
);

UPDATE grows g
SET organization_id = o.id
FROM organizations o
WHERE g.organization_id IS NULL
  AND o.created_by = g.user_id;

UPDATE grow_entries ge
SET organization_id = g.organization_id
FROM grows g
WHERE ge.grow_id = g.id
  AND ge.organization_id IS NULL
  AND g.organization_id IS NOT NULL;

-- 8. ENSURE ORG RELATION IS PRESENT FOR GROWS
ALTER TABLE grows ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE grow_entries ALTER COLUMN organization_id SET NOT NULL;

-- 9. ENABLE RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- 10. CLEAN UP EXISTING GROW POLICIES
DROP POLICY IF EXISTS "Public grows are viewable by everyone" ON grows;
DROP POLICY IF EXISTS "Users can create own grows" ON grows;
DROP POLICY IF EXISTS "Users can update own grows" ON grows;
DROP POLICY IF EXISTS "Users can delete own grows" ON grows;

DROP POLICY IF EXISTS "Grow entries follow grow visibility" ON grow_entries;
DROP POLICY IF EXISTS "Users can create entries for own grows" ON grow_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON grow_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON grow_entries;

-- 11. ORGANIZATION POLICIES
CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Org managers can update organizations"
  ON organizations FOR UPDATE
  USING (can_manage_org(id))
  WITH CHECK (can_manage_org(id));

CREATE POLICY "Organization members can view memberships"
  ON organization_members FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Org managers can invite or add members"
  ON organization_members FOR INSERT
  WITH CHECK (
    can_manage_org(organization_id)
    AND role IN ('admin', 'staff', 'member')
  );

CREATE POLICY "Org managers can update memberships"
  ON organization_members FOR UPDATE
  USING (can_manage_org(organization_id))
  WITH CHECK (can_manage_org(organization_id));

CREATE POLICY "Owners can add themselves as owner"
  ON organization_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'owner'
    AND membership_status = 'active'
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
  );

CREATE POLICY "Org managers can view invites"
  ON organization_invites FOR SELECT
  USING (can_manage_org(organization_id));

CREATE POLICY "Org managers can create invites"
  ON organization_invites FOR INSERT
  WITH CHECK (can_manage_org(organization_id));

CREATE POLICY "Org managers can update invites"
  ON organization_invites FOR UPDATE
  USING (can_manage_org(organization_id))
  WITH CHECK (can_manage_org(organization_id));

-- 12. NEW GROW POLICIES
CREATE POLICY "Organization members can view grows"
  ON grows FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Org writers can create grows"
  ON grows FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND can_write_org_data(organization_id)
  );

CREATE POLICY "Org writers can update grows"
  ON grows FOR UPDATE
  USING (can_write_org_data(organization_id) AND auth.uid() = user_id)
  WITH CHECK (can_write_org_data(organization_id) AND auth.uid() = user_id);

CREATE POLICY "Org writers can delete grows"
  ON grows FOR DELETE
  USING (can_write_org_data(organization_id) AND auth.uid() = user_id);

CREATE POLICY "Organization members can view grow entries"
  ON grow_entries FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Org writers can create grow entries"
  ON grow_entries FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND can_write_org_data(organization_id)
    AND EXISTS (
      SELECT 1 FROM grows g
      WHERE g.id = grow_id
        AND g.organization_id = organization_id
    )
  );

CREATE POLICY "Org writers can update grow entries"
  ON grow_entries FOR UPDATE
  USING (can_write_org_data(organization_id) AND auth.uid() = user_id)
  WITH CHECK (can_write_org_data(organization_id) AND auth.uid() = user_id);

CREATE POLICY "Org writers can delete grow entries"
  ON grow_entries FOR DELETE
  USING (can_write_org_data(organization_id) AND auth.uid() = user_id);
