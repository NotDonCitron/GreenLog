# Clerk Email/Password Auth Debug

## Problem
Email/password login returns "Couldn't find your account" even though:
- Clerk has users with `password_enabled=true`
- Dashboard toggles for Email Address and Password are ON
- PATCH `/v1/instance` with email_addresses/password settings returns HTTP 204
- Users exist via Clerk REST API: `greenlog-test-2026@example.com`, `playwright-test-final@example.com`, etc.

## What Works / Doesn't Work
- Google OAuth login: WORKS (users with oauth_google sign in successfully)
- Email/password login: FAILS with "Couldn't find your account"
- Clerk REST API users endpoint: Returns all users correctly
- Instance endpoint: Only returns `id`, `object`, `environment_type`, `allowed_origins` — no auth settings

## Env Info
- Clerk app: `app_3C6fwHIDq170G73rcz9YxdFgc8a`
- Clerk instance: `ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0` (development)
- Secret key: `sk_test_ge9L0eTyQ2dgf1yHckugfpi5ZeiP9ORQmpAhqTp5gb`
- Dashboard: https://dashboard.clerk.com/apps/app_3C6fwHIDq170G73rcz9YxdFgc8a/instances/ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0/user-authentication/user-and-authentication
- Next.js app running on ports 3000-3010

## Questions to Investigate
1. Could the Clerk instance be different from the app instance? (two instances exist)
2. Is there a misconfiguration between Clerk app-level settings vs instance-level settings?
3. Is the sign-in component using the correct publishable key / instance?
4. Could the Clerk middleware or proxy.ts be interfering with the auth flow?
5. Is there a CORS or domain restriction causing the email lookup to fail?
6. What does Clerk's browser-side network traffic show when submitting email?
7. Are there any instance-level restrictions on email_addresses (allowed_domains, blocked_domains)?

## Debug Approach
1. Check network tab in browser for Clerk API calls during sign-in
2. Compare Clerk dashboard sign-in URL configuration with what's being used
3. Check if Clerk's Frontend API is being called correctly
4. Investigate if there's an issue with the ClerkProvider configuration
5. Check if username vs email_address difference matters for Clerk email login

## Relevant Files
- `src/app/layout.tsx` — ClerkProvider setup
- `src/app/sign-in/[[...sign-in]]/page.tsx` — Sign-in component
- `src/middleware.ts` — Clerk middleware
- `src/proxy.ts` — Clerk route matcher
- `src/components/auth-provider.tsx` — Auth context