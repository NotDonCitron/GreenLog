# PWA / Mobile-First Verbesserungen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GreenLog als installierbare PWA mit App-Feel, Touch-Optimierung und verbesserter Performance.

**Architecture:** Manifest + Meta Tags für PWA-Installation, Touch-Targets via CSS, Dynamic Imports für Bundle-Reduktion, next/image für Performance.

**Tech Stack:** next/image, next/dynamic, CSS variables, Safe Area API

---

## Übersicht bestehender Stand

- `manifest.json` existiert mit alten Werten ("CannaLog", theme #00F5FF)
- `bottom-nav.tsx` bereits fixed + safe-area handling
- `strain-card.tsx` nutzt next/image mit fill + sizes
- `tw-animate-css` Import in globals.css verursacht CSP-Fehler auf Vercel

---

## Task 1: Manifest updaten

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Manifest aktualisieren**

Ersetze den gesamten Inhalt von `public/manifest.json`:

```json
{
  "name": "GreenLog",
  "short_name": "GreenLog",
  "description": "Strain Tracker & Grow Journal",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#22c55e",
  "orientation": "portrait",
  "scope": "/",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["lifestyle", "medical"],
  "lang": "de",
  "dir": "ltr"
}
```

- [ ] **Step 2: Commit**

```bash
git add public/manifest.json && git commit -m "feat(pwa): update manifest to GreenLog branding"
```

---

## Task 2: Layout Meta Tags

**Files:**
- Modify: `src/app/layout.tsx:1-66`

- [ ] **Step 1: Viewport viewport-fit=cover hinzufügen**

Erweitere den bestehenden viewport export in `src/app/layout.tsx`:

```tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#22c55e",
  viewportFit: "cover",
};
```

- [ ] **Step 2: Metadata apple-touch-icon prüfen**

Der bestehende `appleWebApp` metadata Block ist korrekt. Keine Änderung nötig.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx && git commit -m "feat(pwa): add viewport-fit=cover and green theme color"
```

---

## Task 3: Bottom Nav Touch-Verbesserungen

**Files:**
- Modify: `src/components/bottom-nav.tsx`

Die Bottom Nav ist bereits gut implementiert mit fixed position und safe-bottom. Nur minimale Anpassungen nötig:

- [ ] **Step 1: Active-State Touch-Feedback verbessern**

In `src/components/bottom-nav.tsx`, die aktive Navigation hat bereits `#00F5FF` highlight. Füge `active:scale-95` für besseren Touch-Feedback hinzu bei den Link/Button Komponenten.

Suche in `bottom-nav.tsx` die Zeile mit `className` der Nav-Links (ca. Zeile 91-106). Die aktuelle Klasse ist:

```tsx
className={`flex flex-1 flex-col items-center gap-1 py-1 text-[9px] uppercase font-bold tracking-tight transition-all ${isActive ? "text-[#00F5FF]" : "text-[var(--muted-foreground)]"}`}
```

Ändere `transition-all` zu `transition-all active:scale-95`:

```tsx
className={`flex flex-1 flex-col items-center gap-1 py-1 text-[9px] uppercase font-bold tracking-tight transition-all active:scale-95 ${isActive ? "text-[#00F5FF]" : "text-[var(--muted-foreground)]"}`}
```

Mache dasselbe für den Badge-Button (ca. Zeile 73).

- [ ] **Step 2: Commit**

```bash
git add src/components/bottom-nav.tsx && git commit -m "feat(mobile): add touch scale feedback to bottom nav"
```

---

## Task 4: CSP-Fehler beheben (tw-animate-css entfernen)

**Files:**
- Modify: `src/app/globals.css:1-2`

- [ ] **Step 1: tw-animate-css Import entfernen**

In `src/app/globals.css` Zeile 2 steht:
```css
@import "tw-animate-css";
```

Entferne diese Zeile komplett. Die Animationen funktionieren über Tailwind's eingebaute animate-* Klassen.

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css && git commit -m "fix(csp): remove tw-animate-css import causing Vercel CSP violation"
```

---

## Task 5: Strain Card Image Optimierung

**Files:**
- Modify: `src/components/strains/strain-card.tsx:60-66`

- [ ] **Step 1: loading="lazy" hinzufügen**

Die `Image` Komponente in `strain-card.tsx` (ca. Zeile 60-66):

Aktuell:
```tsx
<Image
  src={strain.image_url || "/strains/placeholder-1.svg"}
  alt={strain.name}
  fill
  className="object-cover transition-transform duration-500 group-hover:scale-110"
  sizes="(max-width: 768px) 50vw, 33vw"
/>
```

Ändere zu:
```tsx
<Image
  src={strain.image_url || "/strains/placeholder-1.svg"}
  alt={strain.name}
  fill
  className="object-cover transition-transform duration-500 group-hover:scale-110"
  sizes="(max-width: 768px) 50vw, 33vw"
  loading="lazy"
/>
```

(WARNING: Füge KEIN `placeholder="blur"` hinzu — das würde eine blurDataURL erfordern die wir nicht haben.)

- [ ] **Step 2: Commit**

```bash
git add src/components/strains/strain-card.tsx && git commit -m "perf(image): add lazy loading to strain cards"
```

---

## Task 6: Dynamic Imports für schwere Komponenten

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/feed/page.tsx` (falls BadgeShowcase dort importiert wird)

- [ ] **Step 1: BadgeShowcase lazy laden in page.tsx**

Lese `src/app/page.tsx` um zu sehen ob BadgeShowcase dort direkt importiert wird.

Falls ja, ersetze den Import mit:

```tsx
import { lazy, Suspense } from 'react';
const BadgeShowcase = lazy(() => import('@/components/profile/badge-showcase'));
```

Und wrappe die Komponente mit:
```tsx
<Suspense fallback={<div className="h-32 w-32 animate-pulse bg-[var(--muted)] rounded-lg" />}>
  <BadgeShowcase ... />
</Suspense>
```

- [ ] **Step 2: Ähnlich für andere schwere Komponenten (FilterPanel, FollowRequestsModal)**

Falls diese in `feed/page.tsx` oder anderen Pages direkt importiert werden, gleiches Pattern anwenden.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/app/feed/page.tsx 2>/dev/null; git commit -m "perf(bundle): lazy load BadgeShowcase and other heavy components"
```

---

## Task 7: Pull-to-Refresh CSS

**Files:**
- Modify: `src/app/feed/page.tsx`
- Modify: `src/app/discover/page.tsx`

- [ ] **Step 1: Pull-to-refresh CSS hinzufügen**

In `src/app/globals.css`, füge am Ende hinzu:

```css
/* Pull-to-refresh */
.pull-refresh {
  overscroll-behavior-y: contain;
}
```

In `feed/page.tsx` und `discover/page.tsx`, die Haupt-Container mit `pull-refresh` Klasse versehen:

```tsx
<div className="pull-refresh h-full overflow-y-auto">
  {/* content */}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css src/app/feed/page.tsx src/app/discover/page.tsx 2>/dev/null; git commit -m "feat(mobile): add pull-to-refresh CSS"
```

---

## Task 8: Touch Targets minimum 44px

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Touch-Target CSS hinzufügen**

Füge in `src/app/globals.css` hinzu:

```css
/* Touch targets minimum 44x44px */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

- [ ] **Step 2: Cards mit Active-State**

Füge in `globals.css` hinzu:

```css
/* Card press feedback */
.card-press {
  transition: transform 0.1s ease-out;
}

.card-press:active {
  transform: scale(0.98);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css && git commit -m "feat(mobile): add touch target sizing and card press feedback"
```

---

## Spec Coverage Check

- [x] Manifest mit GreenLog branding → Task 1
- [x] iOS Meta Tags + viewport-fit=cover → Task 2
- [x] Bottom Nav Touch-Feedback → Task 3
- [x] tw-animate-css CSP-Fix → Task 4
- [x] Strain Card lazy loading → Task 5
- [x] Dynamic imports BadgeShowcase → Task 6
- [x] Pull-to-refresh CSS → Task 7
- [x] Touch targets 44px → Task 8

**Alle Spec-Anforderungen abgedeckt.**

---

## Reihenfolge

1. Task 1: Manifest (schnell, keine Abhängigkeiten)
2. Task 2: Layout Meta (schnell, keine Abhängigkeiten)
3. Task 4: CSP-Fix (schnell, wichtig für Production)
4. Task 3: Bottom Nav Touch (mittel, keine Abhängigkeiten)
5. Task 5: Strain Card lazy (mittel, keine Abhängigkeiten)
6. Task 6: Dynamic imports (mittel, Abhängigkeit von page.tsx Analyse)
7. Task 7: Pull-to-refresh (einfach, CSS-only)
8. Task 8: Touch targets (einfach, CSS-only)
