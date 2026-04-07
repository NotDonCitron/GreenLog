# CannaLOG – Pre-Launch Fix Plan

> **Stand:** 2026-04-04  
> **Branding:** CannaLOG (bleibt vorerst)  
> **Impressum:** Wird nachgereicht (nicht im Launch-Scope)  
> **Status:** Kurz vor Veröffentlichung – kritische Fixes priorisieren

---

## Übersicht

| Phase | Fokus | Dauer | Aufwand |
|-------|-------|-------|---------|
| **Phase 1** | Kritische Sicherheitsfixes | 1-2 Tage | ~20h |
| **Phase 2** | Error Handling, CORS, Sentry PII, Route-Absicherung | 1-2 Tage | ~16h |
| **Phase 3** | Performance-Optimierungen | 2-3 Tage | ~14h |
| **Phase 4** | UX-Verbesserungen | 2-3 Tage | ~16h |
| **Phase 5** | App Store Readiness & Monetarisierung | 2-4 Wochen | ~60h |
| **Phase 6** | Testing & QA | 1-2 Wochen | ~20h |

---

## Phase 1: Kritische Sicherheitsfixes (P0 – sofort)

### 1.1 JWT-Auth auf `supabase.auth.getUser()` umstellen

**Problem:** 3 API Routes (`follow-request/manage`, `follow-request/[userId]`, `community/[id]/join`) nutzen `decodeToken()` aus `src/lib/auth/utils.ts` – eine Base64-Decodierung OHNE Signaturprüfung. Angreifer können beliebige JWTs fälschen.

**Betroffene Dateien:**
- `src/lib/auth/utils.ts` – `decodeToken()` entfernen oder als deprecated markieren
- `src/app/api/follow-request/manage/route.ts` – Zeilen 7-15, 32-33, 65-68
- `src/app/api/follow-request/[userId]/route.ts` – Zeilen 25-28, 126-128
- `src/app/api/community/[id]/join/route.ts` – Zeilen 25-28

**Fix:** Alle betroffenen Routes auf das bestehende `authenticateRequest()` Pattern aus `src/lib/api-response.ts` umstellen. Diese Funktion nutzt bereits `supabase.auth.getUser()` mit korrekter Signaturprüfung.

**Schritte:**
1. `src/lib/auth/utils.ts`: `decodeToken()` entfernen
2. In jeder betroffenen Route:
   - Lokale `decodeToken()` und `getSupabaseClient()` Helper entfernen
   - `authenticateRequest(request, getAuthenticatedClient)` am Anfang aufrufen
   - `userId` aus `auth.user.id` statt aus JWT-Decoding beziehen
3. Testen: Alle Follow-Request und Community-Join Flows

**Aufwand:** ~4h

---

### 1.2 RLS-Policy-Lücken schließen

**Problem:** Mehrere Policies erlauben zu weitreichende Zugriffe.

**Betroffene Policies in `supabase-schema.sql`:**

| Policy | Zeile | Problem | Fix |
|--------|-------|---------|-----|
| `user_badges` INSERT | 517-518 | User können sich selbst ANY Badge geben | INSERT nur via SECURITY DEFINER Function oder Service Role erlauben |
| `organization_members` UPDATE | 111-115 | Jedes Member kann JEDES andere Member updaten | Nur eigene Daten ODER Admin/Gründer |
| `organization_members` DELETE | 117-121 | Jedes Member kann JEDES andere Member löschen | Nur eigene Daten ODER Admin/Gründer |
| `organization_invites` UPDATE | 158-161 | Jedes Member (inkl. viewer) kann Invites widerrufen | Nur Admin/Gründer |
| `profiles` SELECT | 294-295 | `profile_visibility` wird ignoriert – private Profiles sind öffentlich | Policy muss `profile_visibility` prüfen |

**Fix – Neue Migration erstellen:**

