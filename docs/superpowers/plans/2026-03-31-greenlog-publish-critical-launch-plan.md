# GreenLog Publish Critical Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle P0-Kriticals für öffentlichen Launch implementieren (Legal Pages, Cookie Banner, SEO, Rate Limiting, Sentry, Health Check, Route Protection).

**Architecture:** Next.js 16 Pages Router + Supabase. Neue Features: Edge Middleware (Rate Limiting + Auth), Route Handler für Health/OG, Client Components für Cookie Banner, Static + Dynamic SEO Pages.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, Supabase, Vercel (Edge Middleware), Sentry, next/og.

---

## File Map

### Create (15 files)

| File | Purpose |
|------|---------|
| `middleware.ts` | Edge Middleware: Rate Limiting + Route Protection |
| `src/app/api/health/route.ts` | GET /api/health |
| `src/app/sitemap.ts` | Next.js Sitemap (auto-generiert sitemap.xml) |
| `public/robots.txt` | robots.txt |
| `src/app/api/og/route.tsx` | OG Image via next/og |
| `src/components/cookie-consent-banner.tsx` | GDPR Cookie Banner |
| `src/app/(legal)/impressum/page.tsx` | DE Impressum (TBD) |
| `src/app/(legal)/datenschutz/page.tsx` | DE Datenschutz |
| `src/app/(legal)/agb/page.tsx` | DE AGB |
| `src/app/(legal)/en/impressum/page.tsx` | EN Impressum |
| `src/app/(legal)/en/privacy/page.tsx` | EN Privacy |
| `src/app/(legal)/en/terms/page.tsx` | EN Terms |
| `.env.example` | Env Vars Dokumentation |
| `sentry.client.config.ts` | Sentry Client Config (nach Wizard) |
| `sentry.server.config.ts` | Sentry Server Config (nach Wizard) |

### Modify (3 files)

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Metadata fix (CannaLog → GreenLog), OG images, CookieBanner component |
| `src/app/landing/page.tsx` | Footer Links already correct (kein Change nötig) |
| `next.config.ts` | Sentry plugin (nach Wizard) |

---

## Task 1: middleware.ts (Rate Limiting + Route Protection)

**Files:**
- Create: `middleware.ts` (im Root, neben next.config.ts)
- Modify: `next.config.ts` (kein Change nötig für middleware)

**Context:** Vercel Edge Middleware. Rate Limiting: 100 req/min (API), 1000 req/min (Pages). Route Protection: Redirect zu /login wenn nicht auth auf geschützten Routes.

- [ ] **Step 1: Create middleware.ts**

Erstelle `middleware.ts` im Root (`/home/phhttps/Dokumente/Greenlog/GreenLog/middleware.ts`):

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============================================
// RATE LIMITING
// ============================================
const RATE_LIMIT_WINDOW = 60 // seconds
const API_RATE_LIMIT = 100 // requests per window
const PAGE_RATE_LIMIT = 1000 // requests per window

// Simple in-memory Map (resets on Vercel Edge cold start)
// For production at scale: consider upstash/ratelimit with Redis
const rateLimitStore = new Map<string, { count: number; timestamp: number }>()

function isRateLimited(ip: string, pathname: string): boolean {
  const now = Date.now()
  const isApi = pathname.startsWith('/api')
  const key = `${ip}:${isApi ? 'api' : 'page'}`
  const limit = isApi ? API_RATE_LIMIT : PAGE_RATE_LIMIT

  const current = rateLimitStore.get(key)

  // Cleanup expired entries
  if (current && now - current.timestamp > RATE_LIMIT_WINDOW * 1000) {
    rateLimitStore.delete(key)
  }

  const entry = rateLimitStore.get(key) || { count: 0, timestamp: now }
  entry.count++
  entry.timestamp = now
  rateLimitStore.set(key, entry)

  return entry.count > limit
}

// ============================================
// ROUTE PROTECTION
// ============================================
const PROTECTED_PATHS = [
  '/collection',
  '/community',
  '/profile',
  '/strains/new',
  '/admin',
]

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/strains',
  '/impressum',
  '/datenschutz',
  '/agb',
  '/api/health',
]

