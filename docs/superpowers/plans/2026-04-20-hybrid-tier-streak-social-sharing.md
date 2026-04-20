# Hybrid Tier + KCanG Streak + Legal Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production-safe Tier-1/Tier-2 data split with DB-enforced KCanG dispensation limits, then add a KCanG-conform user streak system and a legally sanitized social-sharing lab datasheet.

**Architecture:** We extend the existing Supabase schema via additive migrations: Tier 1 (`dispensations`) is protected by BEFORE INSERT PL/pgSQL trigger limits and strict org-role RLS; Tier 2 reuses `ratings` and `user_collection` with consent-gated prevention access and aggregate-only club analytics. Application code reads/writes through dedicated module helpers so UI never bypasses security boundaries. Streak and sharing consume only privacy-safe derived data.

**Tech Stack:** Supabase (Postgres, RLS, pgTAP), Next.js App Router, TypeScript, Vitest, `next/og`

---

## File Structure Map

- Create: `supabase/migrations/20260420213000_hybrid_tier_foundation.sql`
  Responsibility: Tier-1 tables/trigger, Tier-2 consent and aggregate views, RLS policies.
- Create: `supabase/tests/kcang_dispensation_limits.test.sql`
  Responsibility: pgTAP tests for 25g/day and 50g/30g monthly enforcement.
- Create: `supabase/tests/rls_tier2_prevention_access.test.sql`
  Responsibility: pgTAP tests for owner-only Tier-2 raw access and consent-gated prevention read.
- Create: `src/lib/csc/dispensation.ts`
  Responsibility: typed command wrapper for dispensation inserts and trigger error mapping.
- Create: `src/lib/csc/prevention.ts`
  Responsibility: consent checks, prevention case reads, audit-log writes.
- Create: `src/lib/streaks.ts`
  Responsibility: KCanG-safe streak computation from allowed activity classes.
- Create: `src/lib/streaks.test.ts`
  Responsibility: unit tests for streak continuity and reset logic.
- Modify: `src/lib/public-activity.ts`
  Responsibility: enforce legal sharing payload whitelist (no Tier-1/Tier-2 private fields).
- Modify: `src/components/social/share-modal.tsx`
  Responsibility: user-facing legal copy and share mode for lab datasheet card.
- Modify: `src/app/api/og/route.tsx`
  Responsibility: `mode=laborblatt` rendering with explicit redaction and compliance footer.
- Modify: `src/lib/public-activity.test.ts`
  Responsibility: regression tests that private fields cannot enter public payload.
- Modify: `src/lib/types.ts`
  Responsibility: add types for dispensations, consent records, and streak summary.
- Modify: `docs/compliance/LEGAL-SUMMARY.md`
  Responsibility: document trigger-first enforcement and Tier separation.

### Task 1: Build Tier-1 SQL Foundation with Trigger-First KCanG Limits

**Files:**
- Create: `supabase/tests/kcang_dispensation_limits.test.sql`
- Create: `supabase/migrations/20260420213000_hybrid_tier_foundation.sql`

- [ ] **Step 1: Write failing pgTAP test for daily/monthly limits**

```sql
BEGIN;
SELECT plan(3);

INSERT INTO public.organizations (id, name, slug, organization_type, created_by)
VALUES ('40000000-0000-0000-0000-000000000001', 'Tier1 Test Org', 'tier1-test-org', 'club', 'staff-1');

INSERT INTO public.profiles (id, username) VALUES
  ('user-adult', 'user_adult'),
  ('staff-1', 'staff_1');

INSERT INTO public.organization_members (organization_id, user_id, role, membership_status, legal_age_group)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'user-adult', 'member', 'active', 'adult'),
  ('40000000-0000-0000-0000-000000000001', 'staff-1', 'admin', 'active', 'adult');

INSERT INTO public.dispensations (organization_id, member_id, dispensed_by, grams, dispensed_at)
VALUES ('40000000-0000-0000-0000-000000000001', 'user-adult', 'staff-1', 25, now());

SELECT throws_ok(
  $$INSERT INTO public.dispensations (organization_id, member_id, dispensed_by, grams, dispensed_at)
    VALUES ('40000000-0000-0000-0000-000000000001', 'user-adult', 'staff-1', 26, now())$$,
  'KCANG_DAILY_LIMIT_EXCEEDED: 25g/day',
  'Daily limit is enforced by DB trigger.'
);

SELECT throws_ok(
  $$INSERT INTO public.dispensations (organization_id, member_id, dispensed_by, grams, dispensed_at)
    VALUES ('40000000-0000-0000-0000-000000000001', 'user-adult', 'staff-1', 1, date_trunc('month', now()) + interval '20 days')$$,
  'KCANG_MONTHLY_LIMIT_EXCEEDED: 50g/month',
  'Adult monthly limit is enforced by DB trigger.'
);

SELECT pass('Tier-1 trigger tests prepared');
ROLLBACK;
```

