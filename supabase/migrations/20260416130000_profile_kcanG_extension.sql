-- ============================================================
-- GreenLog: Profile-Erweiterung für KCanG Compliance
-- Erstellt: 2026-04-16
-- Zweck: Geburtsdatum + Name für § 19 Abs. 3 Altersprüfung
-- ============================================================

BEGIN;

-- profiles: Geburtsdatum für KCanG-Altersprüfung bei Abgaben
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
COMMENT ON COLUMN profiles.date_of_birth IS
  'Geburtsdatum für KCanG § 19 Abs. 3 Altersprüfung. Pflichtfeld für Org-Members.';

-- profiles: Vollständiger Name (für Behörden-Exporte § 26)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
COMMENT ON COLUMN profiles.full_name IS
  'Vor- + Nachname für behördliche Dokumentation § 26 KCanG.';

-- Index für schnelle Altersprüfungen
CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON profiles (date_of_birth);

COMMIT;

-- ROLLBACK:
-- ALTER TABLE profiles DROP COLUMN date_of_birth;
-- ALTER TABLE profiles DROP COLUMN full_name;
-- DROP INDEX idx_profiles_date_of_birth;