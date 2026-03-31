# GreenLog Publish Critical Launch — Design Spec

**Datum:** 2026-03-31
**Status:** Draft — wartet auf Impressum-Typ (Klärung mit Team)
**Beteiligte:** GreenLog Team
**Spec Owner:** claude

---

## Kontext

GreenLog MVP ist funktional fertig (Social/Community, Badge System, Strain Collection, Auth).
Vor einem öffentlichen Launch müssen folgende P0-Kriticals implementiert werden:

1. Legal Pages (GDPR/DE-Recht)
2. Cookie Consent Banner (GDPR)
3. SEO (sitemap, robots, OG Images)
4. Rate Limiting (API Abuse Protection)
5. Error Tracking (Sentry)
6. Route Protection (Edge Middleware)
7. Health Check Endpoint
8. .env.example Dokumentation

---

## 1. Legal Pages

### Pages

| Route | Sprache | Inhalt |
|-------|---------|--------|
| `/impressum` | DE | Impressum (rechtlich vorgeschrieben in DE) |
| `/datenschutz` | DE | Datenschutzerklärung |
| `/agb` | DE | Allgemeine Geschäftsbedingungen |
| `/en/impressum` | EN | English Impressum |
| `/en/privacy` | EN | English Privacy Policy |
| `/en/terms` | EN | English Terms of Service |

### Impressum — TBD (warten auf Team)

> **OFFEN:** Wer betreibt die Plattform?
> - [ ] Privatperson (Name, Adresse, E-Mail)
> - [ ] Einzelunternehmen (GbR/UG/etc.)
> - [ ] GmbH / Ltd. / Kapitalgesellschaft
>
> **Entscheidung ausstehend** — Team muss klären bevor Implementierung startet.

Impressum muss mindestens enthalten (DE):
- Name und Anschrift des Anbieters
- E-Mail-Adresse
- Handelsregistereintrag (falls vorhanden)
- USt-IdNr. (falls vorhanden)

### Datenschutz — Grundstruktur (TBD)

- Verantwortlicher (gleiche Daten wie Impressum)
- Erhobene Daten (Profile, Strain-Ratings, Activities)
- Zweck der Verarbeitung
- Weitergabe an Dritte (Supabase als Auftragsverarbeiter)
- Cookie-Liste (essenziell, analytisch, Marketing)
- Rechte der Nutzer (Auskunft, Löschung, Widerspruch)

### AGB — Grundstruktur (TBD)

- Geltungsbereich
- Nutzungsbedingungen
- Haftungsausschluss
- Geistiges Eigentum
- Änderung der AGB

### Komponenten

- `src/app/(legal)/impressum/page.tsx` — DE Impressum
- `src/app/(legal)/datenschutz/page.tsx` — DE Datenschutz
- `src/app/(legal)/agb/page.tsx` — DE AGB
- `src/app/(legal)/en/impressum/page.tsx` — EN Impressum
- `src/app/(legal)/en/privacy/page.tsx` — EN Privacy
- `src/app/(legal)/en/terms/page.tsx` — EN Terms
- Footer-Links existieren bereits (→ 404, werden auf neue Routes umgebogen)

### Layout

- Nutzt existierendes `src/app/(legal)/layout.tsx` (oder neu erstellen)
- Gleiche UI-Wrapper wie andere GreenLog Pages
- `<main>` content mit `<h1>`, lesbarer Textstruktur
- Footer-Navigation zu anderen Legal Pages

---

## 2. Cookie Consent Banner

### Anforderung

GDPR-konformer Banner der:
- Cookies erklärt (Kategorie: essenziell, analytisch, Marketing)
- User-Auswahl ermöglicht (Akzeptieren / Nur Essenzielle)
- Präferenzen in localStorage speichert
- Bei Rückkehr des Users Banner NICHT erneut zeigt (wenn bereits entschieden)

### Komponente

**`src/components/cookie-consent-banner.tsx`** (Client Component)

```typescript
// State: 'hidden' | 'visible'
// localStorage key: 'cookie_consent'
// Values: 'all' | 'essential' | null
```

### UI

- Position: `fixed bottom-0 left-0 right-0 z-50`
- Hintergrund: Card mit Border (passend zu GreenLog Theme)
- Text: "Wir verwenden Cookies, um ... [Mehr erfahren (Datenschutz)]"
- Buttons:
  - "Alle akzeptieren" — primary (green)
  - "Nur essenzielle" — secondary/ghost
- Nach Auswahl: Banner ausblenden, nicht mehr anzeigen

