-- ============================================================
-- GreenLog CSC Inventory & Compliance Module
-- KCanG § 26 Berichtspflichten + § 19 Abs. 3 Abgabelimits
-- ============================================================
-- Erstellt: 2026-04-16
-- Zweck: B2B-Mandantenfähiges Modul für Anbauvereinigungen
-- Trennung: Komplett isoliert vom privaten Grow-Tracking (§ 9)
-- ============================================================

-- ============================================================
-- PREREQUISITE: profiles braucht date_of_birth für KCanG-Altersprüfung
-- Führe diese Zeile SEPARAT aus (vor dieser Migration oder als eigene Migration):
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
-- COMMENT ON COLUMN profiles.date_of_birth IS 'Geburtsdatum für KCanG § 19 Abs. 3 Altersprüfung.';

BEGIN;

-- ============================================================
-- 1. csc_batches — Ernte-Los-Erfassung
-- ============================================================
CREATE TABLE csc_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization (Club/Apotheke)
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Welche Sorte wurde geerntet?
  strain_id UUID NOT NULL REFERENCES strains(id),

  -- Agrartechnische Daten
  harvest_date DATE NOT NULL,
  total_weight_grams NUMERIC(10, 2) NOT NULL CHECK (total_weight_grams > 0),
  plant_count INTEGER NOT NULL CHECK (plant_count > 0),

  -- Wer hat die Ernte verantwortet?
  recorded_by TEXT NOT NULL REFERENCES profiles(id),

  -- Optional: Notizen (z.B. "Erste Ernte indoor", "Outdoor-Wetter war gut")
  notes TEXT,

  -- Läuferlische Zustandskontrolle § 11 KCanG
  quality_check_passed BOOLEAN DEFAULT false,
  quality_check_notes TEXT,
  quality_checked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ein Batch gehört immer genau zu einer Organization
  CONSTRAINT csc_batches_org_unique UNIQUE (organization_id, id)
);

-- Index für schnelle Abfragen pro Organization + Zeitraum
CREATE INDEX idx_csc_batches_org_date ON csc_batches (organization_id, harvest_date);
CREATE INDEX idx_csc_batches_strain ON csc_batches (strain_id);

COMMENT ON TABLE csc_batches IS 'Ernte-Lose für CSC-Anbauvereinigungen (§ 26 KCanG). Isoliert vom privaten Grow-Tracking.';


-- ============================================================
-- 2. csc_dispensations — Lückenlose Abgabe-Dokumentation
-- WICHTIG: Hard Block via Trigger — keine passiven Logs!
-- ============================================================
CREATE TABLE csc_dispensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Welcher Club gibt ab?
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Welcher Member erhält Cannabis? (TEXT wegen Clerk/Supabase)
  member_id TEXT NOT NULL REFERENCES profiles(id),

  -- Von welchem Batch?
  batch_id UUID NOT NULL REFERENCES csc_batches(id),

  -- Wieviel Gramm?
  amount_grams NUMERIC(10, 2) NOT NULL CHECK (amount_grams > 0),

  -- Wann wurde abgegeben?
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Wer hat die Abgabe getätigt? (Kassierer/Vorstand)
  dispensed_by TEXT NOT NULL REFERENCES profiles(id),

  -- Optional: Grund der Abgabe (z.B. "Mitgliedsbeitrag", "Sonderwunsch")
  reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Einzigartigkeit: selber Member, selber Tag, selbe Transaktion
  CONSTRAINT csc_dispensations_unique UNIQUE (member_id, batch_id, dispensed_at, amount_grams)
);

-- Index für Limits-Prüfung: schnelle Abfragen pro Member + Zeitraum
CREATE INDEX idx_csc_dispensations_member_date ON csc_dispensations (member_id, dispensed_at);
CREATE INDEX idx_csc_dispense_org ON csc_dispensations (organization_id, dispensed_at);

COMMENT ON TABLE csc_dispensations IS 'Abgabe von Cannabis an Mitglieder. Hard Block via Trigger erzwingt KCanG § 19 Abs. 3 Limits.';


-- ============================================================
-- 3. csc_destructions — Vernichtungsnachweise
-- ============================================================
CREATE TABLE csc_destructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Von welchem Batch? (NULL falls Vernichtung ohne Batch-Zuordnung)
  batch_id UUID REFERENCES csc_batches(id),

  -- Wieviel Gramm werden vernichtet?
  amount_grams NUMERIC(10, 2) NOT NULL CHECK (amount_grams > 0),

  -- Grund der Vernichtung (§ 26 KCanG dokumentationspflichtig)
  -- Typische Gründe: "Pilzbefall", "Schimmel", "Qualitätskontrolle bestanden nicht", "法律法规"
  destruction_reason TEXT NOT NULL,

  -- Verantwortlicher Admin
  destroyed_by TEXT NOT NULL REFERENCES profiles(id),

  -- Wann wurde vernichtet?
  destroyed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Optional: Foto/ Dokumentation als Storage-URL
  documentation_url TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_csc_destructions_org ON csc_destructions (organization_id, destroyed_at);

