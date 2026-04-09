# Clerk Social Login Integration — PRD

## Ziel

Social Login (Google, Apple, etc.) für GreenLog via Clerk Authentication. Bestehende Supabase Auth Nutzer sollen weiterhin funktionieren — keine Migration der bestehenden User-Daten.

## Scope

### Must Have

1. **Clerk als Primary Auth** — Clerk SDK installieren, `<ClerkProvider>` in `src/app/layout.tsx`
2. **Middleware Schutz** — `clerkMiddleware()` in `middleware.ts` für geschützte Routes
3. **Sign-In / Sign-Up Pages** — `/sign-in` und `/sign-up` Seiten mit Clerk Komponenten
4. **Social Providers aktivieren** — Google OAuth (mindestens), optional Apple, Microsoft, GitHub
5. **Bestehende Supabase Auth Integration** — Bestehende `supabase.auth`-Session werden weitergenutzt für DB-Zugriff (keine User-Migration)
6. **Demo Mode** — Clerk funktioniert nicht in Demo Mode, Demo Mode bleibt via Supabase Mock
7. **Existing Auth Flow** — Bestehende Login/Logout/Register Pages bleiben als Fallback für Supabase-only Nutzer

### Nice to Have (später)

- Apple Login
- Microsoft/GitHub Login
- Unified Clerk Dashboard für alle Nutzer

## Technische Entscheidungen

| Decision | Choice | Reason |
|----------|--------|--------|
| Clerk Version | @clerk/nextjs v7 (Core 3) | Aktuell (März 2026), Vercel native |
| Social Provider | Google (Pflicht) | Standard für B2C/B2B |
| Session Strategy | Clerk für Auth, Supabase für Daten | Keine Migration nötig |
| Middleware | clerkMiddleware() | Clerk Core 3 Pattern |

## Acceptance Criteria

1. `/sign-in` zeigt Google Login Button
2. `/sign-up` zeigt Google Login + Email/Password Option
3. Google Login funktioniert und erstellt Nutzer in Clerk Dashboard
4. Bestehende Supabase Sessions (Email/Password) funktionieren weiterhin
5. Logout löscht beide Sessions (Clerk + Supabase)
6. Demo Mode (ohne Supabase) zeigt lokale Demo-Daten ohne Auth-Fehler
7. Environment Variables werden in Vercel gesetzt: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
8. Build funktioniert: `npm run build` läuft durch

## Bestehende Files (Referenz)

- `src/app/layout.tsx` — Root Layout mit Providers
- `src/components/auth-provider.tsx` — Auth Context + Memberships
- `src/lib/supabase/client.ts` — Supabase Browser Client
- `middleware.ts` — Edge Middleware (Rate Limiting)
- `.env.local` — Lokale Env vars

## Out of Scope

- User Migration (bestehende Supabase User bleiben auf Email/Password)
- Clerk Webhooks für Supabase Profile Sync (später)
- SSO / SAML (Enterprise)
