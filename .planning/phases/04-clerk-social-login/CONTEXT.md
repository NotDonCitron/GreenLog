---
name: 04-clerk-social-login
description: Clerk Social Login Integration Phase 4
type: project
---

# Phase 04: Clerk Social Login - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Source:** PRD Express Path (./.planning/PRD-clerk-social-login.md)

<domain>
## Phase Boundary

Clerk Authentication als Primary Auth für GreenLog — Social Login (Google, etc.) für neue Nutzer. Bestehende Supabase Auth Sessions bleiben funktional.

</domain>

<decisions>
## Implementation Decisions

### Clerk Integration
- Clerk SDK (@clerk/nextjs v7, Core 3) als Primary Auth
- ClerkProvider in layout.tsx, clerkMiddleware() in middleware.ts
- /sign-in und /sign-up Pages mit Clerk Components
- Google OAuth als Haupt-Provider

### Session Strategy
- Clerk für Authentication (Login, Session Management)
- Supabase für Databasezugriff (bestehende RLS + User Sessions)
- Keine Migration bestehender Supabase User

### Demo Mode
- Demo Mode bleibt via Supabase Mock (bestehend)
- Clerk funktioniert nicht in Demo Mode

### Environment Variables
- CLERK_SECRET_KEY (Vercel secrets)
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (Vercel secrets)

### Existing Auth Flow
- Bestehende Login/Logout/Register Pages bleiben als Fallback
- Supabase-only Nutzer können weiterhin Email/Password nutzen

### Claude's Discretion
- Sign-In/Sign-Up URLs in Clerk Dashboard konfigurieren
- Redirect nach Login: /feed oder Original-URL
- Clerk Webhook für Supabase Profile Sync (später, nicht in diesem Scope)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project
- `/home/phhttps/Dokumente/Greenlog/GreenLog/CLAUDE.md` — Projekt Guidelines
- `/home/phhttps/Dokumente/Greenlog/GreenLog/src/app/layout.tsx` — Root Layout mit Providers
- `/home/phhttps/Dokumente/Greenlog/GreenLog/src/components/auth-provider.tsx` — Auth Context + Memberships
- `/home/phhttps/Dokumente/Greenlog/GreenLog/src/lib/supabase/client.ts` — Supabase Browser Client
- `/home/phhttps/Dokumente/Greenlog/GreenLog/middleware.ts` — Edge Middleware

### Clerk Docs (Context7)
- `/clerk/clerk-docs` — Clerk Documentation

</canonical_refs>

<specifics>
## Specific Ideas

### Must Have Tasks
1. Clerk SDK installieren: `npm install @clerk/nextjs`
2. ClerkProvider in layout.tsx einrichten
3. middleware.ts anpassen: clerkMiddleware()
4. /sign-in Page erstellen mit Clerk SignIn Component
5. /sign-up Page erstellen mit Clerk SignUp Component
6. Environment Variables für Clerk in .env.local
7. Google OAuth in Clerk Dashboard aktivieren
8. Build testen: npm run build

### Clerk Core 3 Breaking Changes (März 2026)
- auth() ist async — immer await auth() nutzen
- clerkMiddleware() statt authMiddleware()
- ClerkProvider nicht mehr wrapping html — inside body

</specifics>

<deferred>
## Deferred Ideas

- Apple Login
- Microsoft/GitHub Login
- Clerk Webhook Integration für Supabase Profile Sync
- User Migration (bestehende Supabase User auf Clerk umziehen)
- SSO / SAML (Enterprise)

</deferred>

---

*Phase: 04-clerk-social-login*
*Context gathered: 2026-04-09 via PRD Express Path*