```sql
-- 1. user_badges: Nur Service Role kann Badges vergeben
DROP POLICY "Users can insert own badges" ON user_badges;
-- Badges werden ausschließlich über /api/badges/check (Service Role) vergeben

-- 2. organization_members: Nur Admin/Gründer können andere Member bearbeiten
DROP POLICY "Members can update own membership, admins can update any" ON organization_members;
CREATE POLICY "Users can update own membership" ON organization_members 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any membership" ON organization_members 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_members.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
  );

DROP POLICY "Members can leave, admins can remove" ON organization_members;
CREATE POLICY "Users can leave org" ON organization_members 
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can remove members" ON organization_members 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_members.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
  );

-- 3. organization_invites: Nur Admin/Gründer können Invites verwalten
DROP POLICY "Admins can revoke invites" ON organization_invites;
CREATE POLICY "Admins can revoke invites" ON organization_invites 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_invites.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
  );

-- 4. profiles: Visibility respektieren
DROP POLICY "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles viewable by all" ON profiles 
  FOR SELECT USING (profile_visibility = 'public');
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Org members can view each other's profiles" ON profiles 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members AS m1
      JOIN organization_members AS m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = auth.uid()
      AND m2.user_id = profiles.id
      AND m1.membership_status = 'active'
      AND m2.membership_status = 'active'
    )
  );

-- 5. create_follow: Caller-Validierung hinzufügen
CREATE OR REPLACE FUNCTION create_follow(follower_uuid UUID, following_uuid UUID)
RETURNS UUID AS $$
DECLARE
  follow_id UUID;
BEGIN
  -- Caller muss der follower sein
  IF auth.uid() != follower_uuid THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  IF EXISTS (SELECT 1 FROM follows WHERE follower_id = follower_uuid AND following_id = following_uuid) THEN
    RETURN NULL;
  END IF;
  INSERT INTO follows (follower_id, following_id) VALUES (follower_uuid, following_uuid) RETURNING id INTO follow_id;
  RETURN follow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Aufwand:** ~4h

---

### 1.3 Rate Limiting auf Redis/Upstash migrieren

**Problem:** In-Memory Map in `middleware.ts` resetted bei jedem Vercel Cold Start und ist über Edge-Instanzen hinweg wirkungslos.

**Fix:** Upstash Redis Rate Limiting (kostenlos bis 10k Requests/Tag)

**Schritte:**
1. `npm install @upstash/ratelimit @upstash/redis`
2. Upstash Projekt erstellen, URL + Token als Env-Vars
3. `middleware.ts` umschreiben:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "60 s"),
});

// In middleware():
const { success } = await ratelimit.limit(ip);
if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
```

**Fallback:** Falls kein Upstash gewünscht, zumindest die Cleanup-Logik verbessern und einen Warning-Log einfügen.

**Aufwand:** ~4h

---

### 1.4 GDPR Delete – Service Role Key sicher verwenden

**Problem:** `src/app/api/gdpr/delete/route.ts` sendet Service Role Key als `apikey` Header – kann in Logs/Proxies landen.

**Fix:** Supabase Admin SDK korrekt nutzen:

```typescript
const { error } = await serviceClient.auth.admin.deleteUser(user.id);
```

Statt manuellem `fetch()` mit Service Key in Headern.

**Aufwand:** ~1h

---

### 1.5 Leafly-Import authentifizieren + SSRF-Schutz

**Problem:** `src/app/api/import/leafly/route.ts` ist unauthentifiziert und erlaubt Server-seitige Fetches.

**Fix:**
1. `authenticateRequest()` am Anfang einfügen
2. Nur Admin-User IDs (aus `APP_ADMIN_IDS`) dürfen importieren
3. DNS-Rebinding-Schutz: IP des resolved Hostnames gegen bekannte Leafly-IPs prüfen

**Aufwand:** ~2h

---

### 1.6 Secrets rotieren

**Problem:** `.env.local` enthält Live-Produktionsgeheimnisse.

**Schritte:**
1. Supabase Service Role Key rotieren (Supabase Dashboard → Settings → API)
2. GitHub Token rotieren (GitHub → Settings → Developer Settings)
3. MiniMax API Key rotieren
4. VAPID Keys neu generieren
5. Firecrawl API Key rotieren
6. Neue Values in Vercel Dashboard und `.env.local` aktualisieren

**Aufwand:** ~1h

---

## Phase 2: Error Handling, CORS, Sentry PII, Route-Absicherung

### 2.1 Global Error Boundary

**Problem:** Kein Error Boundary – ein Component-Crash bringt die gesamte App zum Stillstand.

**Fix:** Error Boundary in `src/app/layout.tsx` und `src/app/error.tsx`

```tsx
// src/components/error-boundary.tsx
export class ErrorBoundary extends React.Component<...> {
  // Standard React Error Boundary Pattern
}

// In layout.tsx:
<ErrorBoundary fallback={<GlobalErrorFallback />}>
  <Providers>...</Providers>
</ErrorBoundary>
```

