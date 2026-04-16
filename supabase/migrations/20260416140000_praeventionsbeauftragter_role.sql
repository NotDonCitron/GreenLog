-- ============================================================
-- GreenLog: Präventionsbeauftragter Rolle für CSCs
-- KCanG § 23 Abs. 4 — Pflichtrolle für Anbauvereinigungen
-- Erstellt: 2026-04-16
-- ============================================================

BEGIN;

-- Rolle umbenennen: check constraint in organization_members
-- Von: role TEXT CHECK (role IN ('gründer', 'admin', 'member', 'viewer'))
-- Zu:   role TEXT CHECK (role IN ('gründer', 'admin', 'member', 'viewer', 'präventionsbeauftragter'))

ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('gründer', 'admin', 'member', 'viewer', 'präventionsbeauftragter'));

COMMENT ON COLUMN organization_members.role IS
  'Rollen: gründer, admin, member, viewer, präventionsbeauftragter (§ 23 Abs. 4 KCanG)';

-- RLS Policy: Präventionsbeauftragter kann alles sehen was admins sehen
-- (Für zukünftige Feature-Erweiterungen — z.B. Berichtspflichten einsehen)
CREATE POLICY "org_members_select_for_prevention_officer" ON organization_members
  FOR SELECT USING (
    role = 'präventionsbeauftragter'
    AND is_active_org_member(requesting_user_id(), organization_id)
  );

COMMIT;

-- ROLLBACK:
-- ALTER TABLE organization_members DROP CONSTRAINT organization_members_role_check;
-- ALTER TABLE organization_members ADD CONSTRAINT organization_members_role_check
--   CHECK (role IN ('gründer', 'admin', 'member', 'viewer'));
-- DROP POLICY "org_members_select_for_prevention_officer" ON organization_members;