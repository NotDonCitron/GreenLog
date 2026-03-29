# PWA / Mobile-First Verbesserungen — Design Specification

## Überblick

GreenLog als "App-ähnliche" Mobile-Erfahrung repositionieren: Add-to-Homescreen, Touch-Optimierung, verbesserte Performance. Nicht Offline-First (kein Service Worker Sync), nur Installation und schnelles Laden.

---

## 1. PWA Manifest & Icons

### Manifest (`public/manifest.json`)

```json
{
  "name": "GreenLog",
  "short_name": "GreenLog",
  "description": "Strain Tracker & Grow Journal",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#22c55e",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### iOS Meta Tags (in `layout.tsx`)

```tsx
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="GreenLog" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### Icons

- Generieren via `public/icons/` Ordner
- 192x192 und 512x512 PNG (grünes Leaf-Logo auf dunklem Background)
- Placeholder: bestehendes Logo als Basis

---

## 2. Touch-Optimierung

### Bottom Navigation

**Aktuelle Datei:** `src/components/layout/bottom-nav.tsx` (oder ähnlich)

**Änderungen:**
- `position: fixed` am unteren Rand
- Aktiver Tab: grüner Highlight + Icon
- `padding-bottom: env(safe-area-inset-bottom)` für iPhone Notch

**Swipe-Gesten (optional, stretch):**
- `framer-motion` mit `useDragControls` für Tab-Wechsel
- Horizontal-Swipe zwischen Strains/Grows/Collection

### Pull-to-Refresh

- Auf `/feed` und `/discover` Seiten
- Native Browser Pull-to-Refresh via `overscroll-behavior-y: contain` CSS
- Kein Custom Spinner nötig — Browser-eigenes Verhalten

### Touch Targets

- Alle Buttons mindestens 44x44px (`min-height: 44px; min-width: 44px`)
- Cards mit `cursor: pointer` und `transform: scale(0.98)` auf Active-State

---

## 3. Performance

### Image Optimization

**Strain Cards (`src/components/strains/strain-card.tsx`):**
```tsx
<Image
  src={url}
  alt={name}
  fill
  loading="lazy"
  placeholder="blur"
  blurDataURL={blurPlaceholder}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

**Feed Images:**
- `next/image` mit `sizes` Attribut für responsive
- WebP via Next.js Automatic Image Optimization

### Dynamic Imports

**Schwere Komponenten lazy laden:**

```tsx
// Feed page
const BadgeShowcase = dynamic(() => import('@/components/profile/badge-showcase'), {
  loading: () => <Skeleton className="h-32 w-32" />
});

// FilterPanel
const FilterPanel = dynamic(() => import('@/components/ui/filter-panel'), {
  ssr: false
});
```

### Bundle Analysis

- `ANALYZE=true npm run build` prüfen
- Tesseract.js (Scanner) bereits lazy-loaded (bekannter Fix)
- Keine neuen Dependencies nötig

---

## 4. Viewport & Meta

In `src/app/layout.tsx` sicherstellen:

```tsx
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

## 5. Safe Area Handling

CSS Variables für iOS:

```css
/* src/app/globals.css */
:root {
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
  --safe-area-inset-top: env(safe-area-inset-top);
}
```

Bottom Nav mit `padding-bottom: var(--safe-area-inset-bottom)`

---

## Abhängigkeiten

Keine neuen Packages nötig:
- `next/image` — bereits in use
- `next/dynamic` — bereits in use
- `framer-motion` — bereits installiert
- `tailwindcss` — bereits in use

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `public/manifest.json` | NEU erstellen |
| `public/icons/icon-192.png` | NEU erstellen |
| `public/icons/icon-512.png` | NEU erstellen |
| `src/app/layout.tsx` | PWA Meta Tags hinzufügen |
| `src/app/globals.css` | Safe-area vars + Touch targets |
| `src/components/layout/bottom-nav.tsx` | Fixed + Safe-area padding + Active highlight |
| `src/components/strains/strain-card.tsx` | next/image mit lazy + blur |
| `src/app/feed/page.tsx` | Pull-to-refresh CSS |
| `src/app/discover/page.tsx` | Pull-to-refresh CSS |
| `src/app/page.tsx` | Dynamic imports für BadgeShowcase |

---

## Reihenfolge der Implementierung

1. Manifest + Icons erstellen
2. Meta Tags in layout.tsx
3. Bottom Nav fixen (Touch + Safe-area)
4. Strain Cards mit next/image optimieren
5. Dynamic imports einbauen
6. Pull-to-refresh CSS
7. Test: Add-to-Homescreen auf iOS/Android