**Aufwand:** ~2h

---

### 2.2 CORS-Header konfigurieren

**Problem:** Keine CORS-Konfiguration – beliebige Websites können API-Aufrufe machen.

**Fix:** In `middleware.ts` oder `next.config.ts`:

```typescript
// middleware.ts – vor rate limiting
if (request.method === 'OPTIONS') {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://greenlog.app',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

const response = NextResponse.next();
response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_SITE_URL || 'https://greenlog.app');
```

**Aufwand:** ~2h

---

### 2.3 Sentry PII-Scrubbing

**Problem:** Sentry configs haben keine `beforeSend` Filter – User-IDs, E-Mails, Request-Bodies landen ungefiltert in Sentry.

**Fix:** In allen 3 Sentry Configs:

```typescript
// sentry.client.config.ts
Sentry.init({
  // ... existing config
  beforeSend(event) {
    // Remove PII
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
    }
    // Scrub sensitive data from breadcrumbs
    event.breadcrumbs?.forEach(b => {
      if (b.data) {
        delete b.data.token;
        delete b.data.Authorization;
      }
    });
    return event;
  },
  // Don't send request bodies
  sendDefaultPii: false,
});
```

**Aufwand:** ~2h

---

### 2.4 Preview- und Admin-Routes absichern

**Problem:** `/preview/*` (11 Seiten) und `/admin/seed` sind öffentlich ohne Auth.

**Fix:**
1. Preview-Routes: Middleware-Redirect zu `/login` wenn nicht eingeloggt
2. Admin-Seed: Nur für User IDs in `APP_ADMIN_IDS` zugänglich
3. Alternativ: Preview-Routes nur in Development bauen (`process.env.NODE_ENV === 'development'`)

**Aufwand:** ~2h

---

### 2.5 API Error Responses – interne Details verbergen

**Problem:** Supabase Error Codes und Messages werden direkt an Clients gesendet.

**Fix:** `jsonError()` in Production nur generische Messages senden:

```typescript
export function jsonError(message, status = 500, code?, details?) {
  const isProd = process.env.NODE_ENV === 'production';
  return NextResponse.json(
    {
      data: null,
      error: {
        message: isProd && status >= 500 ? "Internal server error" : message,
        code: isProd && status >= 500 ? undefined : code,
        details: isProd && status >= 500 ? undefined : details,
      },
    },
    { status }
  );
}
```

**Aufwand:** ~1h

---

### 2.6 CSV-Injection-Schutz

**Problem:** `src/app/api/organizations/[organizationId]/analytics/export/route.ts` schreibt User-Daten direkt in CSV.

**Fix:** CSV-Zellen sanitizen:

```typescript
function sanitizeCsvCell(value: string): string {
  if (value.startsWith('=') || value.startsWith('+') || value.startsWith('-') || value.startsWith('@')) {
    return `'${value}`;
  }
  return value;
}
```

**Aufwad:** ~1h

---

### 2.7 `sentry-test` Endpoint entfernen

**Problem:** Test-Endpoint ist in Production erreichbar.

**Fix:** `src/app/api/sentry-test/route.ts` löschen oder hinter Auth + Admin-Only legen.

**Aufwand:** ~15min

---

### 2.8 Invite-Token Column Mismatch fixen

**Problem:** `src/app/api/invites/[token]/accept/route.ts` queryt `.eq("token", token)` aber die Spalte heißt `token_hash`.

**Fix:** Query auf `token_hash` korrigieren oder RPC `get_invite_preview` nutzen.

**Aufwand:** ~30min

---

## Phase 3: Performance-Optimierungen

### 3.1 `next.config.ts` Optimierungen

```typescript
export default withSentryConfig({
  // ... existing config
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@supabase/supabase-js'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year for CDN-cached images
  },
});
```

**Aufwand:** ~30min

---

### 3.2 Strain-Filtering serverseitig verlagern

**Problem:** `src/app/strains/page.tsx` fetched paginierte Daten und filtert dann client-seitig – Filter funktionieren nur auf aktueller Seite.

**Fix:** Filter-Parameter an Supabase-Query übergeben:

```typescript
// Statt client-seitigem .filter():
let query = supabase.from('strains').select('*', { count: 'exact' });

