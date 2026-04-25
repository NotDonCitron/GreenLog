# GreenLog Release Notes

Status: launch-readiness snapshot from 2026-04-25.

## Recommended Release Path

1. Public PWA beta on Vercel.
2. Production smoke test on the deployed domain.
3. Supabase migration verification against the target project.
4. Android/Capacitor packaging after the PWA beta is stable.

## PWA Beta Gate

The PWA beta can move forward only when these are true:

- `npm run lint` passes.
- `npm run test` passes.
- `npm run build` passes.
- Required env vars are present in Vercel.
- Supabase migrations are applied.
- `/`, `/strains`, `/profile`, `/grows`, `/community`, and `/login` are smoke-tested.
- Age gate, cookie consent, Impressum, Datenschutz, and AGB are reachable.
- Service worker does not cache authenticated user API data.
- No secrets, `.env.local`, logs, smoke artifacts, or virtual environments are committed.

See `docs/launch/PWA-LAUNCH-CHECKLIST.md` for the operational checklist and `docs/launch/FINAL-LAUNCH-REPORT.md` for the current validation result.

## Android

Android is not produced by `npm run build`. The app is a Next.js PWA first; Android requires the Capacitor packaging flow, Play Store assets, age rating, policy copy, privacy declaration, and signing setup.

## Legal Positioning

GreenLog/CannaLog must be presented as an 18+ tracking and documentation product. It must not imply sale, brokerage, delivery, ordering, or facilitation of cannabis transactions.