COMMENT ON TABLE csc_destructions IS 'Vernichtungsnachweise für Behörden § 26 KCanG.';


-- ============================================================
-- 4. RLS Policies — Row Level Security
-- ============================================================

ALTER TABLE csc_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE csc_dispensations ENABLE ROW LEVEL SECURITY;
ALTER TABLE csc_destructions ENABLE ROW LEVEL SECURITY;

-- csc_batches: Nur Org-Member mit role >= admin sehen/erstellen
CREATE POLICY "csc_batches_select" ON csc_batches
  FOR SELECT USING (
    is_active_org_member(requesting_user_id(), organization_id)
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = csc_batches.organization_id
      AND user_id = requesting_user_id()
      AND role IN ('gründer', 'admin', 'member')
    )
  );

CREATE POLICY "csc_batches_insert" ON csc_batches
  FOR INSERT WITH CHECK (
    is_active_org_member(requesting_user_id(), organization_id)
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = csc_batches.organization_id
      AND user_id = requesting_user_id()
      AND role IN ('gründer', 'admin')
    )
  );

CREATE POLICY "csc_batches_update" ON csc_batches
  FOR UPDATE USING (
    is_active_org_member(requesting_user_id(), organization_id)
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = csc_batches.organization_id
      AND user_id = requesting_user_id()
      AND role IN ('gründer', 'admin')
    )
  );

-- csc_dispensations: Org-Member >= admin sehen, nur gründer/admin einfügen
CREATE POLICY "csc_dispensations_select" ON csc_dispensations
  FOR SELECT USING (
    is_active_org_member(requesting_user_id(), organization_id)
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = csc_dispensations.organization_id
      AND user_id = requesting_user_id()
      AND role IN ('gründer', 'admin', 'member', 'viewer')
    )
  );

CREATE POLICY "csc_dispensations_insert" ON csc_dispensations
  FOR INSERT WITH CHECK (
    is_active_org_member(requesting_user_id(), organization_id)
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = csc_dispensations.organization_id
      AND user_id = requesting_user_id()
      AND role IN ('gründer', 'admin')
    )
  );

-- csc_destructions: Nur admin+ sehen/erstellen
CREATE POLICY "csc_destructions_select" ON csc_destructions
  FOR SELECT USING (
    is_active_org_member(requesting_user_id(), organization_id)
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = csc_destructions.organization_id
      AND user_id = requesting_user_id()
      AND role IN ('gründer', 'admin')
    )
  );

CREATE POLICY "csc_destructions_insert" ON csc_destructions
  FOR INSERT WITH CHECK (
    is_active_org_member(requesting_user_id(), organization_id)
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = csc_destructions.organization_id
      AND user_id = requesting_user_id()
      AND role IN ('gründer', 'admin')
    )
  );


-- ============================================================
-- 5. KCanG Compliance Trigger — HARTER BLOCK statt passives Log
-- Prüft § 19 Abs. 3 Limits BEVOR Abgabe eingefügt wird:
--   - Erwachsene (21+): max 25g/Tag, max 50g/Monat
--   - Heranwachsende (18-21): max 25g/Tag, max 30g/Monat, THC ≤ 10%
-- ============================================================

CREATE OR REPLACE FUNCTION kcang_dispensation_check()
RETURNS TRIGGER AS $$
DECLARE
  v_member_birthdate DATE;
  v_member_age INTEGER;
  v_is_young_adult BOOLEAN;
  v_strain_thc NUMERIC;
  v_today TIMESTAMPTZ;
  v_today_start TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
  v_today_total NUMERIC;
  v_month_total NUMERIC;
  v_error_msg TEXT;
