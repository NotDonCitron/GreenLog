---
status: active
trigger: "Profile page error.tsx when NOT logged in - guest mode broken"
created: 2026-04-06T12:00:00Z
updated: 2026-04-06T12:00:00Z
---

## Current Focus

**Investigating:** Profile page shows error boundary when user is not logged in

hypothesis: "supabase client lazy proxy throws unhandled error when user is null and isDemoMode is false, OR fetchProfile() throws when user is null"

test: "Read profile-view.tsx fetchProfile function, client.ts lazy proxy initialization, and auth-provider.tsx isDemoMode init"

expecting: "find_root_cause: why unhandled error is thrown for logged-out users"

next_action: "Read profile-view.tsx fetchProfile, client.ts initialization, auth-provider.tsx isDemoMode"

## Symptoms

expected: Profile page loads gracefully for guests (logged-out users)
actual: Error boundary "Etwas ist schiefgelaufen" appears when user is not logged in
errors:
  - Next.js error.tsx boundary triggered - unhandled error during client-side rendering
reproduction: "1. App öffnen → nicht eingeloggt → /profile aufrufen → Error Boundary appears"
started: After an update (user didn't notice because everything worked when logged in)

## Hypothesis

The supabase client (Lazy Proxy in src/lib/supabase/client.ts) or fetchProfile() in profile-view.tsx throws an unhandled error when user is null and isDemoMode is false. Also needs to check how isDemoMode initializes on the Capacitor WebView where localStorage might not be available.

## Files to Investigate

1. src/lib/supabase/client.ts — lazy proxy behavior when window is not available or Supabase URL is invalid
2. src/app/profile/profile-view.tsx line 351-441 (fetchProfile) — error thrown when user is null
3. src/components/auth-provider.tsx — isDemoMode initialization, localStorage dependency

## Mode

goal: find_and_fix

## Root Cause

**INVESTIGATING** — not yet determined

## Resolution

root_cause: "Line 524 in profile-view.tsx — `<Image src=\"/logo-transparent.png\" .../>` used without importing Image from next/image. Guest view (rendered when !user && !isDemoMode) contains this broken Image usage."
fix: "Replaced `<Image>` with regular `<img>` tag"
files_changed: ["src/app/profile/profile-view.tsx"]
verification: ""