- [ ] **Step 2: Run DB tests and confirm they fail before migration**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && supabase test db --local --debug`
Expected: FAIL with `relation "public.dispensations" does not exist`.

- [ ] **Step 3: Implement Tier-1 migration (table + trigger + RLS)**

```sql
CREATE TABLE IF NOT EXISTS public.dispensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dispensed_by TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  grams NUMERIC(6,2) NOT NULL CHECK (grams > 0),
  thc_percent NUMERIC(5,2),
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.enforce_kcang_dispensation_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_age_group TEXT;
  v_daily_total NUMERIC(8,2);
  v_monthly_total NUMERIC(8,2);
  v_month_limit NUMERIC(8,2);
BEGIN
  -- trigger-first legal enforcement (service only handles exception)
  SELECT legal_age_group INTO v_age_group
  FROM public.organization_members
  WHERE organization_id = NEW.organization_id
    AND user_id = NEW.member_id
    AND membership_status = 'active'
  LIMIT 1;

  IF v_age_group IS NULL THEN
    RAISE EXCEPTION 'KCANG_MEMBER_NOT_ACTIVE_OR_AGE_GROUP_MISSING';
  END IF;

  v_month_limit := CASE WHEN v_age_group = 'heranwachsend' THEN 30 ELSE 50 END;

  SELECT COALESCE(SUM(grams), 0) INTO v_daily_total
  FROM public.dispensations
  WHERE organization_id = NEW.organization_id
    AND member_id = NEW.member_id
    AND dispensed_at::date = NEW.dispensed_at::date;

  IF (v_daily_total + NEW.grams) > 25 THEN
    RAISE EXCEPTION 'KCANG_DAILY_LIMIT_EXCEEDED: 25g/day';
  END IF;

  SELECT COALESCE(SUM(grams), 0) INTO v_monthly_total
  FROM public.dispensations
  WHERE organization_id = NEW.organization_id
    AND member_id = NEW.member_id
    AND date_trunc('month', dispensed_at) = date_trunc('month', NEW.dispensed_at);

  IF (v_monthly_total + NEW.grams) > v_month_limit THEN
    RAISE EXCEPTION 'KCANG_MONTHLY_LIMIT_EXCEEDED: %g/month', v_month_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_kcang_dispensation_limits
  BEFORE INSERT ON public.dispensations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_kcang_dispensation_limits();
```

- [ ] **Step 4: Re-run DB tests and confirm trigger behavior passes**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && supabase test db --local --debug`
Expected: PASS for `kcang_dispensation_limits.test.sql`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260420213000_hybrid_tier_foundation.sql supabase/tests/kcang_dispensation_limits.test.sql
git commit -m "feat(db): add tier-1 dispensations with trigger-enforced kcang limits"
```

### Task 2: Implement Tier-2 Integration Using Existing `ratings` + `user_collection`

**Files:**
- Modify: `supabase/migrations/20260420213000_hybrid_tier_foundation.sql`
- Create: `supabase/tests/rls_tier2_prevention_access.test.sql`

- [ ] **Step 1: Write failing RLS test for owner-only and prevention consent exception**

```sql
BEGIN;
SELECT plan(2);

