# PWA / Mobile-First Verbesserungen — Changelog

**Datum:** 29. März 2026
**Status:** ✅ Abgeschlossen

## Features implementiert

### 1. PWA Manifest & Icons
- Manifest aktualisiert: Name "GreenLog", Theme-Farbe #22c55e (grün)
- Icons 192x192 und 512x512 vorhanden
- iOS Meta Tags (apple-mobile-web-app-capable, etc.)

### 2. Touch-Optimierung
- Bottom Nav mit `active:scale-95` Touch-Feedback
- Safe-area padding für iPhone Notch
- Pull-to-refresh CSS auf Feed und Discover
- Touch-Target CSS (.touch-target, 44px minimum)
- Card-Press Feedback (.card-press, scale 0.98)

### 3. Performance
- Strain Card Images mit `loading="lazy"`
- Lazy Loading für schwere Komponenten:
  - BadgeShowcase (profile page)
  - FilterPanel (collection/strains page)
  - FollowRequestsModal (bottom nav)
- CSP-Fix: tw-animate-css Import entfernt (verursachte Vercel CSP-Fehler)

### 4. Bug Fixes
- BadgeShowcase wurde nicht gerendert (fehlte `isOpen` prop)
- Infinite re-render in CollectionFilterParamReader (searchParams in useEffect dependency)
- CollectionFilterParamReader in Suspense Boundary für SSG-Kompatibilität

## Deployment

**Production URL:** https://green-plgwhjtz8-phhttps-projects.vercel.app

## Commits

| Commit | Beschreibung |
|--------|--------------|
| `1e264d2` | feat(pwa): update manifest to GreenLog branding |
| `eac609c` | feat(pwa): add viewport-fit=cover and green theme color |
| `6cbf86a` | fix(csp): remove tw-animate-css import causing Vercel CSP violation |
| `9b1a504` | feat(mobile): add touch scale feedback to bottom nav |
| `8222651` | perf(image): add lazy loading to strain cards |
| `7881025` | perf(bundle): lazy load BadgeShowcase and other heavy components |
| `435272d` | feat(mobile): add pull-to-refresh CSS |
| `abc5bbc` | feat(mobile): add touch target sizing and card press feedback |
| `e7285cd` | fix: render BadgeShowcase, fix lazy imports for named exports, improve bottom nav fallback |
| `78625cb` | fix: prevent infinite re-render in CollectionFilterParamReader |
| `c678488` | fix: refactor CollectionPage with SearchParamsSync in Suspense boundary |
| `2b00d17` | fix: add isOpen prop to BadgeShowcase to conditionally render modal |

## Offene Issues

### Bekannt aber nicht kritisch
- `ReferenceError: window is not defined` beim Build — eine Komponente referenziert `window` im Module-Scope (SSR-Problem). Dies blockiert nicht das Deployment, sollte aber in Zukunft gefixt werden.

## Getestet
- Alle 35 Routes kompilieren erfolgreich
- Collection Page infinite re-render behoben
- Badge Modal funktioniert jetzt korrekt (nur beim Klick auf "Alle")
- Production Build auf Vercel erfolgreich
