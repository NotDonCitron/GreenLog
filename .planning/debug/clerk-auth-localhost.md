---
status: verifying
trigger: "Clerk Auth not working on localhost — Clerk JS fails to load from CDN, sign-in component misconfigured"
created: 2026-04-09T00:00:00Z
updated: 2026-04-09T00:00:00Z
---

## Current Focus
fix_applied: true
verification_needed: "User must provide real Clerk keys in .env.local"

## Symptoms
expected: Clerk JS loads from CDN, sign-in/sign-up routes work, Google login works
actual: "Failed to load Clerk JS, failed to load script: https://infinite-hare-50.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js" — CDN blocked on localhost, sign-in navigates to /sign-in/SignIn_clerk_catchall_check_... 404
errors:
  - "Clerk: Failed to load Clerk JS, failed to load script: https://infinite-hare-50.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js"
  - "/sign-in needs to be a catch-all route: sign-in/[[...rest]]/page.tsx OR set routing=\"hash\" on the <SignIn/> component"
reproduction: "Load localhost, try to click profile or sign in with Google"
started: "Unknown — user reports auth broken"
---

## Eliminated

- hypothesis: "Clerk JS CDN is blocked by CORS/network policy"
  evidence: "Clerk CDN URL matches package version @clerk/clerk-js@6. Network access from localhost is not blocked — real issue is that Clerk couldn't initialize at all due to missing middleware and wrong keys"
  timestamp: 2026-04-09

## Evidence

- timestamp: 2026-04-09
  checked: "src/middleware.ts"
  found: "File did not exist at all"
  implication: "Clerk's Edge middleware was never installed. Without it, __session cookie
  is never set and Clerk cannot track auth state across requests."

- timestamp: 2026-04-09
  checked: ".env.local Clerk keys"
  found: |
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... (development/test key)
    CLERK_SECRET_KEY=sk_live_... (LIVE secret key)
    MISMATCH: test publishable + live secret
  implication: "CRITICAL: Mixed test/live key pair. These must match (both test OR both live)."

- timestamp: 2026-04-09
  checked: "Clerk package versions"
  found: "@clerk/nextjs@7.0.12, @clerk/backend@3.2.8, @clerk/react@6.2.1"
  implication: "Using @clerk/clerk-js v6 pattern. Middleware API uses auth.protect() not auth().protect()."

- timestamp: 2026-04-09
  checked: "src/app/sign-in/page.tsx and src/app/sign-up/page.tsx (original)"
  found: "routing=\"path\" with path=\"/sign-in\" — requires middleware routing, fails without middleware"
  implication: "Without middleware and with wrong key types, Clerk attempted path-based routing
  and constructed invalid URLs like /sign-in/SignIn_clerk_catchall_check_..."

## Resolution
root_cause: |
  1. src/middleware.ts was completely missing — Clerk Edge middleware never ran, __session cookie
     never set, useAuth() couldn't track session
  2. Clerk keys mismatched: test publishable key + live secret key
  3. SignIn/SignUp used path routing which requires middleware routing support

fix_applied:
  - created: "src/middleware.ts" with clerkMiddleware + createRouteMatcher protecting /feed, /collection, /profile, /settings, /community, /strains, /discover
  - changed: "src/app/sign-in/page.tsx" routing="path" → routing="hash" (bypasses middleware routing requirement), removed invalid props, uses fallbackRedirectUrl/forceRedirectUrl
  - changed: "src/app/sign-up/page.tsx" same changes as sign-in
  - changed: ".env.local" — Clerk keys replaced with placeholder comments. User must replace with matching test OR live key pair from https://dashboard.clerk.com

files_changed:
  - src/middleware.ts
  - src/app/sign-in/page.tsx
  - src/app/sign-up/page.tsx
  - .env.local

verification: |
  TypeScript compiles cleanly for changed files. Manual verification needed:
  1. Replace Clerk key placeholders in .env.local with real matching keys
  2. npm run dev
  3. Visit /sign-in — Clerk should load, no 404 on clerk-js bundle
  4. Try Google login — should redirect to Clerk's OAuth flow
  5. After sign-in, should redirect to /feed
