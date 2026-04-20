-- ============================================================
-- GreenLog Hybrid Tier Foundation
-- Tier 1: DB-enforced dispensation limits for KCanG compliance
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ORGANIZATION MEMBERS: age-group context for dispensations
-- ============================================================
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS legal_age_group TEXT;

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_legal_age_group_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_legal_age_group_check
  CHECK (legal_age_group IN ('adult', 'heranwachsend'));

COMMENT ON COLUMN public.organization_members.legal_age_group IS
  'KCanG age-group context for dispensations: adult or heranwachsend. Null means missing context and must be handled by the trigger.';

-- ============================================================
-- 2. DISPENSATIONS: Tier-1 legal record
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dispensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  member_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  dispensed_by TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  grams NUMERIC(10, 2) NOT NULL CHECK (grams > 0),
  thc_percent NUMERIC(5, 2) CHECK (thc_percent >= 0 AND thc_percent <= 100),
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispensations_org_member_date
  ON public.dispensations (organization_id, member_id, dispensed_at);

CREATE INDEX IF NOT EXISTS idx_dispensations_org_date
  ON public.dispensations (organization_id, dispensed_at);

COMMENT ON TABLE public.dispensations IS
  'Tier-1 dispensations governed by KCanG daily and monthly limits.';

-- ============================================================
-- 3. KCanG trigger: block invalid dispensations before insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_kcang_dispensation_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_age_group TEXT;
  v_daily_total NUMERIC(10, 2);
  v_monthly_total NUMERIC(10, 2);
  v_month_limit INTEGER;
BEGIN
  SELECT om.legal_age_group
    INTO v_age_group
  FROM public.organization_members om
  WHERE om.organization_id = NEW.organization_id
    AND om.user_id = NEW.member_id
    AND om.membership_status = 'active'
  LIMIT 1;

  IF v_age_group IS NULL THEN
    RAISE EXCEPTION 'KCANG_MEMBER_AGE_GROUP_MISSING';
  END IF;

  v_month_limit := CASE
    WHEN v_age_group = 'heranwachsend' THEN 30
    ELSE 50
  END;

  SELECT COALESCE(SUM(d.grams), 0)
    INTO v_daily_total
  FROM public.dispensations d
  WHERE d.organization_id = NEW.organization_id
    AND d.member_id = NEW.member_id
    AND d.dispensed_at::date = NEW.dispensed_at::date;

  IF (v_daily_total + NEW.grams) > 25 THEN
    RAISE EXCEPTION 'KCANG_DAILY_LIMIT_EXCEEDED: 25g/day';
  END IF;

  SELECT COALESCE(SUM(d.grams), 0)
    INTO v_monthly_total
  FROM public.dispensations d
  WHERE d.organization_id = NEW.organization_id
    AND d.member_id = NEW.member_id
    AND date_trunc('month', d.dispensed_at) = date_trunc('month', NEW.dispensed_at);

  IF (v_monthly_total + NEW.grams) > v_month_limit THEN
    RAISE EXCEPTION 'KCANG_MONTHLY_LIMIT_EXCEEDED: %g/month', v_month_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_kcang_dispensation_limits ON public.dispensations;

CREATE TRIGGER trg_enforce_kcang_dispensation_limits
  BEFORE INSERT ON public.dispensations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_kcang_dispensation_limits();

-- ============================================================
-- 4. Minimal RLS aligned with requesting_user_id() helpers
-- ============================================================
ALTER TABLE public.dispensations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dispensations are viewable by org members" ON public.dispensations;
CREATE POLICY "Dispensations are viewable by org members"
  ON public.dispensations
  FOR SELECT
  USING (
    requesting_user_id() = member_id
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = dispensations.organization_id
        AND om.user_id = requesting_user_id()
        AND om.membership_status = 'active'
        AND om.role IN ('gründer', 'admin', 'staff', 'präventionsbeauftragter')
    )
  );

DROP POLICY IF EXISTS "Dispensations are insertable by org admins" ON public.dispensations;
CREATE POLICY "Dispensations are insertable by org admins"
  ON public.dispensations
  FOR INSERT
  WITH CHECK (
    requesting_user_id() = dispensed_by
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = dispensations.organization_id
        AND om.user_id = requesting_user_id()
        AND om.membership_status = 'active'
        AND om.role IN ('gründer', 'admin', 'staff')
    )
  );

COMMIT;
