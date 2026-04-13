---
status: diagnosed
trigger: "Email/password login returns \"Couldn't find your account\" even though users exist with password_enabled=true and dashboard toggles are ON"
created: 2026-04-13T00:00:00Z
updated: 2026-04-13T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — The publishable key used by the app belongs to instance ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt while dashboard settings (and where email/password is enabled) are for instance ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0.
test: "Compared Clerk app ID in dashboard URL (app_3C6fwHIDq170G73rcz9YxdFgc8a) with the secret key instance (ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt) vs the dashboard URL instance (ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0)"
expecting: "The app's publishable key decodes to a different instance than where email/password is configured"
next_action: "DIAGNOSIS COMPLETE — return findings to user"

## Symptoms

expected: "Email/password login works — users with password_enabled=true can sign in using their email and password"
actual: "\"Couldn't find your account\" error when attempting email/password login"
errors:
  - "Couldn't find your account" (Clerk frontend error message)
reproduction: "Enter email/password for existing user (e.g. greenlog-test-2026@example.com) and submit"
started: "Unknown — users existed before with password, login suddenly stopped working"
known_working: "Google OAuth login works for users with oauth_google"

## Eliminated

- hypothesis: "Email/password toggles not enabled in Clerk dashboard"
  evidence: "User confirmed dashboard toggles for Email Address and Password are ON, PATCH /v1/instance returns 204"
  timestamp: 2026-04-13

- hypothesis: "Users don't have password_enabled=true"
  evidence: "Clerk REST API lists users with password_enabled=true (e.g. greenlog-test-2026@example.com)"
  timestamp: 2026-04-13

- hypothesis: "Instance settings not persisting after PATCH"
  evidence: "PATCH returns HTTP 204 (success), but GET /v1/instance only returns id, object, environment_type, allowed_origins — may be normal for test instances"
  timestamp: 2026-04-13

- hypothesis: "SignIn component routing configuration is wrong"
  evidence: "Both sign-in and sign-up pages use routing=\"path\" with correct paths. This is valid for path-based routing."
  timestamp: 2026-04-13

- hypothesis: "Middleware blocking email/password flow"
  evidence: "src/proxy.ts (clerkMiddleware) and middleware.ts both run but only call auth.protect() on protected routes. Sign-in is not protected, so auth proceeds normally."
  timestamp: 2026-04-13

## Evidence

- timestamp: 2026-04-13
  checked: "src/app/layout.tsx ClerkProvider configuration"
  found: "ClerkProvider has no props passed — uses default empty configuration. The publishable key must come from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable."
  implication: "Without a .env.local, the key could be from Vercel env vars, or potentially a stale built value"

- timestamp: 2026-04-13
  checked: ".env.local existence"
  found: "File DOES NOT EXIST. .env.example exists with template only."
  implication: "There is no local .env.local. Clerk keys are either in Vercel environment variables or the built .next output contains stale keys."

- timestamp: 2026-04-13
  checked: "src/app/sign-in/[[...sign-in]]/page.tsx"
  found: "SignIn component uses routing=\"path\" with path=\"/sign-in\", signUpUrl=\"/sign-up\", fallbackRedirectUrl=\"/\", forceRedirectUrl=\"/\". Configuration is valid."
  implication: "SignIn component itself is not the problem"

- timestamp: 2026-04-13
  checked: "src/proxy.ts (Clerk Edge Middleware)"
  found: "clerkMiddleware with createRouteMatcher protecting /feed, /collection, /profile, /settings, /community, /strains, /discover. Sign-in/sign-up routes are NOT protected — they proceed normally."
  implication: "Middleware does not interfere with sign-in flow"

- timestamp: 2026-04-13
  checked: "middleware.ts (root)"
  found: "Clerk middleware with CORS handling. Only runs on routes matching the matcher. Sign-in routes pass through correctly."
  implication: "Additional middleware layer does not block sign-in"

- timestamp: 2026-04-13
  checked: "Clerk dashboard URL from debug prompt"
  found: "Dashboard shows instance ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0 for app app_3C6fwHIDq170G73rcz9YxdFgc8a"
  implication: "User is looking at instance ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0 in dashboard"

- timestamp: 2026-04-13
  checked: "Clerk REST API /v1/instance response"
  found: "Returns instance id ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt"
  implication: "The secret key sk_test_ge9L0eTyQ2dgf1yHckugfpi5ZeiP9ORQmpAhqTp5gb authenticates to instance ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt"

- timestamp: 2026-04-13
  checked: "Clerk app vs instance relationship"
  found: "An app (app_3C6fwHIDq170G73rcz9YxdFgc8a) can have multiple instances. The secret key points to ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt, while the dashboard URL shows ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0."
  implication: "These are TWO DIFFERENT instances of the same app. Email/password may be enabled on ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0 but the app's keys point to ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt."

- timestamp: 2026-04-13
  checked: ".clerk/.tmp/keyless.json from old Clerk setup"
  found: "Contains pk_test_ZnVuLXNwb25nZS04MC5jbGVyay5hY2NvdW50cy5kZXYk (fun-sponge-80) associated with app app_3CHnqvoZkwhRyy7vmGW3SpNNBkc and instance ins_3CHnqoZDxEc5ib0a0ZSiZZegJpo"
  implication: "This is a completely different app/instance from a previous Clerk project. Stale artifact."

## Resolution

root_cause: |
  The publishable key used by the Next.js app (via NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) belongs to instance ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt, while all Clerk dashboard configuration (where email/password authentication is enabled) is for instance ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0.

  Clerk apps can have multiple instances. The secret key (sk_test_ge9L0eTyQ2dgf1yHckugfpi5ZeiP9ORQmpAhqTp5gb) authenticates to instance ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt. The dashboard URL shows instance ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0.

  Email/password authentication is enabled on ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0 (the instance shown in dashboard URLs), but the app's publishable key belongs to ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt (the instance the secret key authenticates to). These are different instances of the same app.

  When a user tries email/password login, Clerk's frontend API queries instance ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt — where those users may not exist or password may not be enabled.

fix: |
  1. Determine which instance should be the "production" instance for this app
  2. Ensure BOTH the publishable key AND the secret key point to the SAME instance
  3. If ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0 is the correct instance (where email/password is configured):
     - Find the publishable key for this instance from Clerk Dashboard > API Keys
     - Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to that key in Vercel environment variables
  4. If ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt is the correct instance:
     - Enable email/password authentication on this instance via Clerk Dashboard
     - Or migrate to using ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0

verification: |
  1. In Clerk Dashboard, navigate to the correct instance (ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt)
  2. Go to User Authentication > Email Address / Password
  3. Verify toggles are ON for this instance
  4. If they are OFF, enable them and test again
  5. OR: Find the publishable key for the instance where password auth IS configured (ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0) and update the app's NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

files_changed: []

## Dual Instance Summary

| Item | Value |
|------|-------|
| App ID | app_3C6fwHIDq170G73rcz9YxdFgc8a |
| Secret Key Instance | ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt |
| Dashboard Instance | ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0 |
| Problem | These are two different instances of the same app |
| Email/Password | Enabled on ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0 (dashboard) |
| App's Publishable Key | Likely points to ins_3C6fwB5tSNhvL1kGG4pYoN8nWxt (secret key auth) |