if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
if (typeFilter) query = query.eq('type', typeFilter);
if (thcMin) query = query.gte('thc_max', thcMin);
// etc.
```

**Aufwand:** ~4h

---

### 3.3 Tesseract.js als Dynamic Import

**Problem:** Tesseract.js (~7MB) wird als eager dependency geladen.

**Fix:** In Scanner-Komponenten:

```typescript
const Tesseract = dynamic(() => import('tesseract.js'), { ssr: false });
```

Oder nur beim ersten Scanner-Aufruf laden.

**Aufwand:** ~1h

---

### 3.4 `<img>` durch `<Image>` ersetzen

**Betroffen:**
- `src/app/strains/[slug]/StrainDetailPageClient.tsx:579`
- `src/components/age-gate.tsx:70`

**Fix:** Next.js `<Image>` Component mit `priority` für above-fold Images.

**Aufwand:** ~30min

---

### 3.5 500ms künstliche Verzögerung entfernen

**Problem:** `src/app/page.tsx:48` – `await new Promise(resolve => setTimeout(resolve, 500))`

**Fix:** Zeile löschen.

**Aufwand:** ~5min

---

### 3.6 `escapeRegExp` in Shared Utility extrahieren

**Problem:** Dupliziert in `strain-card.tsx` und `StrainDetailPageClient.tsx`.

**Fix:** Neue Datei `src/lib/string-utils.ts` erstellen, beide Imports aktualisieren.

**Aufwand:** ~15min

---

### 3.7 `useCollection` Queries konsolidieren

**Problem:** `useCollection` und `useCollectionIds` machen redundante Queries.

**Fix:** IDs aus der Haupt-Collection-Query ableiten, separate IDs-Query nur wenn nötig.

**Aufwand:** ~2h

---

## Phase 4: UX-Verbesserungen

### 4.1 Toast-System statt `alert()`

**Problem:** 14+ `alert()` Aufrufe in `StrainDetailPageClient.tsx` – blockieren UI, nicht barrierefrei.

**Fix:** Toast-Provider erstellen (z.B. `sonner` oder `react-hot-toast`):

```bash
npm install sonner
```

```tsx
// src/components/providers/toast-provider.tsx
import { Toaster } from 'sonner';
export const ToastProvider = () => <Toaster position="top-center" />;

