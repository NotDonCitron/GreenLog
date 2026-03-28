-- =============================================
-- GreenLog RLS Security Fix
-- Fügt fehlende RLS Policies hinzu (idempotent)
-- =============================================

-- =============================================
-- 1. ORGANIZATIONS RLS
-- =============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON organizations;
CREATE POLICY "Organizations are viewable by everyone"
  ON organizations FOR SELECT
  USING (status = 'active' OR auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Founders and admins can update organizations" ON organizations;
CREATE POLICY "Founders and admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role IN ('gründer', 'admin')
      AND membership_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Founders can delete organizations" ON organizations;
CREATE POLICY "Founders can delete organizations"
  ON organizations FOR DELETE
  USING (auth.uid() = created_by);


-- =============================================
-- 2. ORGANIZATION_MEMBERS RLS
-- =============================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own membership" ON organization_members;
CREATE POLICY "Members can view own membership"
  ON organization_members FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members can view org members" ON organization_members;
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_members.organization_id
      AND m.user_id = auth.uid()
      AND m.membership_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
CREATE POLICY "Admins can add members"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_members.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Members can update own membership, admins can update any" ON organization_members;
CREATE POLICY "Members can update own membership, admins can update any"
  ON organization_members FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_members.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Members can leave, admins can remove" ON organization_members;
CREATE POLICY "Members can leave, admins can remove"
  ON organization_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_members.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
  );


-- =============================================
-- 3. ORGANIZATION_INVITES RLS
-- =============================================

ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins see org invites, inviters see own" ON organization_invites;
CREATE POLICY "Admins see org invites, inviters see own"
  ON organization_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_invites.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
    OR invited_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can view org invites" ON organization_invites;
CREATE POLICY "Admins can view org invites"
  ON organization_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_invites.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can create invites" ON organization_invites;
CREATE POLICY "Admins can create invites"
  ON organization_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_invites.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can revoke invites" ON organization_invites;
CREATE POLICY "Admins can revoke invites"
  ON organization_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_invites.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can delete invites" ON organization_invites;
CREATE POLICY "Admins can delete invites"
  ON organization_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_invites.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
  );


-- =============================================
-- 4. FOLLOWS RLS
-- =============================================

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows are viewable by everyone" ON follows;
CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create follows" ON follows;
CREATE POLICY "Users can create follows"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);


-- =============================================
-- 5. FOLLOW_REQUESTS RLS
-- =============================================

ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own requests" ON follow_requests;
CREATE POLICY "Users see own requests"
  ON follow_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

DROP POLICY IF EXISTS "Users can send follow requests" ON follow_requests;
CREATE POLICY "Users can send follow requests"
  ON follow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update own requests" ON follow_requests;
CREATE POLICY "Users can update own requests"
  ON follow_requests FOR UPDATE
  USING (auth.uid() = target_id);

DROP POLICY IF EXISTS "Users can delete own requests" ON follow_requests;
CREATE POLICY "Users can delete own requests"
  ON follow_requests FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = target_id);


-- =============================================
-- 6. USER_ACTIVITIES RLS
-- =============================================

ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public activities viewable by all" ON user_activities;
CREATE POLICY "Public activities viewable by all"
  ON user_activities FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create activities" ON user_activities;
CREATE POLICY "Users can create activities"
  ON user_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own activities" ON user_activities;
CREATE POLICY "Users can update own activities"
  ON user_activities FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own activities" ON user_activities;
CREATE POLICY "Users can delete own activities"
  ON user_activities FOR DELETE
  USING (auth.uid() = user_id);
