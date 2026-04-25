# PWA Launch Checklist

Status: in progress for public beta.

- [x] `npm run build` erfolgreich
- [ ] Vercel Deployment erfolgreich
- [ ] HTTPS aktiv
- [x] `/` geprüft
- [x] `/strains` geprüft
- [x] `/profile` geprüft
- [x] `/grows` geprüft
- [x] `/community` geprüft
- [x] `/login` geprüft
- [x] Age Gate funktioniert
- [x] Impressum erreichbar
- [x] Datenschutz erreichbar
- [x] AGB erreichbar
- [ ] Cookie Consent funktioniert
- [x] Service Worker cached keine User-Daten
- [ ] Push Notifications nur wenn VAPID korrekt gesetzt
- [ ] Supabase Migrationsstand geprüft
- [x] Keine Secrets im Repo
- [x] Keine `.env.local` committed
- [x] Keine `.venv` committed
- [x] Keine Logs committed

## Notes

- The current production build succeeds locally when run outside the restricted sandbox.
- Local production smoke ran on `http://localhost:3010` after ports 3000/3001 were unavailable.
- Without the age-gate cookie, protected public routes redirect to `/age-gate?next=...`; with `greenlog_age_verified=true`, checked routes returned 200.
- Vercel and HTTPS checks require a deployed target URL.
- Supabase migration state must be verified against the target project after applying `supabase/migrations/20260425120000_launch_rls_hardening.sql`.
- Push notifications should remain disabled unless both VAPID keys and browser permission behavior are verified.