function isProtectedPath(pathname: string): boolean {
  // Check exact matches and prefixes
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return false
  }
  if (pathname.startsWith('/en/')) return false
  if (pathname.startsWith('/_next/')) return false
  if (pathname.startsWith('/strains/') && !pathname.includes('/new') && !pathname.includes('/edit')) {
    return false // Individual strain pages are public
  }
  return PROTECTED_PATHS.some(p => pathname.startsWith(p))
}

function isAuthenticated(request: NextRequest): boolean {
  // Check for Supabase auth cookie
  const supabaseCookie = request.cookies.get('supabase-auth-token')
  if (!supabaseCookie) return false

  // The cookie value is a base64-encoded JWT
  // For Edge runtime, we do a simple presence check
  // Full JWT validation happens in API routes with service role
  return supabaseCookie.value.length > 0
}

// ============================================
// MIDDLEWARE EXPORT
// ============================================
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'

  // --- Rate Limiting ---
  if (isRateLimited(ip, pathname)) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: RATE_LIMIT_WINDOW },
      { status: 429, headers: { 'Retry-After': String(RATE_LIMIT_WINDOW) } }
    )
  }

  // --- Route Protection ---
  if (isProtectedPath(pathname)) {
    if (!isAuthenticated(request)) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|apple-touch-icon.png).*)',
  ],
}
```

- [ ] **Step 2: Test Rate Limiting manually**

Start dev server and make 101 rapid requests to `/api/strains`:
```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run dev
```
In another terminal:
```bash
for i in {1..105}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/strains; done | tail -5
```
Expected: Last 5 lines should include `429` after ~100 requests.

- [ ] **Step 3: Test Route Protection manually**

With incognito window (no auth), navigate to `/collection`:
Expected: Redirects to `/login?redirect=/collection`

- [ ] **Step 4: Commit**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
git add middleware.ts
git commit -m "feat: add edge middleware with rate limiting and route protection"
```

---

## Task 2: /api/health Endpoint

**Files:**
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Create the health endpoint**

Create `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: Date.now(),
    timestampIso: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  })
}
```

- [ ] **Step 2: Test the endpoint**

```bash
curl -s http://localhost:3000/api/health | python3 -m json.tool
```
Expected output:
```json
{
    "status": "ok",
    "timestamp": 1743460800000,
    "timestampIso": "2026-03-31T...",
    "version": "0.1.0"
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
git add src/app/api/health/route.ts
git commit -m "feat: add /api/health endpoint for uptime monitoring"
```

---

## Task 3: sitemap.ts + robots.txt

**Files:**
- Create: `src/app/sitemap.ts`
- Create: `public/robots.txt`

- [ ] **Step 1: Create sitemap.ts**

Create `src/app/sitemap.ts`:

```typescript
import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient()

  // Fetch all strain slugs from Supabase
  const { data: strains, error } = await supabase
    .from('strains')
    .select('slug, updated_at')
    .limit(1000)

  const strainUrls = (strains || []).map((strain) => ({
    url: `https://greenlog.app/strains/${strain.slug}`,
    lastModified: new Date(strain.updated_at || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://greenlog.app/',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://greenlog.app/strains',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://greenlog.app/community',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://greenlog.app/impressum',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/datenschutz',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/agb',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/en/impressum',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/en/privacy',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenlog.app/en/terms',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  return [...staticPages, ...strainUrls]
}
```

- [ ] **Step 2: Create robots.txt**

Create `public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /studio/
Disallow: /_next/
Sitemap: https://greenlog.app/sitemap.xml
```

- [ ] **Step 3: Test sitemap**

Start dev server and visit:
```bash
curl -s http://localhost:3000/sitemap.xml | head -20
```
Expected: XML with `<url>` entries including static pages and strains.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts public/robots.txt
git commit -m "feat: add sitemap.xml and robots.txt for SEO"
```

