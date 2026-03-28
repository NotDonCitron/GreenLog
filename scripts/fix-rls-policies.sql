-- =============================================
-- GreenLog RLS Security Fix
-- Fügt fehlende RLS Policies hinzu
-- =============================================

-- =============================================
-- 1. ORGANIZATIONS RLS
-- =============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Jeder kann aktive Organizations sehen (öffentliche Info)
CREATE POLICY "Organizations are viewable by everyone"
  ON organizations FOR SELECT
  USING (status = 'active' OR auth.uid() = created_by);

-- Authenticated Users können Organizations erstellen
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Nur Gründer oder Admins können updaten
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

-- Nur Gründer können löschen
CREATE POLICY "Founders can delete organizations"
  ON organizations FOR DELETE
  USING (auth.uid() = created_by);


-- =============================================
-- 2. ORGANIZATION_MEMBERS RLS
-- =============================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Mitglieder können ihre eigenen Daten sehen
CREATE POLICY "Members can view own membership"
  ON organization_members FOR SELECT
  USING (auth.uid() = user_id);

-- Mitglieder können alle Mitglieder ihrer Organization sehen
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

-- Nur Admins oder Gründer können Mitglieder hinzufügen
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

-- Selbst-Updates oder Admin-Updates
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

-- Selbst-Exit oder Admin-Entfernung
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

-- Admins/Gründer sehen alle Invites ihrer Org; invited_by sieht seine eigenen
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

-- Admins/Gründer können Invites für ihre Org sehen
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

-- Admins/Gründer können Invites erstellen
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

-- Admins/Gründer können Invites widerrufen
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

-- Admins/Gründer können Invites löschen
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

-- Jeder kann öffentliche Follows sehen
CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT
  USING (true);

-- Authenticated Users können folgen
CREATE POLICY "Users can create follows"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- User können Unfollow (delete)
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);


-- =============================================
-- 5. FOLLOW_REQUESTS RLS
-- =============================================

ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

-- User sehen eigene Requests
CREATE POLICY "Users see own requests"
  ON follow_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- User können Follow Requests senden
CREATE POLICY "Users can send follow requests"
  ON follow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- User können eigene Requests aktzeptieren/ablehnen
CREATE POLICY "Users can update own requests"
  ON follow_requests FOR UPDATE
  USING (auth.uid() = target_id);

-- User können eigene Requests löschen
CREATE POLICY "Users can delete own requests"
  ON follow_requests FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = target_id);


-- =============================================
-- 6. USER_ACTIVITIES RLS
-- =============================================

ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Public Activities für alle sichtbar
CREATE POLICY "Public activities viewable by all"
  ON user_activities FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Authenticated Users können Activities erstellen
CREATE POLICY "Users can create activities"
  ON user_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User können eigene Activities aktualisieren
CREATE POLICY "Users can update own activities"
  ON user_activities FOR UPDATE
  USING (auth.uid() = user_id);

-- User können eigene Activities löschen
CREATE POLICY "Users can delete own activities"
  ON user_activities FOR DELETE
  USING (auth.uid() = user_id);
