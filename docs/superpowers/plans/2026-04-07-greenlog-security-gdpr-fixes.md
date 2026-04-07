# GreenLog Security & GDPR Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix P0 security and compliance issues identified in the April 2026 audit — user_badges RLS vulnerability, GDPR delete error handling, cookie banner, ToS consent, and landing page Werbeverbot text.

**Architecture:** 5 independent tasks — each modifies 1-2 files, no cross-dependencies. Tasks can run in parallel. RLS fix requires Supabase migration + API route change.

**Tech Stack:** Next.js 16 (Pages Router), Supabase (Postgres, RLS, Service Role), TypeScript

---

## Task 1: Fix user_badges RLS — Server-Only Badge Assignment

**Files:**
- Modify: `supabase/migrations/20260407000000_fix_user_badges_rls.sql` (create)
- Modify: `src/app/api/badges/check/route.ts:50-57` (change upsert logic)
- Modify: `src/lib/badges.ts` (comment update, no logic change)

**Problem:** Current RLS policy `WITH CHECK (auth.uid() = user_id)` allows any authenticated user to INSERT any badge for themselves via direct Supabase call. Badge criteria are checked client-side in `/api/badges/check`, but a user can bypass that and directly INSERT into `user_badges`.

**Solution:** Change RLS policy to allow only SELECT and DELETE on own badges. INSERT is handled exclusively through the `/api/badges/check` endpoint which uses the service role key and validates criteria server-side.

```sql
-- supabase/migrations/20260407000000_fix_user_badges_rls.sql

-- 1. Drop the INSERT policy that allows users to insert their own badges
DROP POLICY IF EXISTS "Users can insert their own badges" ON user_badges;

-- 2. Create a new INSERT policy that only allows service role to insert badges
-- The API route /api/badges/check uses service role key, so it bypasses RLS
-- Regular users cannot INSERT badges directly — they must earn them via the API
CREATE POLICY "Service role only for badge inserts" ON user_badges
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);  -- No direct inserts allowed

-- 3. Keep SELECT and DELETE policies (users can view and delete their own badges)
-- These are already correct:
-- SELECT: auth.uid() = user_id
-- DELETE: auth.uid() = user_id
```

**API Route Change** (`src/app/api/badges/check/route.ts:50-57`):
Change the `upsert` to use `upsert` with explicit `onConflict` — the service role client bypasses RLS so the INSERT policy doesn't block it. No logic change needed — just confirm the existing code works after the policy change.

Add a comment explaining the security model:

```typescript
// Security: The INSERT policy above blocks direct user inserts.
// Badges can only be earned through this API endpoint which:
// 1. Validates criteria server-side via BADGE_CRITERIA functions
// 2. Uses service role client (bypasses RLS)
// 3. Only inserts if criteriaFn returns true
```

---

## Task 2: GDPR Delete — Fix Auth User Deletion Failure Handling

**Files:**
- Modify: `src/app/api/gdpr/delete/route.ts:154-173`

**Problem:** When `admin.deleteUser()` fails, the function still returns `{success: true}`. The user remains in Supabase Auth but all their data is deleted — they can log in to an empty account.

**Fix:**

```typescript
// Around line 154-173, replace the try/catch block:

let authDeletionSucceeded = false;

try {
  const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(user.id);

  if (deleteAuthError) {
    console.error("Auth user deletion failed:", deleteAuthError.message);
    // Don't throw — we still want to return useful info about what WAS deleted
    // But mark the auth deletion as failed so the client knows
    authDeletionSucceeded = false;
  } else {
    authDeletionSucceeded = true;
  }
} catch (err) {
  console.error("Auth user deletion error:", err);
  authDeletionSucceeded = false;
}

// Update the deletion request with auth status
await serviceClient
  .from('gdpr_deletion_requests')
  .update({
    auth_deleted: authDeletionSucceeded,
    auth_deletion_error: !authDeletionSucceeded ? 'Failed to delete auth user — manual intervention required' : null,
  })
  .eq('id', deletionRequest.id);

// Return failure indicator if auth deletion failed
if (!authDeletionSucceeded) {
  return jsonError(
    "Account data deleted but auth deletion failed. Please contact support.",
    500,
    "AUTH_DELETION_FAILED",
    { deleted_tables: deletedTables, has_active_memberships: hasActiveMemberships }
  );
}

return jsonSuccess({
  message: hasActiveMemberships
    ? "Account anonymized. Organization membership records retained for legal compliance."
    : "Account and all personal data deleted.",
  deletion_type: hasActiveMemberships ? 'anonymize' : 'full_delete',
  deleted_tables: deletedTables,
  has_active_memberships: hasActiveMemberships,
  organizations_retained: hasActiveMemberships
    ? (memberships as OrgMembership[] | null)?.map(m => ({
        id: m.organization_id,
        name: Array.isArray(m.organization)
          ? m.organization[0]?.name ?? null
          : m.organization?.name ?? null,
      }))
    : [],
});
```