-- setup rating row for member-a in org-1
SELECT results_eq(
  $$SELECT count(*)::int FROM public.ratings WHERE user_id = 'member-a'$$,
  ARRAY[0],
  'Admin without consent cannot read Tier-2 raw ratings.'
);

SELECT results_eq(
  $$SELECT count(*)::int FROM public.ratings WHERE user_id = 'member-a'$$,
  ARRAY[1],
  'Prevention officer with active consent can read scoped Tier-2 data.'
);
ROLLBACK;
```

- [ ] **Step 2: Extend migration to reuse existing tables (no redundant feedback table)**

```sql
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS side_effects TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS effect_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_club_feedback BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_collection
  ADD COLUMN IF NOT EXISTS prevention_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prevention_opt_in_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.prevention_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_to_role TEXT NOT NULL CHECK (granted_to_role = 'präventionsbeauftragter'),
  data_scopes TEXT[] NOT NULL DEFAULT '{}',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
```

- [ ] **Step 3: Add consent-gated function and RLS policies**

```sql
CREATE OR REPLACE FUNCTION public.can_view_prevention_data(
  p_requester TEXT,
  p_member TEXT,
  p_org UUID,
  p_scope TEXT
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    JOIN public.prevention_consents c
      ON c.organization_id = m.organization_id
     AND c.member_id = p_member
    WHERE m.user_id = p_requester
      AND m.organization_id = p_org
      AND m.role = 'präventionsbeauftragter'
      AND m.membership_status = 'active'
      AND c.revoked_at IS NULL
      AND p_scope = ANY(c.data_scopes)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Ratings viewable by all" ON public.ratings;
CREATE POLICY "ratings_owner_or_prevention" ON public.ratings
  FOR SELECT USING (
    requesting_user_id() = user_id
    OR can_view_prevention_data(requesting_user_id(), user_id, organization_id, 'ratings')
  );
```

- [ ] **Step 4: Add aggregate-only club view with k-anonymity threshold**

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS public.club_strain_feedback_agg AS
SELECT organization_id, strain_id, COUNT(*) AS sample_size, AVG(effect_rating) AS avg_effect
FROM public.ratings
WHERE organization_id IS NOT NULL AND is_club_feedback = true
GROUP BY organization_id, strain_id
HAVING COUNT(*) >= 10;
```

- [ ] **Step 5: Run DB tests and commit**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && supabase test db --local --debug`
Expected: PASS for both Tier-1 and Tier-2 policy tests.

```bash
git add supabase/migrations/20260420213000_hybrid_tier_foundation.sql supabase/tests/rls_tier2_prevention_access.test.sql
git commit -m "feat(db): enforce tier-2 consent-gated raw access and aggregate analytics"
```

### Task 3: Add Typed Compliance/Prevention Service Layer

**Files:**
- Create: `src/lib/csc/dispensation.ts`
- Create: `src/lib/csc/prevention.ts`
- Modify: `src/lib/types.ts`
- Create: `src/lib/csc/dispensation.test.ts`

- [ ] **Step 1: Write failing unit tests for trigger-exception mapping**

```ts
it("maps DB limit exception to domain error", async () => {
  const err = new Error("KCANG_DAILY_LIMIT_EXCEEDED: 25g/day");
  expect(mapDispensationError(err)).toEqual({ code: "daily_limit", retryable: false });
});
```

- [ ] **Step 2: Implement minimal service wrappers**

```ts
export async function createDispensation(input: CreateDispensationInput) {
  const { error, data } = await supabase.from("dispensations").insert(input).select().single();
  if (error) throw mapDispensationError(error);
  return data;
}
```

- [ ] **Step 3: Run unit tests and commit**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run test -- src/lib/csc/dispensation.test.ts`
Expected: PASS.

```bash
git add src/lib/csc/dispensation.ts src/lib/csc/prevention.ts src/lib/types.ts src/lib/csc/dispensation.test.ts
git commit -m "feat(app): add typed compliance and prevention data access layer"
```

### Task 4: Implement KCanG-Conform Streak System

**Files:**
- Create: `src/lib/streaks.ts`
- Create: `src/lib/streaks.test.ts`
- Modify: `src/lib/public-activity.ts`

- [ ] **Step 1: Write failing streak tests with legal-safe activity scope**

```ts
it("counts consecutive days from privacy-safe events only", () => {
  const streak = computeCurrentStreak([
    { day: "2026-04-18", type: "rating" },
    { day: "2026-04-19", type: "strain_collected" },
    { day: "2026-04-20", type: "private_prevention_note" },
  ]);
  expect(streak).toBe(2);
});
```

- [ ] **Step 2: Implement streak calculator and whitelist**

```ts
const STREAK_SAFE_TYPES = new Set(["rating", "strain_collected", "quick_log_public"]);

export function computeCurrentStreak(events: ActivityDay[]): number {
  const daySet = new Set(
    events
      .filter((event) => STREAK_SAFE_TYPES.has(event.type))
      .map((event) => event.day),
  );

  const today = new Date().toISOString().slice(0, 10);
  let cursor = new Date(`${today}T00:00:00.000Z`);
  let streak = 0;

  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}
```

- [ ] **Step 3: Run tests and commit**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run test -- src/lib/streaks.test.ts`
Expected: PASS.

```bash
git add src/lib/streaks.ts src/lib/streaks.test.ts src/lib/public-activity.ts
git commit -m "feat: add kcang-conform streak calculation from privacy-safe activities"
```

### Task 5: Build Rechtskonformes Labor-Datenblatt for Social Sharing

**Files:**
- Modify: `src/app/api/og/route.tsx`
- Modify: `src/components/social/share-modal.tsx`
- Modify: `src/lib/public-activity.test.ts`

- [ ] **Step 1: Write failing sanitizer test to block private fields in share payload**

```ts
it("removes Tier-1 and private Tier-2 fields from public share payload", () => {
  const payload = buildPublicRatingActivityPayload({
    rating: 4.2,
    strainSlug: "x",
    batch: "B-123",
    dose: "0.4g",
    privateNotes: "panic",
  });
  expect(payload).not.toHaveProperty("batch");
  expect(payload).not.toHaveProperty("dose");
});
```

- [ ] **Step 2: Implement OG laborblatt mode with explicit disclosure**

```tsx
if (mode === "laborblatt") {
  const disclaimer = "Nur anonymisierte/öffentliche Analysedaten. Keine Abgabe- oder Gesundheits-Einzeldaten.";
  return new ImageResponse(<div>{disclaimer}</div>, { width: 1200, height: 630 });
}
```

- [ ] **Step 3: Update ShareModal copy and URL mode**

```ts
const shareUrl = `${BASE_URL}${strainUrl}?share=laborblatt`;
const caption = `Labor-Datenblatt (öffentlich, datenschutzkonform) für ${strainName}.`;
```

- [ ] **Step 4: Run tests and commit**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run test -- src/lib/public-activity.test.ts`
Expected: PASS.

```bash
git add src/app/api/og/route.tsx src/components/social/share-modal.tsx src/lib/public-activity.test.ts
git commit -m "feat: add legal labor-datasheet social sharing mode with strict redaction"
```

### Task 6: Compliance Docs + Final Verification

**Files:**
- Modify: `docs/compliance/LEGAL-SUMMARY.md`

- [ ] **Step 1: Document legal controls implemented in code**

```md
- Tier 1 limits enforced by Postgres BEFORE INSERT trigger (`enforce_kcang_dispensation_limits`).
- Tier 2 raw access remains owner-only except active prevention consent.
- Club dashboards read aggregate views with k-anonymity threshold (>=10).
```

- [ ] **Step 2: Run full targeted verification**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run test -- src/lib/csc/dispensation.test.ts src/lib/streaks.test.ts src/lib/public-activity.test.ts`
Expected: PASS.

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && supabase test db --local --debug`
Expected: PASS for new pgTAP suites.

- [ ] **Step 3: Commit**

```bash
git add docs/compliance/LEGAL-SUMMARY.md
git commit -m "docs: record hybrid tier controls and trigger-first kcang enforcement"
```
