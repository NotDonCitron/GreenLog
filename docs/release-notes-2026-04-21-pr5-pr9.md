# GreenLog Release Notes (PR #5 bis #9)

Datum: 2026-04-21
Merge-Reihenfolge: #5 -> #6 -> #7 -> #8 -> #9

## Enthaltene PRs

- #5 `fix/db-migration-chain`: Migration-Chain stabilisiert, Auth-UID/Text-Casts vereinheitlicht.
- #6 `feat/hybrid-tier-kcang-compliance-v2`: Hybrid Tier Architektur (Tier 1 KCanG, Tier 2 Privacy), Trigger-/RLS-Basis.
- #7 `feat/quick-log`: Quick Log (Wirkprofil), neue API-Routen, Sanitizing für öffentliche Aktivität.
- #8 `feat/public-profile-privacy`: Privacy Matrix, sanitisiertes Public-Profile API, Sharing-Kontrollen.
- #9 `perf/sw-image-fixes`: Service Worker Cache-Fixes, Image-Loading-Fixes, Import/Scraper Performance.

## Wichtigste Outcomes

- KCanG/DSGVO-Architektur ist in Code + Migrationen integriert.
- Private Gesundheits-/Feedbackdaten sind klarer von Club-Compliance-Daten getrennt.
- Public Profile und Aktivitätsdaten werden sanitisiert ausgeliefert.
- Service Worker verursacht weniger Probleme bei externen Bildern und dynamischen Seiten.
- Migrationen laufen lokal wieder sauberer durch (inkl. Auth-Typ-Konsistenz).

## Verifikation (lokaler Smoke-Test)

Ausgeführt auf `main` nach dem Fast-Forward auf `origin/main`:

```bash
npm test -- \
  src/lib/csc/dispensation.test.ts \
  src/lib/streaks.test.ts \
  src/lib/quick-log.test.ts \
  src/lib/public-profile.test.ts \
  tests/unit/service-worker.test.ts \
  tests/api/consumption-quick-log.test.ts
```

Ergebnis: `5 passed`, `17 passed`.

## Hinweis

Eine lokale Datei `.planning/STATE.md` ist weiterhin uncommitted und wurde bewusst nicht verändert.
