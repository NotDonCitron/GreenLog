-- Phase 2: Data Integrity & Schema Consistency
-- Date: 2026-04-16
-- Scope: Constraints, indexes, FK fixes, trigger fix, grow_comments.grow_id

-- ============================================================
-- 1. FIX: kcang_dispensation_check() references non-existent avg_thc
--    Use (thc_min + thc_max) / 2 instead
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
  v_today := CURRENT_DATE;
  v_today_start := v_today::TIMESTAMPTZ;
  v_month_start := (DATE_TRUNC('month', v_today))::TIMESTAMPTZ;

  -- 1) Member-Geburtsdatum holen
  SELECT p.date_of_birth INTO v_member_birthdate
  FROM profiles p
  WHERE p.id = NEW.member_id;

  IF v_member_birthdate IS NULL THEN
    RAISE EXCEPTION 'KCanG Compliance Error: Kein Geburtsdatum für Member % hinterlegt. Altersprüfung nicht möglich.', NEW.member_id;
  END IF;

  -- 2) Alter berechnen
  v_member_age := DATE_PART('year', AGE(NEW.dispensed_at, v_member_birthdate));

  -- 3) Heranwachsende (18-21)?
  v_is_young_adult := (v_member_age >= 18 AND v_member_age < 21);

  -- 4) THC-Gehalt der Sorte holen (FIX: use thc_min/thc_max instead of avg_thc)
  SELECT COALESCE((s.thc_min + s.thc_max) / 2, s.thc_max, s.thc_min, 0) INTO v_strain_thc
  FROM strains s
  WHERE s.id = (SELECT strain_id FROM csc_batches WHERE id = NEW.batch_id);

  -- 5) HERANWACHSENDE: THC > 10% ist komplett verboten (§ 19 Abs. 3 Nr. 2 KCanG)
  IF v_is_young_adult AND v_strain_thc > 10.0 THEN
    RAISE EXCEPTION 'KCanG Compliance Error: Heranwachsende (18-21) dürfen kein Cannabis mit mehr als 10%% THC erhalten. Strain % hat %.1f%% THC.',
      (SELECT name FROM strains WHERE id = (SELECT strain_id FROM csc_batches WHERE id = NEW.batch_id)),
      v_strain_thc;
  END IF;

  -- 6) Bisherige Abgaben
  SELECT COALESCE(SUM(amount_grams), 0) INTO v_today_total
  FROM csc_dispensations
  WHERE member_id = NEW.member_id
    AND dispensed_at >= v_today_start
    AND dispensed_at < v_today_start + INTERVAL '1 day';

  SELECT COALESCE(SUM(amount_grams), 0) INTO v_month_total
  FROM csc_dispensations
  WHERE member_id = NEW.member_id
    AND dispensed_at >= v_month_start
    AND dispensed_at < v_month_start + INTERVAL '1 month';

  -- 7) Tageslimit
  IF v_today_total + NEW.amount_grams > 25.0 THEN
    IF v_is_young_adult THEN
      v_error_msg := 'KCanG Compliance Error: Tageslimit überschritten. Heranwachsende max 25g/Tag.';
    ELSE
      v_error_msg := 'KCanG Compliance Error: Tageslimit überschritten. Erwachsene max 25g/Tag.';
    END IF;
    RAISE EXCEPTION '% Neue Abgabe: %.2fg + bereits %.2fg = %.2fg.',
      v_error_msg, NEW.amount_grams, v_today_total, v_today_total + NEW.amount_grams;
  END IF;

  -- 8) Monatslimit
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. ADD CHECK CONSTRAINTS (percentage ranges, numeric bounds)
-- ============================================================

-- Strains: THC/CBD percentage ranges (0-100) + min <= max
ALTER TABLE strains ADD CONSTRAINT strains_thc_min_range
  CHECK (thc_min IS NULL OR (thc_min >= 0 AND thc_min <= 100));
ALTER TABLE strains ADD CONSTRAINT strains_thc_max_range
  CHECK (thc_max IS NULL OR (thc_max >= 0 AND thc_max <= 100));
ALTER TABLE strains ADD CONSTRAINT strains_cbd_min_range
  CHECK (cbd_min IS NULL OR (cbd_min >= 0 AND cbd_min <= 100));
ALTER TABLE strains ADD CONSTRAINT strains_cbd_max_range
  CHECK (cbd_max IS NULL OR (cbd_max >= 0 AND cbd_max <= 100));
ALTER TABLE strains ADD CONSTRAINT strains_thc_min_max
  CHECK (thc_min IS NULL OR thc_max IS NULL OR thc_min <= thc_max);
ALTER TABLE strains ADD CONSTRAINT strains_cbd_min_max
  CHECK (cbd_min IS NULL OR cbd_max IS NULL OR cbd_min <= cbd_max);

-- Strains: Add ruderalis to type CHECK
ALTER TABLE strains DROP CONSTRAINT IF EXISTS strains_type_check;
ALTER TABLE strains ADD CONSTRAINT strains_type_check
  CHECK (type IN ('indica', 'sativa', 'hybrid', 'ruderalis'));

-- User collection: THC/CBD percent ranges
ALTER TABLE user_collection ADD CONSTRAINT user_collection_thc_range
  CHECK (user_thc_percent IS NULL OR (user_thc_percent >= 0 AND user_thc_percent <= 100));
ALTER TABLE user_collection ADD CONSTRAINT user_collection_cbd_range
  CHECK (user_cbd_percent IS NULL OR (user_cbd_percent >= 0 AND user_cbd_percent <= 100));

-- Grow entries: measurement ranges
ALTER TABLE grow_entries ADD CONSTRAINT grow_entries_humidity_range
  CHECK (humidity IS NULL OR (humidity >= 0 AND humidity <= 100));