Also update the `gdpr_deletion_requests` table schema to include the new columns:

```sql
-- supabase/migrations/20260407000000_fix_gdpr_delete_error_handling.sql
ALTER TABLE gdpr_deletion_requests
ADD COLUMN IF NOT EXISTS auth_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auth_deletion_error text;
```

---

## Task 3: Cookie Banner X-Button — Save "Essential Only" Consent

**Files:**
- Modify: `src/components/cookie-consent-banner.tsx:107-113`

**Problem:** Clicking the X button only hides the banner (`setIsVisible(false)`) but doesn't save a consent decision. On page reload the banner reappears.

**Fix:**

```typescript
// Around line 107-113, replace the X button onClick:

<button
  onClick={() => {
    // Save consent decision — "essential only" is the minimum valid consent
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'essential')
    } catch {
      console.warn('Cookie consent storage failed')
    }
    setConsent('essential')
    setIsVisible(false)
  }}
  className="absolute top-2 right-2 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
  aria-label="Dismiss cookie banner"
>
  <X size={16} />
</button>
```

The `handleEssentialOnly` function (lines 59-67) already does exactly this — just use the same logic for the X button.

---

## Task 4: ToS Consent Checkbox at Signup

**Files:**
- Modify: `src/app/login/page.tsx:188-203`
- Modify: `src/app/api/gdpr/consent/route.ts` (check if it handles terms_of_service)

**Problem:** Signup only records `health_data_processing` consent. `terms_of_service` is not recorded as a consent event, violating DSGVO Art. 7(1) (freely given, specific, informed, unambiguous indication).

**Fix — Add ToS checkbox in login/page.tsx:**

In the `isSignUp` block (around line 188), add a second checkbox for ToS:

```typescript
{isSignUp && (
  <div className="space-y-2">
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={healthDataConsent}
        onChange={(e) => setHealthDataConsent(e.target.checked)}
        className="mt-1 w-4 h-4 rounded border-[var(--border)] bg-[var(--input)] accent-[#00F5FF]"
      />
      <span className="text-xs text-[var(--muted-foreground)] leading-relaxed">
        Ich stimme zu, dass CannaLOG meine medizinischen Cannabis-Daten (Strain-Bewertungen, medizinische Indikationen, Notizen) gemäß Art. 9(2)(a) DSGVO verarbeitet.{" "}
        <a href="/datenschutz" target="_blank" className="text-[#00F5FF] underline">Datenschutzerklärung</a>
      </span>
    </label>

    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={termsConsent}
        onChange={(e) => setTermsConsent(e.target.checked)}
        className="mt-1 w-4 h-4 rounded border-[var(--border)] bg-[var(--input)] accent-[#00F5FF]"
      />
      <span className="text-xs text-[var(--muted-foreground)] leading-relaxed">
        Ich habe die{" "}
        <a href="/agb" target="_blank" className="text-[#00F5FF] underline">Nutzungsbedingungen</a>{" "}
        und{" "}
        <a href="/datenschutz" target="_blank" className="text-[#00F5FF] underline">Datenschutzerklärung</a>{" "}
        gelesen und akzeptiere diese.
      </span>
    </label>
  </div>
)}
```

Add `termsConsent` state and `setTermsConsent` in the `LoginForm` component (around line 30-50 area):

```typescript
const [termsConsent, setTermsConsent] = useState(false)
```