BEGIN

  -- Grundeinstellungen
  v_today := CURRENT_DATE;
  v_today_start := v_today::TIMESTAMPTZ;
  v_month_start := (DATE_TRUNC('month', v_today))::TIMESTAMPTZ;

  -- 1) Member-Geburtsdatum holen (aus profiles oder org_members)
  SELECT p.date_of_birth INTO v_member_birthdate
  FROM profiles p
  WHERE p.id = NEW.member_id;

  -- Falls kein Geburtsdatum hinterlegt → BLOCK
  IF v_member_birthdate IS NULL THEN
    RAISE EXCEPTION 'KCanG Compliance Error: Kein Geburtsdatum für Member % hinterlegt. Altersprüfung nicht möglich.', NEW.member_id;
  END IF;

  -- 2) Alter berechnen (am Tag der Abgabe)
  v_member_age := DATE_PART('year', AGE(NEW.dispensed_at, v_member_birthdate));

  -- 3) Heranwachsende (18-21)? → stricter limits + THC limit
  v_is_young_adult := (v_member_age >= 18 AND v_member_age < 21);

  -- 4) THC-Gehalt der Sorte holen
  SELECT avg_thc INTO v_strain_thc
  FROM strains
  WHERE id = (SELECT strain_id FROM csc_batches WHERE id = NEW.batch_id);

  -- 5) HERANWACHSENDE: THC > 10% ist komplett verboten (§ 19 Abs. 3 Nr. 2 KCanG)
  IF v_is_young_adult AND v_strain_thc > 10.0 THEN
    RAISE EXCEPTION 'KCanG Compliance Error: Heranwachsende (18-21) dürfen kein Cannabis mit mehr als 10%% THC erhalten. Strain % hat %.1f%% THC.',
      (SELECT name FROM strains WHERE id = (SELECT strain_id FROM csc_batches WHERE id = NEW.batch_id)),
      v_strain_thc;
  END IF;

  -- 6) Bisherige Abgaben für diesen Member berechnen
  -- Heute (bis jetzt)
  SELECT COALESCE(SUM(amount_grams), 0) INTO v_today_total
  FROM csc_dispensations
  WHERE member_id = NEW.member_id
    AND dispensed_at >= v_today_start
    AND dispensed_at < v_today_start + INTERVAL '1 day';

  -- Dieser Monat
  SELECT COALESCE(SUM(amount_grams), 0) INTO v_month_total
  FROM csc_dispensations
  WHERE member_id = NEW.member_id
    AND dispensed_at >= v_month_start
    AND dispensed_at < v_month_start + INTERVAL '1 month';

  -- 7) Tageslimit prüfen
  IF v_today_total + NEW.amount_grams > 25.0 THEN
    IF v_is_young_adult THEN
      v_error_msg := 'KCanG Compliance Error: Tageslimit überschritten. Heranwachsende max 25g/Tag.';
    ELSE
      v_error_msg := 'KCanG Compliance Error: Tageslimit überschritten. Erwachsene max 25g/Tag.';
    END IF;
    RAISE EXCEPTION '% Neue Abgabe: %.2fg + bereits %.2fg = %.2fg.',
      v_error_msg, NEW.amount_grams, v_today_total, v_today_total + NEW.amount_grams;
  END IF;

  -- 8) Monatslimit prüfen
  IF v_is_young_adult THEN
    IF v_month_total + NEW.amount_grams > 30.0 THEN
      RAISE EXCEPTION 'KCanG Compliance Error: Monatslimit überschritten. Heranwachsende max 30g/Monat. Neue Abgabe: %.2fg + bereits %.2fg = %.2fg.',
        NEW.amount_grams, v_month_total, v_month_total + NEW.amount_grams;
    END IF;
  ELSE
    IF v_month_total + NEW.amount_grams > 50.0 THEN
      RAISE EXCEPTION 'KCanG Compliance Error: Monatslimit überschritten. Erwachsene max 50g/Monat. Neue Abgabe: %.2fg + bereits %.2fg = %.2fg.',
        NEW.amount_grams, v_month_total, v_month_total + NEW.amount_grams;
    END IF;
  END IF;

  -- 9) Alles OK → Row einfügen (kein RETURN wegen BEFORE Trigger)
  RETURN NEW;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: VOR jedem INSERT auf csc_dispensations
CREATE TRIGGER trg_kcang_dispensation_check
  BEFORE INSERT ON csc_dispensations
  FOR EACH ROW
  EXECUTE FUNCTION kcang_dispensation_check();

COMMENT ON FUNCTION kcang_dispensation_check() IS
  'KCanG § 19 Abs. 3 Hard Block: Prüft Tages/Monatslimits + THC-Obergrenze für Heranwachsende VOR jeder Abgabe.';


-- ============================================================
-- 6. updated_at Trigger-Funktion
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_csc_batches_updated_at
  BEFORE UPDATE ON csc_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- csc_dispensations hat kein updated_at (unveränderliche Logs)
-- csc_destructions hat kein updated_at (unveränderliche Logs)


-- ============================================================
-- 7. Qualitätscheck-Helper für csc_batches
-- ============================================================

CREATE OR REPLACE FUNCTION csc_quality_check(p_batch_id UUID, p_passed BOOLEAN, p_notes TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE csc_batches
  SET
    quality_check_passed = p_passed,
    quality_check_notes = p_notes,
    quality_checked_at = now()
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION csc_quality_check(UUID, BOOLEAN, TEXT) IS
  'Setzt den Qualitätscheck-Status eines Batches (§ 11 KCanG).';

COMMIT;

-- ============================================================
-- ROLLBACK (zum Testen):
-- DROP TRIGGER trg_kcang_dispensation_check ON csc_dispensations;
-- DROP FUNCTION kcang_dispensation_check();
-- DROP TABLE csc_destructions;
-- DROP TABLE csc_dispensations;
-- DROP TABLE csc_batches;
-- ============================================================