ALTER TABLE grow_entries ADD CONSTRAINT grow_entries_ph_range
  CHECK (ph_value IS NULL OR (ph_value >= 0 AND ph_value <= 14));
ALTER TABLE grow_entries ADD CONSTRAINT grow_entries_temp_range
  CHECK (temperature IS NULL OR (temperature >= -50 AND temperature <= 70));
ALTER TABLE grow_entries ADD CONSTRAINT grow_entries_height_positive
  CHECK (height_cm IS NULL OR height_cm >= 0);
ALTER TABLE grow_entries ADD CONSTRAINT grow_entries_ec_range
  CHECK (ec_value IS NULL OR (ec_value >= 0 AND ec_value <= 50));
ALTER TABLE grow_entries ADD CONSTRAINT grow_entries_water_temp_range
  CHECK (water_temperature IS NULL OR (water_temperature >= 0 AND water_temperature <= 100));
ALTER TABLE grow_entries ADD CONSTRAINT grow_entries_nutrient_positive
  CHECK (nutrient_dose IS NULL OR nutrient_dose >= 0);
ALTER TABLE grow_entries ADD CONSTRAINT grow_entries_day_positive
  CHECK (day_number IS NULL OR day_number >= 0);

-- Grows: yield positive
ALTER TABLE grows ADD CONSTRAINT grows_yield_positive
  CHECK (yield_grams IS NULL OR yield_grams >= 0);

-- Self-follow prevention
ALTER TABLE follows ADD CONSTRAINT follows_no_self_follow
  CHECK (follower_id != following_id);
ALTER TABLE follow_requests ADD CONSTRAINT follow_requests_no_self
  CHECK (requester_id != target_id);

-- Partial unique: one pending invite per email per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invites_unique_pending
  ON organization_invites(organization_id, email) WHERE status = 'pending';

-- ============================================================
-- 3. INDEXES (missing, based on query pattern analysis)
-- ============================================================

-- Strains: ORDER BY name on main listing page
CREATE INDEX IF NOT EXISTS idx_strains_name ON strains(name);
CREATE INDEX IF NOT EXISTS idx_strains_org_name ON strains(organization_id, name);

-- Strains: GIN indexes for array containment filters
CREATE INDEX IF NOT EXISTS idx_strains_effects_gin ON strains USING GIN (effects);
CREATE INDEX IF NOT EXISTS idx_strains_flavors_gin ON strains USING GIN (flavors);

-- Strains: THC/CBD range filters
CREATE INDEX IF NOT EXISTS idx_strains_thc_max ON strains(thc_max);
CREATE INDEX IF NOT EXISTS idx_strains_thc_min ON strains(thc_min);

-- Organization members: most-repeated auth check pattern
CREATE INDEX IF NOT EXISTS idx_org_members_org_user_status
  ON organization_members(organization_id, user_id, membership_status);
CREATE INDEX IF NOT EXISTS idx_org_members_user_status
  ON organization_members(user_id, membership_status);

-- Notifications: composite for sorted polling (30s interval)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- User activities: composite for user feed
CREATE INDEX IF NOT EXISTS idx_user_activities_user_created
  ON user_activities(user_id, created_at DESC);

-- Follow requests: pending lookups
CREATE INDEX IF NOT EXISTS idx_follow_requests_target_status
  ON follow_requests(target_id, status);

-- ============================================================
-- 4. FK ON DELETE fixes (prevent blocking on user/org deletion)
-- ============================================================

-- organizations.created_by → SET NULL (org survives creator leaving)
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_created_by_fkey;
ALTER TABLE organizations ADD CONSTRAINT organizations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- strains.created_by → SET NULL
ALTER TABLE strains DROP CONSTRAINT IF EXISTS strains_created_by_fkey;
ALTER TABLE strains ADD CONSTRAINT strains_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- organization_members.invited_by → SET NULL
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_invited_by_fkey;
ALTER TABLE organization_members ADD CONSTRAINT organization_members_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- organization_invites.invited_by → SET NULL
ALTER TABLE organization_invites DROP CONSTRAINT IF EXISTS organization_invites_invited_by_fkey;
ALTER TABLE organization_invites ADD CONSTRAINT organization_invites_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- strain_reports.reviewed_by → SET NULL
ALTER TABLE strain_reports DROP CONSTRAINT IF EXISTS strain_reports_reviewed_by_fkey;
ALTER TABLE strain_reports ADD CONSTRAINT strain_reports_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- CSC compliance tables: RESTRICT on org deletion (KCanG § 26 data retention)
ALTER TABLE csc_batches DROP CONSTRAINT IF EXISTS csc_batches_organization_id_fkey;
ALTER TABLE csc_batches ADD CONSTRAINT csc_batches_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE csc_dispensations DROP CONSTRAINT IF EXISTS csc_dispensations_organization_id_fkey;
ALTER TABLE csc_dispensations ADD CONSTRAINT csc_dispensations_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE csc_destructions DROP CONSTRAINT IF EXISTS csc_destructions_organization_id_fkey;
ALTER TABLE csc_destructions ADD CONSTRAINT csc_destructions_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;

-- ============================================================
-- 5. FIX: grow_comments needs grow_id column (code queries by it)
-- ============================================================

ALTER TABLE grow_comments ADD COLUMN IF NOT EXISTS grow_id UUID REFERENCES grows(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_grow_comments_grow ON grow_comments(grow_id);

-- ============================================================
-- 6. strains.organization_id: ensure ON DELETE SET NULL
-- ============================================================

ALTER TABLE strains DROP CONSTRAINT IF EXISTS strains_organization_id_fkey;
ALTER TABLE strains ADD CONSTRAINT strains_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