And update the button's disabled condition to include `!termsConsent`:

```typescript
disabled={loading || isSignUp && (!healthDataConsent || !termsConsent)}
```

Update the signup handler to also record ToS consent via the existing consent API. In the `handleSignUp` function (around line 90-100), after the health data consent call, add:

```typescript
// Record ToS consent
await fetch('/api/gdpr/consent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    consent_type: 'terms_of_service',
    granted: true,
    source: 'signup_form',
  }),
});
```

**Note:** Check if `/api/gdpr/consent` route exists and handles `terms_of_service`. If it only handles `health_data_processing`, update it to handle `terms_of_service` as well.

---

## Task 5: Landing Page — Remove "Deine Plattform für Cannabis" Werbeverbot Text

**Files:**
- Modify: `src/app/landing/page.tsx:143-144`
- Modify: `src/app/preview/organic/page.tsx:128`
- Modify: `src/app/preview/bento/page.tsx:39, 44`
- Modify: `src/app/preview/premium/page.tsx:80, 214`
- Modify: `src/app/layout.tsx` (meta descriptions)
- Modify: `src/app/api/og/route.tsx:63`

**Problem:** § 6 KCanG prohibits advertising cannabis products. "Deine Plattform für Cannabis" is promotional. Also "CannaLog macht es einfach" implies ease of cannabis use.

**Fix — Landing page headline (line 143-144):**

Change from:
```tsx
<h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 font-display">
  Deine Plattform für <span className="text-white">Cannabis</span>
</h1>
```

To:
```tsx
<h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 font-display">
  Strain-Datenbank für <span className="text-white">Cannabis-Organisationen</span>
</h1>
```

**Fix — Subheadline (line 150-152):**

Change from:
```tsx
<p className="text-xl text-[var(--muted-foreground)] mb-10 max-w-2xl mx-auto">
  Verwalte Strains, teile Bewertungen und entdecke neue Sorten.
  CannaLog macht es einfach.
</p>
```

To:
```tsx
<p className="text-xl text-[var(--muted-foreground)] mb-10 max-w-2xl mx-auto">
  Verwalte Strains, teile Bewertungen und entdecke neue Sorten.
  Für Clubs und Apotheken.
</p>
```

**Fix — Preview pages (apply same pattern):**

- `preview/organic/page.tsx:128`: Change "Deine Plattform für Cannabis-Kultur" to "Strain-Verwaltung für Cannabis-Organisationen"
- `preview/bento/page.tsx:39`: Change "Die moderne Cannabis-Plattform" to "Die moderne Plattform für Strain-Management"  and line 44 "Cannabis." → "Strains."
- `preview/premium/page.tsx:80`: Change "Exklusive Cannabis-Plattform" to "Exklusive Plattform für Organisationen" and line 214: Remove "Hommage an die Kultur des Cannabis" → replace with neutral text about strain management

**Fix — Meta descriptions in layout.tsx:**

Change metadata descriptions that say "Cannabis Strain Tracking" to neutral alternatives like "Strain database and collection management for cannabis organizations"

**Fix — OG Image route.tsx:63:**

Change "Cannabis Strain Tracking" in the OG image text to "Strain Management"

---

## Execution Order

| Task | Files Touched | Risk |
|------|--------------|------|
| 1 (RLS) | 1 migration + 1 API route | Medium — changes badge insert behavior |
| 2 (GDPR) | 1 API route + 1 migration | Low — improves error handling |
| 3 (Cookie) | 1 component | Low — UX fix |
| 4 (ToS) | 1 page + 1 API route | Low — adds checkbox |
| 5 (Werbeverbot) | 5 files | Low — text changes only |

**Start with Task 2 (GDPR) or Task 3 (Cookie) — lowest risk, quick wins.**
**Task 5 (Werbeverbot) is the most visible change — do it with confidence.**

---

## Verification

After each task:
1. Run `npm run lint` to verify no TypeScript errors
2. Test the specific flow (signup, cookie banner, badge earn, GDPR delete)
3. Commit with message matching the task name

After all tasks:
1. Run `supabase db push` to apply migrations
2. Deploy to Vercel preview
3. Test signup flow end-to-end