// Alle alert() ersetzen:
toast.error('Fehler beim Speichern');
toast.success('Erfolgreich hinzugefügt');
```

**Aufwand:** ~4h

---

### 4.2 Offline-Fallback-Seite erstellen

**Problem:** Service Worker verweist auf `/offline` aber Seite existiert nicht.

**Fix:**
1. `public/offline.html` erstellen (statische HTML-Seite)
2. Oder `src/app/offline/page.tsx` mit sinnvollem Offline-UI

**Aufwand:** ~2h

---

### 4.3 Theme-Flash beheben

**Problem:** `theme-init.tsx` nutzt `useEffect` – läuft nach erstem Paint → sichtbarer Flash.

**Fix:** Inline `<script>` im `<head>`:

```tsx
// In layout.tsx <head>:
<script dangerouslySetInnerHTML={{
  __html: `
    (function() {
      try {
        var theme = localStorage.getItem('cannalog_theme');
        if (theme === 'light') {
          document.documentElement.classList.add('light');
        }
      } catch(e) {}
    })();
  `
}} />
```

`ThemeInit` Component kann dann entfallen.

**Aufwand:** ~1h

---

### 4.4 `userScalable: false` entfernen

**Problem:** WCAG 2.1 Verletzung – keine Pinch-to-Zoom.

**Fix:** In `layout.tsx`:

```typescript
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale: 1,     // ENTFERNEN
  // userScalable: false, // ENTFERNEN
  themeColor: "#22c55e",
  viewportFit: "cover",
};
```

**Aufwand:** ~5min

---

### 4.5 Onboarding reduzieren

**Problem:** 8 Schritte sind zu lang – Best Practice: 3-5.

**Fix:**
1. Ähnliche Schritte zusammenfassen (z.B. Strain-Info + Collection in einem Schritt)
2. "Überspringen"-Button prominenter machen
3. Fortschritt in localStorage speichern

**Aufwand:** ~3h

---

### 4.6 Bottom Nav verbessern

**Probleme:**
- Text 9px → zu klein
- Kein `aria-label` auf `<nav>`
- Follow-Request-Polling auf jeder Seite

**Fix:**
1. `text-[9px]` → `text-[11px]`
2. `<nav aria-label="Hauptnavigation">`
3. Polling nur auf Social-Tab oder via Supabase Realtime

**Aufwand:** ~2h

---

### 4.7 Cookie-Banner fixen

**Probleme:**
- Überlappt Bottom Nav auf Mobile
- Inline Styles statt Tailwind
- Kein Focus Trap, keine ARIA-Attribute

**Fix:**
1. Position über Bottom Nav (`bottom-20` statt `bottom-0`)
2. Tailwind Classes statt inline styles
3. `role="dialog"` und `aria-modal="true"` hinzufügen
4. `localStorage` in try/catch

**Aufwand:** ~2h

---

### 4.8 FAB-Button Funktionalität

**Problem:** "+" Button in Collection-Seite hat keinen `onClick` Handler.

**Fix:** Entweder Funktionalität hinzufügen (z.B. "Strain zur Collection hinzufügen") oder Button entfernen.

**Aufwand:** ~1h

---

### 4.9 Blur-Placeholder für Strain-Images

**Problem:** Layout Shift beim Laden von Strain-Bildern.

**Fix:** `placeholder="blur"` mit generierten Blur-Data-URLs oder `blurDataURL` Prop.

**Aufwand:** ~2h

---

## Phase 5: App Store Readiness & Monetarisierung

### 5.1 Capacitor App Wrapper

**Schritte:**
1. `npm install @capacitor/core @capacitor/cli`
2. `npx cap init CannaLog com.cannalog.app`
3. `npx cap add android` und `npx cap add ios`
4. `npx cap sync` nach jedem Build
5. Native Permissions konfigurieren (Camera für Scanner)

**Aufwand:** ~8h

---

### 5.2 Stripe Subscription Integration

**Schritte:**
1. `npm install @stripe/stripe-js @stripe/react-stripe-js`
2. Stripe Account erstellen, Products + Prices anlegen
3. API Routes: `/api/stripe/checkout`, `/api/stripe/webhook`
4. `subscriptions` Tabelle in Supabase
5. Pricing Page erstellen
6. Feature-Gating: Premium-Features prüfen Subscription-Status

**Aufwand:** ~12h

---

### 5.3 App Store Screenshots & ASO

**Checkliste:**
- [ ] App Icons finalisiert (1024x1024)
- [ ] Screenshots: iPhone 6.5", 5.5", iPad; Android Phone, Tablet
- [ ] App-Subtitle: "Strain Tracker & Collection"
- [ ] Keywords: cannabis, strain, tracker, collection, CSC, club, sorten
- [ ] Promotional Text: "Die #1 Cannabis Strain Tracking App für Deutschland"
- [ ] App-Beschreibung (DE + EN)
- [ ] App Preview Video (30 Sekunden)

**Aufwand:** ~8h

---

### 5.4 Product Analytics

**Empfehlung:** PostHog (open source, GDPR-compliant, selbst hostbar)

**Schritte:**
1. `npm install posthog-js posthog-node`
2. PostHog SDK in `layout.tsx` initialisieren
3. Wichtige Events tracken: signup, strain_collected, rating_submitted, badge_earned
4. Funnles definieren: Landing → Signup → First Action → Retention

**Aufwand:** ~4h

---

### 5.5 Landing Page Conversion-Optimierung

**Fehlende Elemente:**
- Social Proof (User-Zahlen, Testimonials)
- FAQ-Sektion
- Trust Signals (GDPR Badge, Security)
- Vergleichstabelle vs. Wettbewerber
- Klare Value Proposition

**Aufwand:** ~8h

---

### 5.6 Dynamische OG-Images pro Strain

**Problem:** Alle Seiten nutzen dasselbe `/api/og` Bild.

**Fix:** `/api/og` so erweitern, dass es Strain-spezifische Daten aus URL-Params nimmt und dynamisch rendert.

**Aufwand:** ~4h

---

### 5.7 JSON-LD Structured Data

**Fix:** In `layout.tsx` und Strain-Detail-Seiten:

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{
  __html: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "CannaLog",
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Web, iOS, Android",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" }
  })
}} />
```

**Aufwand:** ~2h

---

## Phase 6: Testing & QA

### 6.1 E2E-Tests erweitern

**Aktuell:** 7 Smoke Tests  
**Ziel:** 60%+ Coverage

