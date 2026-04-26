# PWA Beta Smoke Test — 2026-04-26

## Environment
- Production URL: https://green-log-two.vercel.app
- Commit: `87b3e57af68586714b0cc8e8ca5cf08b001f0cdb`
- Browser/device: Playwright Chromium, Pixel 7 mobile viewport
- Logged-in state: Logged out; age gate confirmed with birth year `2000` for protected-route checks
- Evidence archive: `output/playwright/pwa-beta-smoke-2026-04-26/Archiv.zip`
- Raw result file: `output/playwright/pwa-beta-smoke-2026-04-26/smoke-results.json`

## Summary
- Overall status: PASS WITH WARNINGS
- Blockers for public launch: `/impressum` still contains placeholder operator/contact content and visible "In Bearbeitung" copy.
- Non-blocking warnings: aborted Next.js RSC/prefetch requests and one aborted Supabase `HEAD` request were observed, but no tested route showed visible UI/runtime failure or console errors.
- Non-blocking warnings: the cookie banner appears on tested pages; verify it does not block key actions.
- Recommended next step: fix the Impressum placeholder content, then run a short legal-pages smoke retest.

## Route Results
| Route | HTTP | Final URL | H1 / visible result | Console errors | Failed requests | Mobile overflow | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 200 | `https://green-log-two.vercel.app/` | `CannaLog` home loads | 0 | 1 aborted Supabase `HEAD` request | No | Pass with warning |
| `/login` | 200 | `https://green-log-two.vercel.app/sign-in` | `Dein Logbuch wartet.` sign-in flow loads | 0 | 1 aborted Next.js `_rsc` request | No | Pass with warning |
| `/sign-in` | 200 | `https://green-log-two.vercel.app/sign-in` | `Dein Logbuch wartet.` sign-in form loads | 0 | 1 aborted Next.js `_rsc` request | No | Pass with warning |
| `/strains` | 200 | `https://green-log-two.vercel.app/strains` | `Strains` catalog loads after age confirmation | 0 | 6 aborted Next.js strain-detail `_rsc` prefetch requests | No | Pass with warning |
| `/profile` | 200 | `https://green-log-two.vercel.app/profile` | `Profil` logged-out state loads | 0 | 0 | No | Pass |
| `/grows` | 200 | `https://green-log-two.vercel.app/grows` | `Meine Grows` logged-out/empty state loads | 0 | 0 | No | Pass |
| `/community` | 200 | `https://green-log-two.vercel.app/community` | `Communities` list loads | 0 | 0 | No | Pass |
| `/datenschutz` | 200 | `https://green-log-two.vercel.app/datenschutz` | `Datenschutzerklärung` loads | 0 | 0 | No | Pass |
| `/impressum` | 200 | `https://green-log-two.vercel.app/impressum` | `Impressum` loads but contains placeholders and "In Bearbeitung" | 0 | 0 | No | Public-launch blocker |
| `/agb` | 200 | `https://green-log-two.vercel.app/agb` | `Allgemeine Geschäftsbedingungen (AGB)` loads | 0 | 0 | No | Pass |
| `/offline` | 200 | `https://green-log-two.vercel.app/offline` | `Du bist offline` fallback loads | 0 | 0 | No | Pass |

## Functional Checks
| Check | Result | Notes | Status |
| --- | --- | --- | --- |
| Production URL loads | Pass | `https://green-log-two.vercel.app` returned HTTP 200 and rendered the home screen. | Pass |
| Tested routes return HTTP 200 | Pass | `/`, `/login`, `/sign-in`, `/strains`, `/profile`, `/grows`, `/community`, `/datenschutz`, `/impressum`, `/agb`, and `/offline` all returned HTTP 200. | Pass |
| Age Gate redirects unauthenticated age state | Pass | Clean `/strains` request opened `https://green-log-two.vercel.app/age-gate?next=%2Fstrains`. | Pass |
| 18+ confirmation works | Pass | Selecting birth year `2000` and confirming set `greenlog_age_verified=true`, then opened `/strains`. | Pass |
| `manifest.json` reachable | Pass | `/manifest.json` returned HTTP 200 with `application/json; charset=utf-8`. | Pass |
| Service worker active | Pass | Service worker support was available; `sw.js` was registered for scope `/` and controlled the page. | Pass |
| Mobile layout overflow | Pass | Tested mobile routes reported `scrollWidth` equal to viewport width and no horizontal overflow. | Pass |
| Console errors | Pass | Console errors were `0` on all tested routes. | Pass |
| Failed requests | Warning | Observed failures were `net::ERR_ABORTED`, mostly Next.js RSC/prefetch requests or aborted Supabase `HEAD` requests. Treat as non-blocking unless they reproduce as visible UI/runtime errors. | Warning |
| Cookie banner | Warning | Cookie banner appears on tested pages. Verify it does not block key actions before broader beta traffic. | Warning |
| Legal page readiness | Warning | `/impressum` is reachable, but placeholder content remains. | Public-launch blocker |

## Legal Page Warning
`/impressum` is the main launch blocker. The page is reachable and returns HTTP 200, but it still contains placeholder/public-incomplete content:

- `[Name des Betreibers]`
- `[Straße und Hausnummer]`
- `[PLZ, Ort]`
- `[Name]`
- `In Bearbeitung`

This is acceptable only for a closed internal PWA beta with limited and informed testers. It is a legal/public-launch blocker for public beta, social launch, or broader external traffic.

## Screenshot Evidence
- Age gate before confirmation: `output/playwright/pwa-beta-smoke-2026-04-26/clean-no-age-strains.png`
- Age gate after confirmation: `output/playwright/pwa-beta-smoke-2026-04-26/age-gate-after-confirm.png`
- Mobile confirmed routes: `output/playwright/pwa-beta-smoke-2026-04-26/mobile-confirmed-*.png`
- Mobile verified routes: `output/playwright/pwa-beta-smoke-2026-04-26/mobile-verified-*.png`

## Final Recommendation
Closed beta can proceed.

Public launch/social traffic should wait until Impressum is finalized.

After fixing the Impressum placeholder content, run a short legal-pages smoke retest covering `/impressum`, `/datenschutz`, `/agb`, cookie banner visibility, console errors, and mobile overflow.
