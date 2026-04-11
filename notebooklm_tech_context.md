# GreenLog / CannaLog - Technischer Kontext (NotebookLM)

Dieses Dokument dient als technisches Wiki und Wissensbasis für die KI-Unterstützung in NotebookLM. Es beschreibt den aktuellen Stand der Softwarearchitektur, Datenbankstruktur, Authentifizierung und Implementierungsdetails.

## 1. Tech-Stack & Architektur

- **Framework:** Next.js 15.5 (App Router, TypeScript)
- **Frontend:** React 19, Tailwind CSS v4, Framer Motion (Animationen), Radix UI (Primitives), Lucide React (Icons).
- **Backend:** Next.js Route Handlers (API).
- **Datenbank & Echtzeit:** Supabase (PostgreSQL, Realtime, Storage).
- **Authentifizierung:** Clerk (Integration mit Supabase via JWT/RLS).
- **State Management:** TanStack Query (React Query) v5.
- **Mobile Support:** Capacitor (Android Integration).
- **Testing:** Vitest (Unit/Integration), Playwright (E2E).

## 2. Authentifizierung & RLS

### Clerk-Supabase Integration
Die Authentifizierung erfolgt primär über Clerk. Supabase wird über einen benutzerdefinierten JWT-Token von Clerk angesprochen.
- **JWT-Extraktion:** In Supabase wird die Funktion `requesting_user_id()` verwendet, um die Clerk-User-ID (`sub` claim) aus dem JWT zu extrahieren.
- **RLS (Row Level Security):** Alle Tabellen haben RLS aktiviert. Policies prüfen meist `requesting_user_id() = user_id`.

### Beispiel: `requesting_user_id()`
```sql
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::TEXT;
$ LANGUAGE SQL STABLE;
```

## 3. Datenbank-Schema (Kern-Tabellen)

### Strains (`strains`)
Zentrale Tabelle für Cannabis-Sorten.
- `id` (UUID)
- `name`, `slug`, `type` (indica, sativa, hybrid, ruderalis)
- `thc_min`, `thc_max`, `cbd_min`, `cbd_max`
- `terpenes` (TEXT[]), `effects` (TEXT[]), `flavors` (TEXT[])
- `avg_thc`, `avg_cbd`, `brand`, `manufacturer`, `farmer`, `genetics` (Added in migrations)

### Ratings (`ratings`)
User-Bewertungen für Strains.
- `strain_id` (UUID), `user_id` (TEXT)
- `overall_rating` (1-5), `taste_rating`, `effect_rating`, `look_rating`
- `review` (TEXT), `consumption_method`, `image_url`

### User Collections & Relations
- `user_strain_relations`: Favoriten (`is_favorite`) und Merkliste (`is_wishlist`).
- `user_collection`: Persönliche Notizen, Batch-Infos, User-Bilder pro Strain.
- `user_badges`: Freigeschaltete Badges.

### Social Features
- `follows`: User folgen anderen Usern.
- `user_activities`: Activity Feed (Ratings, Grows, etc.).
- `follow_requests`: Für private Profile.

## 4. Terpene-Matching Algorithmus (KCanG-konform)

Ein Algorithmus zur Berechnung der chemischen Ähnlichkeit zwischen User-Präferenzen und Strain-Profilen.

### Kernkonzept: 9-D Vektor
- **Terpene (4):** Myrcen, Limonen, Caryophyllen, Pinen.
- **Cannabinoide (5):** THC, CBD, CBG, CBN, THCV.

### Berechnung
- **Kosinus-Ähnlichkeit:** Mathematische Ähnlichkeit zwischen dem User-Präferenz-Vektor (aggregiert aus Bewertungen) und dem Strain-Vektor.
- **User-Vektor:** Gewichteter Durchschnitt basierend auf Ratings (5 Sterne = +0.1, 1 Stern = -0.05).
- **Status:** Algorithmus implementiert in `src/lib/algorithms/terpene-matching.ts`. API-Routes unter `/api/recommendations/`.

## 5. Ordnerstruktur

- `src/app/`: Next.js App Router (Pages & API Routes).
- `src/components/`: UI-Komponenten (shadcn/ui basierend).
- `src/lib/`: Utilities, Auth-Logik, Datenbank-Clients, Algorithmen.
- `supabase/`: SQL-Schema, Migrationen und Tests.
- `docs/`: Dokumentation und Spezifikationen (z.B. `superpowers/specs`).

## 6. Aktuelle Feature-Status & WIP

- **5-Tab Navigation:** Implementiert (Home, Social, Search, Collection, Profile).
- **Collection Page:** Zeigt Favoriten, Wishlist und User-Collection.
- **Social Feed:** Implementiert mit "For You" und "Following" Tabs.
- **Badge System:** Implementiert mit automatischer Freischaltung.
- **WIP:** Terpene-Matching UI Integration auf Strain-Detail-Seite und Feed.
- **Refactoring:** Migration von `auth.uid()` auf `requesting_user_id()` in allen RLS Policies.
- **Known Issues:** Fehlende Spalten `cbg`, `cbn`, `thcv` in der `strains` Tabelle (müssen via Migration ergänzt werden).

## 7. Entwicklung & Deployment

- **Lokale Entwicklung:** `npm run dev`
- **Setup:** `npm install`
- **Datenbank:** `supabase start`, `supabase db push`
- **Deployment:** Vercel (`vercel --prod`)