---

## Task 4: OG Image Route

**Files:**
- Create: `src/app/api/og/route.tsx`

- [ ] **Step 1: Create OG image route**

Create `src/app/api/og/route.tsx`:

```typescript
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { Image } from 'next/image'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'GreenLog'

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
          backgroundImage: 'linear-gradient(to bottom right, #0a0a0f 0%, #111827 100%)',
          padding: '60px 80px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          <Image
            src="/logo.png"
            width={100}
            height={100}
            alt="GreenLog Logo"
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Title and tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              fontSize: title.length > 20 ? '56px' : '72px',
              fontWeight: 700,
              color: '#22c55e',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '28px',
              color: '#a1a1aa',
              marginTop: '16px',
              letterSpacing: '0.01em',
            }}
          >
            Cannabis Strain Tracking & Collection
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '60px',
            fontSize: '18px',
            color: '#52525b',
          }}
        >
          greenlog.app
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

- [ ] **Step 2: Test OG image**

```bash
curl -s "http://localhost:3000/api/og" -o /tmp/og.png && file /tmp/og.png
```
Expected: `PNG image, 1200 x 630`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/og/route.tsx
git commit -m "feat: add OG image generation route for social sharing"
```

---

## Task 5: Cookie Consent Banner

**Files:**
- Create: `src/components/cookie-consent-banner.tsx`
- Modify: `src/app/layout.tsx` (add CookieConsentBanner component)

- [ ] **Step 1: Create cookie-consent-banner.tsx**

Create `src/components/cookie-consent-banner.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const COOKIE_CONSENT_KEY = 'cookie_consent'

type ConsentLevel = 'all' | 'essential' | null

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<ConsentLevel>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check localStorage on mount
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentLevel
    if (stored === 'all' || stored === 'essential') {
      setConsent(stored)
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'all')
    setConsent('all')
    setIsVisible(false)
  }

  const handleEssentialOnly = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'essential')
    setConsent('essential')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '16px 24px',
        backgroundColor: 'var(--card)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '300px' }}>
          <p style={{ fontSize: '14px', color: 'var(--foreground)', margin: 0 }}>
            Wir verwenden Cookies, um deine Erfahrung zu verbessern.{" "}
            <a
              href="/datenschutz"
              style={{ color: 'var(--primary)', textDecoration: 'underline' }}
            >
              Mehr erfahren
            </a>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleEssentialOnly}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--foreground)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Nur essenzielle
          </button>
          <button
            onClick={handleAcceptAll}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--primary)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'opacity 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add to layout.tsx**

Modify `src/app/layout.tsx`:
1. Add import: `import { CookieConsentBanner } from '@/components/cookie-consent-banner'`
2. Add `<CookieConsentBanner />` inside the body, after `</AuthProvider>` closing tag but still inside the flex div

The modified body section should look like:
```tsx
<body className="h-full bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden font-body">
  <ThemeInit />
  <AuthProvider>
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
    </div>
    <OnboardingGuide />
    <CookieConsentBanner />
  </AuthProvider>
</body>
```

- [ ] **Step 3: Test cookie banner**

1. Open http://localhost:3000 in browser
2. Banner should appear at bottom of page
3. Click "Alle akzeptieren" → banner disappears
4. Refresh page → banner stays hidden
5. Clear localStorage and refresh → banner reappears

- [ ] **Step 4: Commit**

```bash
git add src/components/cookie-consent-banner.tsx src/app/layout.tsx
git commit -m "feat: add GDPR cookie consent banner"
```

---

## Task 6: Root Metadata Fix (Branding + OG)

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update metadata in layout.tsx**

Replace the current metadata export with:

```typescript
export const metadata: Metadata = {
  title: {
    default: 'GreenLog',
    template: '%s | GreenLog',
  },
  description: 'Cannabis Strain Tracking & Collection',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GreenLog',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://greenlog.app',
    siteName: 'GreenLog',
    title: 'GreenLog',
    description: 'Cannabis Strain Tracking & Collection',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'GreenLog',
      },
    ],
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