### Funktionsweise

1. `useEffect` beim Mount: Check `localStorage.getItem('cookie_consent')`
2. Wenn `null` → Banner anzeigen
3. Wenn `'all'` oder `'essential'` → Banner hidden
4. Bei Klick "Akzeptieren" → `localStorage.setItem('cookie_consent', 'all')`
5. Bei Klick "Nur essenzielle" → `localStorage.setItem('cookie_consent', 'essential')`

### Integration

- In `src/app/layout.tsx` als `<CookieConsentBanner />` am Ende des Body
- Funktioniert ISR (Next.js Pages Router)
- SSR: Banner startet hidden (localStorage ist client-seitig)

### Future-Proof

Wenn Analytics kommen (z.B. Plausible, Google Analytics):
- Script-Tag prüft `localStorage.getItem('cookie_consent')`
- Nur bei `'all'` Analytics-Scripts laden

---

## 3. SEO — sitemap, robots.txt, OG Images

### sitemap.xml

**`src/app/sitemap.ts`** (Next.js Pages Router sitemap export):

```typescript
import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient()

  // Strain URLs aus Supabase
  const { data: strains } = await supabase
    .from('strains')
    .select('slug, updated_at')
    .limit(1000) // sitemap limit

  const strainUrls = (strains || []).map(strain => ({
    url: `https://greenlog.app/strains/${strain.slug}`,
    lastModified: new Date(strain.updated_at || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const staticPages = [
    { url: 'https://greenlog.app/', priority: 1.0, changeFrequency: 'daily' },
    { url: 'https://greenlog.app/strains', priority: 0.9, changeFrequency: 'daily' },
    { url: 'https://greenlog.app/community', priority: 0.8, changeFrequency: 'weekly' },
    { url: 'https://greenlog.app/impressum', priority: 0.5, changeFrequency: 'monthly' },
    { url: 'https://greenlog.app/datenschutz', priority: 0.5, changeFrequency: 'monthly' },
    { url: 'https://greenlog.app/agb', priority: 0.5, changeFrequency: 'monthly' },
    { url: 'https://greenlog.app/en/impressum', priority: 0.5, changeFrequency: 'monthly' },
    { url: 'https://greenlog.app/en/privacy', priority: 0.5, changeFrequency: 'monthly' },
    { url: 'https://greenlog.app/en/terms', priority: 0.5, changeFrequency: 'monthly' },
  ]

  return [...staticPages, ...strainUrls]
}
```

Next.js Pages Router: sitemap.ts in `src/app/` wird automatisch als `/sitemap.xml` erkannt.

### robots.txt

**`public/robots.txt`** (statische Datei):

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /studio/
Disallow: /_next/
Sitemap: https://greenlog.app/sitemap.xml
```

### OG Images

**`src/app/api/og/route.tsx`** (Next.js App Router Route Handler):

Generisches OG Image für alle Seiten:
- `logo.png` (links oben)
- Text: "GreenLog"
- Tagline: "Cannabis Strain Tracking & Collection"
- Background: dunkel (Neon Vault Theme)
- Größe: 1200x630px

```typescript
import { ImageResponse } from 'next/og'
import { Image } from 'next/image'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          backgroundColor: '#0a0a0f',
          padding: '60px',
        }}
      >
        {/* Logo */}
        <Image src="/logo.png" width={120} height={120} alt="GreenLog" />
        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '40px' }}>
          <div style={{ fontSize: '72px', fontWeight: 'bold', color: '#22c55e' }}>
            GreenLog
          </div>
          <div style={{ fontSize: '28px', color: '#a1a1aa' }}>
            Cannabis Strain Tracking & Collection
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
```

**Root metadata update** in `src/app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  openGraph: {
    title: 'GreenLog',
    description: 'Cannabis Strain Tracking & Collection',
    url: 'https://greenlog.app',
    siteName: 'GreenLog',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GreenLog',
    description: 'Cannabis Strain Tracking & Collection',
    images: ['/api/og'],
  },
  robots: {
    index: true,
    follow: true,
  },
}
```

### Metadata Lücken schließen

Folgende Pages brauchen `generateMetadata` oder explizite metadata exports:
- `/strains/[slug]/page.tsx` → Strain-Name + Description
- `/community/page.tsx` → "Community"
- `/collection/page.tsx` → "My Collection"

---

## 4. Rate Limiting

### Ansatz: Vercel Edge Middleware

Vercel Edge Middleware bietet eingebautes Rate Limiting ohne额外的 Service.

