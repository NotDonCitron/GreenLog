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

-- ============================================================
-- 5. TIER-2 RAW DATA: Reuse existing ratings and user_collection
-- ============================================================
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS side_effects TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS effect_tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS is_club_feedback BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_collection
  ADD COLUMN IF NOT EXISTS prevention_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prevention_opt_in_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ratings_org_club_feedback
  ON public.ratings (organization_id, strain_id)
  WHERE organization_id IS NOT NULL AND is_club_feedback = true;

CREATE TABLE IF NOT EXISTS public.prevention_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_to_role TEXT NOT NULL DEFAULT 'präventionsbeauftragter'
    CHECK (granted_to_role = 'präventionsbeauftragter'),
  data_scopes TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prevention_consents_org_member_active
  ON public.prevention_consents (organization_id, member_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prevention_consents_org_role_active
  ON public.prevention_consents (organization_id, granted_to_role)
  WHERE revoked_at IS NULL;

ALTER TABLE public.prevention_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own prevention consents" ON public.prevention_consents;
CREATE POLICY "Members can view own prevention consents"
  ON public.prevention_consents
  FOR SELECT
  USING (requesting_user_id() = member_id);

DROP POLICY IF EXISTS "Members can create own prevention consents" ON public.prevention_consents;
CREATE POLICY "Members can create own prevention consents"
  ON public.prevention_consents
  FOR INSERT
  WITH CHECK (
    requesting_user_id() = member_id
    AND is_active_org_member(requesting_user_id(), organization_id)
  );

DROP POLICY IF EXISTS "Members can revoke own prevention consents" ON public.prevention_consents;
CREATE POLICY "Members can revoke own prevention consents"
  ON public.prevention_consents
  FOR UPDATE
  USING (requesting_user_id() = member_id)
  WITH CHECK (requesting_user_id() = member_id);

DROP POLICY IF EXISTS "Prevention officers can view prevention consents" ON public.prevention_consents;
CREATE POLICY "Prevention officers can view prevention consents"
  ON public.prevention_consents
  FOR SELECT
  USING (
    granted_to_role = 'präventionsbeauftragter'
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = prevention_consents.organization_id
        AND om.user_id = requesting_user_id()
        AND om.membership_status = 'active'
        AND om.role = 'präventionsbeauftragter'
    )
  );

-- ============================================================
-- 6. Consent gate for prevention data
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_view_prevention_data(
  p_requester_id TEXT,
  p_member_id TEXT,
  p_organization_id UUID,
  p_scope TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.prevention_consents pc
      ON pc.organization_id = p_organization_id
     AND pc.member_id = p_member_id
    WHERE om.organization_id = p_organization_id
      AND om.user_id = p_requester_id
      AND om.membership_status = 'active'
      AND om.role = 'präventionsbeauftragter'
      AND pc.revoked_at IS NULL
      AND (pc.expires_at IS NULL OR pc.expires_at > now())
      AND pc.granted_to_role = 'präventionsbeauftragter'
      AND p_scope = ANY (pc.data_scopes)
      AND EXISTS (
        SELECT 1
        FROM public.organization_members member_om
        WHERE member_om.organization_id = p_organization_id
          AND member_om.user_id = p_member_id
          AND member_om.membership_status = 'active'
      )
  );
END;
$$;

-- ============================================================
-- 7. Tier-2 RLS: owner-private unless prevention consent exists
-- ============================================================
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON public.ratings;
DROP POLICY IF EXISTS "Ratings viewable by all" ON public.ratings;
DROP POLICY IF EXISTS "Users can create own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can create ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON public.ratings;

CREATE POLICY "Ratings are viewable by owners or consented prevention officers"
  ON public.ratings
  FOR SELECT
  USING (
    requesting_user_id() = user_id
    OR organization_id IS NULL
    OR can_view_prevention_data(requesting_user_id(), user_id, organization_id, 'ratings')
  );

CREATE POLICY "Users can create own ratings"
  ON public.ratings
  FOR INSERT
  WITH CHECK (
    requesting_user_id() = user_id
    AND (
      organization_id IS NULL
      OR is_active_org_member(requesting_user_id(), organization_id)
    )
  );

CREATE POLICY "Users can update own ratings"
  ON public.ratings
  FOR UPDATE
  USING (requesting_user_id() = user_id)
  WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON public.ratings
  FOR DELETE
  USING (requesting_user_id() = user_id);

ALTER TABLE public.user_collection ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own collection" ON public.user_collection;
DROP POLICY IF EXISTS "Users can view own collection" ON public.user_collection;
DROP POLICY IF EXISTS "Public collections are viewable" ON public.user_collection;
DROP POLICY IF EXISTS "Followers can view private collections" ON public.user_collection;
DROP POLICY IF EXISTS "Users can insert into their own collection" ON public.user_collection;
DROP POLICY IF EXISTS "Users can add to collection" ON public.user_collection;
DROP POLICY IF EXISTS "Users can update their own collection" ON public.user_collection;
DROP POLICY IF EXISTS "Users can delete from their own collection" ON public.user_collection;

CREATE POLICY "User collection is viewable by owners or consented prevention officers"
  ON public.user_collection
  FOR SELECT
  USING (
    requesting_user_id() = user_id
    OR can_view_prevention_data(requesting_user_id(), user_id, organization_id, 'user_collection')
  );

CREATE POLICY "Users can add to collection"
  ON public.user_collection
  FOR INSERT
  WITH CHECK (
    requesting_user_id() = user_id
    AND (
      organization_id IS NULL
      OR is_active_org_member(requesting_user_id(), organization_id)
    )
  );

CREATE POLICY "Users can update own collection"
  ON public.user_collection
  FOR UPDATE
  USING (requesting_user_id() = user_id)
  WITH CHECK (
    requesting_user_id() = user_id
    AND (
      organization_id IS NULL
      OR is_active_org_member(requesting_user_id(), organization_id)
    )
  );

CREATE POLICY "Users can delete from own collection"
  ON public.user_collection
  FOR DELETE
  USING (requesting_user_id() = user_id);

-- ============================================================
-- 8. Aggregate-only club analytics with k-anonymity
-- ============================================================
CREATE OR REPLACE VIEW public.club_tier2_analytics AS
SELECT
  r.organization_id,
  r.strain_id,
  COUNT(*)::INT AS sample_size,
  ROUND(AVG(r.overall_rating)::NUMERIC, 1) AS avg_overall_rating,
  ROUND(AVG(r.effect_rating)::NUMERIC, 1) AS avg_effect_rating,
  ROUND(AVG(r.taste_rating)::NUMERIC, 1) AS avg_taste_rating
FROM public.ratings r
JOIN public.organizations o
  ON o.id = r.organization_id
WHERE r.organization_id IS NOT NULL
  AND o.organization_type = 'club'
  AND o.status = 'active'
  AND r.is_club_feedback = true
  AND is_active_org_member(requesting_user_id(), r.organization_id)
GROUP BY r.organization_id, r.strain_id
HAVING COUNT(*) >= 10;

COMMENT ON VIEW public.club_tier2_analytics IS
  'Aggregate-only Tier-2 club analytics with k-anonymity threshold of at least 10 records per group.';

GRANT SELECT ON public.club_tier2_analytics TO authenticated;

COMMIT;