- [ ] **Step 2: Test metadata**

Build the app and check the HTML head:
```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "fix: rename app from CannaLog to GreenLog, add OG metadata"
```

---

## Task 7: Dynamic Page Metadata

**Files:**
- Modify: `src/app/strains/[slug]/page.tsx`
- Modify: `src/app/community/page.tsx`
- Modify: `src/app/collection/page.tsx`

First read the existing files to understand their structure:

- [ ] **Step 1: Read existing strain slug page**

Read `src/app/strains/[slug]/page.tsx` to see current structure.

- [ ] **Step 2: Add generateMetadata to strain slug page**

Add at the end of the file (before any default export):
```typescript
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: strain } = await supabase
    .from('strains')
    .select('name, description, breeder, thc_level')
    .eq('slug', params.slug)
    .single()

  if (!strain) {
    return { title: 'Strain nicht gefunden | GreenLog' }
  }

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

- [ ] **Step 3: Read community page**

Read `src/app/community/page.tsx`.

- [ ] **Step 4: Add metadata export to community page**

Add after the imports:
```typescript
export const metadata = {
  title: 'Community',
  description: 'Entdecke Cannabis Communities, Clubs und Apotheken auf GreenLog.',
  openGraph: {
    title: 'Community | GreenLog',
    description: 'Entdecke Cannabis Communities, Clubs und Apotheken auf GreenLog.',
    images: [{ url: '/api/og' }],
  },
}
```

- [ ] **Step 5: Read collection page**

Read `src/app/collection/page.tsx`.

- [ ] **Step 6: Add metadata export to collection page**

Add after the imports:
```typescript
export const metadata = {
  title: 'Meine Sammlung',
  description: 'Deine persönliche Strain-Sammlung auf GreenLog.',
  openGraph: {
    title: 'Meine Sammlung | GreenLog',
    description: 'Deine persönliche Strain-Sammlung auf GreenLog.',
    images: [{ url: '/api/og' }],
  },
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/strains/[slug]/page.tsx src/app/community/page.tsx src/app/collection/page.tsx
git commit -m "feat: add generateMetadata for dynamic SEO"
```

---

## Task 8: Legal Pages — German (DE)

**Files:**
- Create: `src/app/(legal)/impressum/page.tsx`
- Create: `src/app/(legal)/datenschutz/page.tsx`
- Create: `src/app/(legal)/agb/page.tsx`

**Note:** Impressum content is TBD pending Team decision. Create placeholder with "TBD" comments.

- [ ] **Step 1: Create (legal) layout**

Create `src/app/(legal)/layout.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | GreenLog',
  },
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <article className="prose prose-invert max-w-none">
            {children}
          </article>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create impressum page (DE)**

Create `src/app/(legal)/impressum/page.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum von GreenLog — Cannabis Strain Tracking & Collection',
}

export default function ImpressumPage() {
  return (
    <div className="space-y-6">
      <h1>Impressum</h1>

      {/* TODO: Team muss entscheiden wer Betreiber ist */}
      <div style={{ backgroundColor: 'var(--warning)', padding: '12px', borderRadius: '8px', color: 'var(--foreground)' }}>
        <strong>⏳ In Bearbeitung</strong> — Impressum-Details werden mit Team geklärt.
        Bitte kontaktiere uns für geschäftliche Anfragen.
      </div>

      <section>
        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          {/* TBD: Name und Anschrift */}
          [Name des Betreibers]<br />
          [Straße und Hausnummer]<br />
          [PLZ, Ort]<br />
          Deutschland
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href="mailto:info@greenlog.app">info@greenlog.app</a>
        </p>
      </section>

      <section>
        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          {/* TBD: Name des Verantwortlichen */}
          [Name]
        </p>
      </section>

      <section>
        <h2>Haftungshinweis</h2>
        <p>
          Die Inhalte dieser Webseite dienen der allgemeinen Information und stellen keine
          rechtliche Beratung dar. Trotz sorgfältiger Recherche übernehmen wir keine Gewähr
          für die Aktualität, Richtigkeit oder Vollständigkeit der bereitgestellten Inhalte.
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Create datenschutz page (DE)**

Create `src/app/(legal)/datenschutz/page.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Datenschutzerklärung von GreenLog — Cannabis Strain Tracking & Collection',
}