**`middleware.ts`** (im Root, neben `next.config.js`):

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate Limiting Konfiguration
const RATE_LIMIT_WINDOW = 60 // seconds
const API_RATE_LIMIT = 100 // requests per window
const PAGE_RATE_LIMIT = 1000 // requests per window

// Simple in-memory counter (resets on cold start)
// Für produktive Apps: upstash/ratelimit mit Redis
const rateLimitStore = new Map<string, { count: number; timestamp: number }>()

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const now = Date.now()
  const key = `${ip}:${request.nextUrl.pathname.startsWith('/api') ? 'api' : 'page'}`

  // Cleanup old entries
  const store = rateLimitStore.get(key)
  if (store) {
    if (now - store.timestamp > RATE_LIMIT_WINDOW * 1000) {
      rateLimitStore.delete(key)
    }
  }

  const current = rateLimitStore.get(key) || { count: 0, timestamp: now }
  current.count++
  current.timestamp = now
  rateLimitStore.set(key, current)

  const limit = request.nextUrl.pathname.startsWith('/api') ? API_RATE_LIMIT : PAGE_RATE_LIMIT

  if (current.count > limit) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(RATE_LIMIT_WINDOW) } }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png).)*',
  ],
}
```

---

## 5. Error Tracking — Sentry

### Setup

```bash
npx sentry-wizard@latest -i nextjs
```

Das Wizard Script:
1. Erstellt `.sentryclirc` (CLI Config)
2. Erstellt `sentry.client.config.ts` und `sentry.server.config.ts`
3. Fügt `instrumentation.ts` hinzu falls nötig
4. Dokumentiert Env Vars für Vercel

### Konfiguration (nach Wizard)

**`sentry.client.config.ts`** (exists standard):
```typescript
import * as Sentry from '@sentry/nextjs'
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
})
```

**`next.config.js`** — sentry plugin ist bereits aktiv nach Wizard.

### Env Vars für Vercel Dashboard

```
SENTRY_ORG=xxx
SENTRY_PROJECT=greenlog-app
SENTRY_AUTH_TOKEN=xxx  # CI/CD only — NIEMALS in .env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx  # Public, OK in .env.local
```

### Kostenloser Tier

- 5k Errors/Monat
- 30k Performance Events/Monat
- Reicht für MVP Launch

---

## 6. Route Protection — middleware.ts

### Geschützte Routes (redirect zu `/login` wenn nicht auth)

```
/collection/*
/community/*
/profile/*
/strains/new
/strains/edit/*
/admin/*
```

### Public Routes (kein redirect)

```
/
/login
/register
/strains
/strains/[slug]
/impressum
/datenschutz
/agb
/en/*
/api/health
```

### Auth Check in middleware

```typescript
// Im same middleware.ts file
// Supabase Session Cookie auslesen und validieren

const supabaseAuthCookie = request.cookies.get('supabase-auth-token')
// Format: base64 encoded JWT

// Falls Route protected und kein gültiger Cookie → redirect /login
```

### Hinweis

Edge Middleware kann nur Cookies lesen, nicht direkt Supabase-Validierung machen (Service Role nicht in Edge).
Validierung passiert via Supabase JWT verification mit `NEXT_PUBLIC_SUPABASE_URL`.

---

## 7. Health Check Endpoint

### `src/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: Date.now(),
    version: process.env.npm_package_version || '1.0.0',
  })
}
```

Endpoint: `GET /api/health`

### Verwendung

- Vercel Uptime Monitoring
- Deployment Smoke Tests
- `/api/health` in Vercel Dashboard als Health Check konfigurierbar

---

## 8. .env.example Dokumentation

### `env.example`

```bash
# =============================================
# GreenLog — Environment Variables
# =============================================

# --- Supabase (Required) ---
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_xxxx    # Public key — safe in browser
SUPABASE_SERVICE_ROLE_KEY=sb_xxxx         # Server-only — NEVER expose to client!

# --- Sentry (nach `npx sentry-wizard@latest -i nextjs`) ---
SENTRY_ORG=your-org
SENTRY_PROJECT=greenlog-app
SENTRY_AUTH_TOKEN=xxxx                     # CI/CD only — nicht in .env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/xxxx

# --- Optional APIs ---
MINIMAX_API_KEY=sk-xxxx                    # MiniMax API (falls genutzt)
GITHUB_TOKEN=ghp_xxxx                      # GitHub (CI/CD)

# --- App Config ---
APP_ADMIN_IDS=user-id-1,user-id-2         # User IDs mit Admin-Rechten (strain image override)
FEEDBACK_ALLOWED_CREATOR_IDS=user-id-1    # User IDs die Feedback-Tickets erstellen dürfen

# --- URLs ---
NEXT_PUBLIC_SITE_URL=https://greenlog.app
```

---

## 9. Naming Consistency — Branding

**Problem:** App heißt "GreenLog" aber Root Layout metadata sagt "CannaLog v2.0 - Neon Vault Edition".

**Fix in `src/app/layout.tsx` metadata:**

```typescript
export const metadata: Metadata = {
  title: {
    default: 'GreenLog',
    template: '%s | GreenLog',
  },
  description: 'Cannabis Strain Tracking & Collection',
  // ...
}
```

Alle Pages die `generateMetadata` nutzen bekommen automatisch " | GreenLog" suffix.

---

## 10. Metadata Lücken — Dynamic Pages

### `/strains/[slug]/page.tsx`

Aktuell: Kein `generateMetadata` export.

Fix:
```typescript
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: strain } = await supabase
    .from('strains')
    .select('name, description, breeder, thc_level')
    .eq('slug', params.slug)
    .single()

  if (!strain) return { title: 'Strain nicht gefunden' }

  return {
    title: strain.name,
    description: `${strain.name} — ${strain.breeder || 'Unbekannter Breeder'}. THC: ${strain.thc_level || 'N/A'}. Finde Reviews, Ratings und Info auf GreenLog.`,
    openGraph: {
      title: strain.name,
      description: strain.description || `Strain ${strain.name} auf GreenLog`,
      images: [{ url: '/api/og' }],
    },
  }
}
```

### `/community/page.tsx`

```typescript
export const metadata = {
  title: 'Community',
  description: 'Entdecke Cannabis Communities, Clubs und Apotheken auf GreenLog.',
}
```

### `/collection/page.tsx`

```typescript
export const metadata = {
  title: 'Meine Sammlung',
  description: 'Deine persönliche Strain-Sammlung auf GreenLog.',
}
```

---

## Implementation Plan — Übersicht

### Phase 1: Infrastruktur (dieses Spec)

| # | Task | Dependencies |
|---|------|-------------|
| 1 | middleware.ts (Rate Limiting + Route Protection) | — |
| 2 | `/api/health` Endpoint | — |
| 3 | `.env.example` | — |
| 4 | Cookie Consent Banner | — |
| 5 | sitemap.ts + robots.txt | — |
| 6 | OG Image Route (`/api/og`) | logo.png vorhanden |
| 7 | Root metadata fix (Branding) | — |
| 8 | Dynamic page metadata (strains, community, collection) | — |
| 9 | Sentry Integration | npm install sentry wizard |
| 10 | Legal Pages (Impressum, Datenschutz, AGB) | **WARTEN auf Team-Entscheidung** |

### Phase 2: Nach Team-Entscheidung

| # | Task | Dependencies |
|---|------|-------------|
| 11 | Impressum EN | Impressum DE fertig |
| 12 | Datenschutz EN | Datenschutz DE fertig |
| 13 | AGB EN | AGB DE fertig |

---

## Offene Fragen

1. **Impressum-Typ** — Wer betreibt die Plattform? (Privatperson / Unternehmen / GmbH)
   - **Status:** OFFEN — mit Team klären
   - **Blockiert:** Legal Pages

2. **Supabase Service Role Key in .env.local** — Sollte der Service Role Key in eine separate Server-only Env Datei?
   - **Status:** Sicherheits-Empfehlung — Current `.env.local` ist nicht in `.gitignore`? → prüfen

3. **Analytics** — Geplant für später (Plausible/Google Analytics)?
   - **Status:** NICHT in diesem Spec — Cookie Banner ist darauf vorbereitet

---

## Erfolgsmessung

Nach Implementierung:
- [ ] `/impressum`, `/datenschutz`, `/agb` load ohne 404
- [ ] `/sitemap.xml` existiert und enthält alle Strains
- [ ] `/robots.txt` existiert und erlaubt Suchmaschinen
- [ ] Cookie Banner erscheint auf erster Page Visit, verschwindet nach Auswahl
- [ ] Rate Limiting loggt 429 bei >100 API req/min pro IP
- [ ] Sentry fängt Error in dev-mode
- [ ] `/api/health` gibt `{status: 'ok'}` zurück
- [ ] Unauthentifizierte User werden von `/collection` auf `/login` redirected