**Neue Tests:**
- Auth Flow (Login, Signup, Logout, Password Reset)
- Strain Collection (collect, uncollect, toggle)
- Rating erstellen und bearbeiten
- Follow/Unfollow Flow
- Community erstellen und beitreten
- Organization Invite Flow
- GDPR Export und Löschung
- Badge Unlock Flow
- Scanner Flow (wenn implementiert)

**Aufwand:** ~10h

---

### 6.2 Cross-Browser-Tests

**Aktuell:** Nur Chromium  
**Ziel:** Chrome, Safari, Firefox, Edge

**Fix:** Playwright Config erweitern:

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
]
```

**Aufwand:** ~2h

---

### 6.3 API Route Tests

**Neue Tests für:**
- Alle CRUD-Endpoints
- Auth-geschützte Routes (401 ohne Token)
- RLS-geschützte Queries (User sieht nur eigene Daten)
- Error Cases (invalid input, not found, conflict)

**Aufwand:** ~8h

---

## Zusammenfassung: Priorisierte Reihenfolge

### SOFORT (Tag 1-3, ~20h)
1. ✅ JWT-Auth umstellen (1.1)
2. ✅ RLS-Policies fixen (1.2)
3. ✅ Secrets rotieren (1.6)
4. ✅ Error Boundary (2.1)
5. ✅ GDPR Delete fixen (1.4)
6. ✅ `userScalable: false` entfernen (4.4)

### DRINGEND (Tag 4-7, ~16h)
7. ✅ CORS konfigurieren (2.2)
8. ✅ Sentry PII-Scrubbing (2.3)
9. ✅ Preview/Admin-Routes absichern (2.4)
10. ✅ Leafly-Import absichern (1.5)
11. ✅ API Error Responses sanitizen (2.5)
12. ✅ Rate Limiting migrieren (1.3)
13. ✅ Invite-Token Mismatch fixen (2.8)
14. ✅ CSV-Injection-Schutz (2.6)

### WICHTIG (Woche 2-3, ~14h)
15. ✅ Toast-System (4.1)
16. ✅ Strain-Filtering serverseitig (3.2)
17. ✅ Tesseract.js Dynamic Import (3.3)
18. ✅ Theme-Flash beheben (4.3)
19. ✅ Offline-Page erstellen (4.2)
20. ✅ next.config Optimierungen (3.1)
21. ✅ `<Image>` statt `<img>` (3.4)
22. ✅ 500ms Delay entfernen (3.5)

### EMPFOHLEN (Woche 3-4, ~16h)
23. ✅ Onboarding reduzieren (4.5)
24. ✅ Bottom Nav verbessern (4.6)
25. ✅ Cookie-Banner fixen (4.7)
26. ✅ Blur-Placeholders (4.9)
27. ✅ FAB-Button fixen (4.8)
28. ✅ `useCollection` konsolidieren (3.7)

### LAUNCH-VORBEREITUNG (Woche 4-8, ~60h)
29. ✅ Capacitor Wrapper (5.1)
30. ✅ Stripe Integration (5.2)
31. ✅ App Store Screenshots (5.3)
32. ✅ Landing Page optimieren (5.5)
33. ✅ Product Analytics (5.4)
34. ✅ Dynamische OG-Images (5.6)
35. ✅ JSON-LD (5.7)

### QA (parallel, ~20h)
36. ✅ E2E-Tests erweitern (6.1)
37. ✅ Cross-Browser-Tests (6.2)
38. ✅ API Route Tests (6.3)

---

## Risiko-Bewertung

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigation |
|--------|-------------------|------------|------------|
| JWT-Auth Lücke wird ausgenutzt | Hoch | Kritisch | Phase 1.1 sofort |
| RLS-Policy Leak privater Daten | Mittel | Hoch | Phase 1.2 sofort |
| App Store Ablehnung (Cannabis) | Mittel | Hoch | Frühzeitig Guidelines prüfen |
| Rate Limiting Abuse | Mittel | Mittel | Phase 1.3 |
| GDPR-Verstoß durch Sentry | Niedrig | Hoch | Phase 2.3 |
| Performance-Probleme bei Scale | Niedrig | Mittel | Phase 3 |

---

## Nicht im Scope (später)

- **Impressum ausfüllen** – wird nachgereicht (wie besprochen)
- **Grow-Features** – bleiben pausiert (rechtliche Klärung ausstehend)
- **Supabase Realtime** – kommt mit Feature #1 (geplant)
- **White-Label Option** – Phase 3 Monetarisierung
- **Multi-Language UI** – aktuell nur Legal Pages EN/DE