export default function DatenschutzPage() {
  return (
    <div className="space-y-8">
      <h1>Datenschutzerklärung</h1>
      <p><strong>Stand:</strong> 31. März 2026</p>

      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          GreenLog<br />
          E-Mail: <a href="mailto:datenschutz@greenlog.app">datenschutz@greenlog.app</a>
        </p>
      </section>

      <section>
        <h2>2. Erhobene Daten</h2>
        <p>Wir erheben und verarbeiten folgende personenbezogene Daten:</p>
        <ul>
          <li><strong>Account-Daten:</strong> E-Mail-Adresse, Passwort (verschlüsselt)</li>
          <li><strong>Profil-Daten:</strong> Benutzername, Bio, Profilbild</li>
          <li><strong>Strain-Daten:</strong> Bewertungen, Favoriten, Sammlungs-Notizen</li>
          <li><strong>Aktivitätsdaten:</strong> Follows, Community-Beiträge, Badge-Fortschritt</li>
        </ul>
      </section>

      <section>
        <h2>3. Zweck der Verarbeitung</h2>
        <p>Ihre Daten werden verwendet für:</p>
        <ul>
          <li>Bereitstellung des GreenLog-Dienstes</li>
          <li>Verwaltung Ihres Accounts</li>
          <li>Speicherung Ihrer Strain-Sammlung und Bewertungen</li>
          <li>Social-Features (Follower, Community)</li>
          <li>Badge-System und Gamification</li>
        </ul>
      </section>

      <section>
        <h2>4. Cookies</h2>
        <p>
          Wir verwenden folgende Cookie-Kategorien:
        </p>
        <ul>
          <li><strong>Essenzielle Cookies:</strong> Für die Funktionalität des Dienstes erforderlich (Authentifizierung, Session)</li>
          <li><strong>Analyse-Cookies:</strong> Werden erst nach Ihrer Zustimmung gesetzt</li>
        </ul>
        <p>
          Sie können Ihre Cookie-Präferenzen jederzeit über den Banner am Seitenende ändern.
        </p>
      </section>

      <section>
        <h2>5. Weitergabe an Dritte</h2>
        <p>
          Ihre Daten werden an folgende Auftragsverarbeiter weitergegeben:
        </p>
        <ul>
          <li><strong>Supabase:</strong> Datenbank- und Authentifizierungsinfrastruktur (Auftragsverarbeiter gemäß Art. 28 DSGVO)</li>
          <li><strong>Vercel:</strong> Hosting-Infrastruktur</li>
        </ul>
      </section>

      <section>
        <h2>6. Ihre Rechte</h2>
        <p>Sie haben das Recht auf:</p>
        <ul>
          <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung ("Recht auf Vergessenwerden") (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>
        <p>Um Ihre Rechte auszuüben, kontaktieren Sie uns unter: <a href="mailto:datenschutz@greenlog.app">datenschutz@greenlog.app</a></p>
      </section>

      <section>
        <h2>7. Speicherdauer</h2>
        <p>
          Wir speichern Ihre Daten solange Ihr Account existiert. Nach Löschung Ihres Accounts
          werden die Daten innerhalb von 30 Tagen gelöscht, sofern keine gesetzlichen
          Aufbewahrungspflichten bestehen.
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Create agb page (DE)**

Create `src/app/(legal)/agb/page.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AGB',
  description: 'Allgemeine Geschäftsbedingungen von GreenLog',
}

export default function AGBPage() {
  return (
    <div className="space-y-8">
      <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>
      <p><strong>Stand:</strong> 31. März 2026</p>

      <section>
        <h2>1. Geltungsbereich</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der GreenLog-Plattform.
          Mit der Registrierung und Nutzung akzeptieren Sie diese AGB.
        </p>
      </section>

      <section>
        <h2>2. Leistungsbeschreibung</h2>
        <p>
          GreenLog bietet eine Plattform zur Verwaltung von Cannabis-Strains, Sammlungen
          und Community-Features. Die Grundfunktionen sind kostenlos nutzbar.
        </p>
      </section>

      <section>
        <h2>3. Registrierung und Account</h2>
        <p>
          Die Registrierung erfordert eine gültige E-Mail-Adresse. Sie sind verantwortlich
          für die Vertraulichkeit Ihrer Zugangsdaten und für alle Aktivitäten unter Ihrem Account.
        </p>
      </section>

      <section>
        <h2>4. Nutzungsbedingungen</h2>
        <p>Sie verpflichten sich:</p>
        <ul>
          <li>Keine falschen oder irreführenden Strain-Bewertungen zu erstellen</li>
          <li>Keine Inhalte zu veröffentlichen, die gegen geltendes Recht verstoßen</li>
          <li>Die Privatsphäre anderer Nutzer zu respektieren</li>
          <li>Keinen Missbrauch der Plattform zu betreiben</li>
        </ul>
      </section>

      <section>
        <h2>5. Haftungsausschluss</h2>
        <p>
          GreenLog übernimmt keine Gewähr für die Richtigkeit, Vollständigkeit oder
          Aktualität der bereitgestellten Strain-Informationen. Die Plattform ersetzt
          keine professionelle Beratung.
        </p>
      </section>

      <section>
        <h2>6. Geistiges Eigentum</h2>
        <p>
          Die GreenLog-Plattform und deren Inhalte sind urheberrechtlich geschützt.
          Vervielfältigung oder Weiterverwendung bedarf der vorherigen schriftlichen Zustimmung.
        </p>
      </section>

      <section>
        <h2>7. Änderung der AGB</h2>
        <p>
          Wir behalten uns vor, diese AGB jederzeit zu ändern. Über wesentliche Änderungen
          werden Sie per E-Mail informiert. Die aktuelle Version finden Sie stets hier.
        </p>
      </section>

      <section>
        <h2>8. Schlßbestimmungen</h2>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist, soweit
          gesetzlich zulässig, [Ort].
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(legal\)/layout.tsx src/app/\(legal\)/impressum/page.tsx src/app/\(legal\)/datenschutz/page.tsx src/app/\(legal\)/agb/page.tsx
git commit -m "feat: add legal pages (Impressum, Datenschutz, AGB) - German"
```

---

## Task 9: Legal Pages — English (EN)

**Files:**
- Create: `src/app/(legal)/en/impressum/page.tsx`
- Create: `src/app/(legal)/en/privacy/page.tsx`
- Create: `src/app/(legal)/en/terms/page.tsx`

- [ ] **Step 1: Create impressum page (EN)**

Create `src/app/(legal)/en/impressum/page.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum of GreenLog — Cannabis Strain Tracking & Collection',
}

export default function ImpressumEnPage() {
  return (
    <div className="space-y-6">
      <h1>Impressum (Legal Notice)</h1>

      {/* TODO: Team decision pending */}
      <div style={{ backgroundColor: 'var(--warning)', padding: '12px', borderRadius: '8px', color: 'var(--foreground)' }}>
        <strong>⏳ Pending</strong> — Impressum details to be confirmed with team.
        Please contact us for business inquiries.
      </div>

      <section>
        <h2>Information according to § 5 TMG (German Telemedia Act)</h2>
        <p>
          {/* TBD: Operator details */}
          [Operator Name]<br />
          [Street Address]<br />
          [Postal Code, City]<br />
          Germany
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Email: <a href="mailto:info@greenlog.app">info@greenlog.app</a>
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Create privacy page (EN)**

Create `src/app/(legal)/en/privacy/page.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy of GreenLog — Cannabis Strain Tracking & Collection',
}

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> March 31, 2026</p>

      <section>
        <h2>1. Controller</h2>
        <p>
          GreenLog<br />
          Email: <a href="mailto:privacy@greenlog.app">privacy@greenlog.app</a>
        </p>
      </section>

      <section>
        <h2>2. Data We Collect</h2>
        <p>We collect and process the following personal data:</p>
        <ul>
          <li><strong>Account data:</strong> Email address, password (encrypted)</li>
          <li><strong>Profile data:</strong> Username, bio, profile picture</li>
          <li><strong>Strain data:</strong> Ratings, favorites, collection notes</li>
          <li><strong>Activity data:</strong> Follows, community posts, badge progress</li>
        </ul>
      </section>

      <section>
        <h2>3. Purpose of Processing</h2>
        <p>Your data is used for:</p>
        <ul>
          <li>Providing the GreenLog service</li>
          <li>Managing your account</li>
          <li>Storing your strain collection and ratings</li>
          <li>Social features (Followers, Community)</li>
          <li>Badge system and gamification</li>
        </ul>
      </section>

      <section>
        <h2>4. Cookies</h2>
        <p>
          We use the following cookie categories:
        </p>
        <ul>
          <li><strong>Essential cookies:</strong> Required for service functionality (authentication, session)</li>
          <li><strong>Analytics cookies:</strong> Set only after your consent</li>
        </ul>
      </section>

      <section>
        <h2>5. International Transfers</h2>
        <p>
          Your data may be transferred to and processed in countries outside the European Economic Area.
          Such transfers are conducted in accordance with GDPR requirements.
        </p>
      </section>

      <section>
        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your stored data (Art. 15 GDPR)</li>
          <li>Rectify inaccurate data (Art. 16 GDPR)</li>
          <li>Request erasure ("Right to be Forgotten") (Art. 17 GDPR)</li>
          <li>Restrict processing (Art. 18 GDPR)</li>
          <li>Data portability (Art. 20 GDPR)</li>
          <li>Object to processing (Art. 21 GDPR)</li>
        </ul>
        <p>To exercise your rights, contact us at: <a href="mailto:privacy@greenlog.app">privacy@greenlog.app</a></p>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Create terms page (EN)**

Create `src/app/(legal)/en/terms/page.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service of GreenLog',
}

export default function TermsPage() {
  return (
    <div className="space-y-8">
      <h1>Terms of Service</h1>
      <p><strong>Last updated:</strong> March 31, 2026</p>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By registering and using GreenLog, you accept these Terms of Service.
          If you do not agree to these terms, please do not use our platform.
        </p>
      </section>

      <section>
        <h2>2. Description of Service</h2>
        <p>
          GreenLog provides a platform for managing cannabis strains, collections,
          and community features. Basic functions are free to use.
        </p>
      </section>

      <section>
        <h2>3. Registration and Account</h2>
        <p>
          Registration requires a valid email address. You are responsible for
          keeping your login credentials confidential and for all activities under your account.
        </p>
      </section>

      <section>
        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Submit false or misleading strain ratings</li>
          <li>Publish content that violates applicable law</li>
          <li>Violate the privacy of other users</li>
          <li>Misuse the platform in any way</li>
        </ul>
      </section>

      <section>
        <h2>5. Disclaimer</h2>
        <p>
          GreenLog makes no warranty about the accuracy, completeness, or timeliness
          of strain information provided. The platform does not replace professional advice.
        </p>
      </section>

      <section>
        <h2>6. Intellectual Property</h2>
        <p>
          The GreenLog platform and its content are protected by copyright.
          Reproduction or reuse requires prior written consent.
        </p>
      </section>

      <section>
        <h2>7. Changes to Terms</h2>
        <p>
          We reserve the right to change these Terms of Service at any time.
          You will be notified by email about significant changes.
          The current version is always available here.
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(legal\)/en/impressum/page.tsx src/app/\(legal\)/en/privacy/page.tsx src/app/\(legal\)/en/terms/page.tsx
git commit -m "feat: add legal pages (Impressum, Privacy, Terms) - English"
```

---

## Task 10: Sentry Integration

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `instrumentation.ts` (if needed)
- Modify: `next.config.ts`

**Note:** Run the sentry-wizard first, then adjust. The wizard is interactive so it needs to be run manually by a developer with Sentry access.

- [ ] **Step 1: Run sentry-wizard**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
npx sentry-wizard@latest -i nextjs
```

Follow the interactive prompts:
- Sentry organization: [your-org]
- Project: [create new or select existing]
- Connect to Vercel: Yes (recommended)
- Set auth token via SENTRY_AUTH_TOKEN env var

The wizard will:
1. Install `@sentry/nextjs` package
2. Create `sentry.client.config.ts`
3. Create `sentry.server.config.ts`
4. Modify `next.config.ts` with sentry plugin
5. Create or modify `instrumentation.ts` if needed

- [ ] **Step 2: Verify sentry configs were created**

```bash
ls -la sentry.*.config.ts
```

- [ ] **Step 3: Add Sentry DSN to .env.local (temporär)**

```bash
echo "NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project" >> .env.local
```

- [ ] **Step 4: Test in development**

```bash
npm run dev
```

Trigger a test error in the browser console:
```javascript
throw new Error('Sentry test error')
```

Check Sentry dashboard for the error.

- [ ] **Step 5: Commit sentry files**

```bash
git add sentry.client.config.ts sentry.server.config.ts next.config.ts
git add instrumentation.ts  # if created
git add package.json package-lock.json
git commit -m "feat: add Sentry error tracking for Next.js"
```

---

## Task 11: .env.example Dokumentation

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create .env.example**

Create `.env.example`:

```bash
# =============================================
# GreenLog — Environment Variables
# =============================================
# Copy this file to .env.local and fill in the values.
# NEVER commit .env.local to version control!

# --- Supabase (Required) ---
# Get these from: Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_xxxx    # Public key — safe in browser
SUPABASE_SERVICE_ROLE_KEY=sb_xxxx        # Server-only key — NEVER expose to client!

# --- Sentry (nach `npx sentry-wizard@latest -i nextjs`) ---
# Get these from: Sentry Dashboard > Settings > Projects > [Project] > Client Keys
SENTRY_ORG=your-org
SENTRY_PROJECT=greenlog-app
SENTRY_AUTH_TOKEN=xxxx                   # CI/CD only — NOT in .env.local!
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/xxxx  # Public, OK in .env.local

# --- Optional APIs ---
# MiniMax API key (if AI features are used)
MINIMAX_API_KEY=sk-xxxx

# GitHub token (for CI/CD workflows)
GITHUB_TOKEN=ghp_xxxx

# --- App Configuration ---
# Comma-separated user IDs with admin privileges (can override strain images)
APP_ADMIN_IDS=user-id-1,user-id-2

# Comma-separated user IDs allowed to create feedback tickets
FEEDBACK_ALLOWED_CREATOR_IDS=user-id-1,user-id-2

# --- URLs ---
NEXT_PUBLIC_SITE_URL=https://greenlog.app
```

- [ ] **Step 2: Verify .gitignore contains .env.local**

Check if `.env.local` is in `.gitignore`:
```bash
grep -n "\.env" .gitignore
```

If not present, add it:
```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "docs: add .env.example with all required environment variables"
```

---

## Spec Coverage Check

| Spec Section | Task(s) |
|--------------|---------|
| Legal Pages | Task 8 (DE), Task 9 (EN) |
| Cookie Consent Banner | Task 5 |
| SEO (sitemap, robots, OG) | Task 3, Task 4 |
| Rate Limiting | Task 1 |
| Sentry | Task 10 |
| Route Protection | Task 1 |
| Health Check | Task 2 |
| .env.example | Task 11 |
| Branding Fix | Task 6 |
| Dynamic Page Metadata | Task 7 |

**All spec requirements covered.**

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-03-31-greenlog-publish-critical-launch-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - Dispatch fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks sequentially in this session, batched with checkpoints

Which approach?
