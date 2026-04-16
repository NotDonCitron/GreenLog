# GreenLog Projektstand — April 2026

## Was ist GreenLog?
B2B-Mandantenfähige Plattform für Clubs (CSCs) und Apotheken zur Verwaltung von Cannabis-Strains, Collections und Organisationen.

**Live:** https://green-log-two.vercel.app

---

## Tech Stack
- **Frontend:** Next.js 16 (Pages Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (Postgres, Auth, Storage, RLS)
- **Deployment:** Vercel
- **CLI Tools:** supabase, vercel, gh, pnpm

---

## Datenmodell (Core Tables)

| Tabelle | Beschreibung |
|---------|-------------|
| `profiles` | User-Profile mit Usernames (id = TEXT, nicht UUID!) |
| `strains` | 470+ Strains mit Bildern, THC, CBD, Strain-Typ |
| `ratings` | User-Bewertungen (1-5 Sterne) |
| `user_strain_relations` | Favoriten/Gewachsen/Verkostet |
| `user_collection` | Private Collection |
| `organizations` | Clubs/Apotheken |
| `organization_members` | Rollen: gründer, admin, member, viewer |
| `organization_invites` | Einladungen |
| `follows` / `follow_requests` | Social Graph |
| `user_activities` | Activity Feed |
| `user_badges` | 26 Badges |
| `filter_presets` | Gespeicherte Filter |

> ⚠️ Wichtig: Alle user_id-Spalten sind TEXT (nicht UUID). Das ist Architekturentscheidung — kompatibel mit Clerk-Importen. Neue Supabase-User erhalten TEXT-IDs.

---

## Features (April 2026)

### ✅ Strain Management
- Strain-Katalog mit 470+ Einträgen
- Filter nach: Strain-Typ (Sativa/Indica/Hybrid), THC/CBD-Bereich, Aromen/Flavors
- Strain-Vergleich (`/compare`) mit Right-Click UX
- Rating-System (1-5 Sterne)
- Favoriten/Gesammelt/Gewachsen/Verkostet

### ✅ Collection System
- Private Collection pro User
- `useCollection` + `useCollectionIds` Hooks (React Query)
- Optimistic Updates
- Filter Presets (gespeicherte Filter-Konfigurationen)

### ✅ Social / Community
- Follow/Unfollow System
- Follow-Request-Modal
- Activity Feed ("Entdecken" Tab)
- Notifications Panel (30s Polling)
- Hydration-Fix für Community Page

### ✅ Badge System (26 Badges)
- **Collection:** Sample Seeker, Variety Pack, Top Rated, etc.
- **Social:** First Follow, Growth Community, etc.
- **Engagement:** Rate & Review, Flavor Explorer, etc.
- BadgeShowcase Modal mit Erklärungen

### ✅ Organization Management
- Rollen: gründer, admin, member, viewer
- Organization Invite System
- Member-Management (Admin only)
- ⚠️ Nächste Erweiterung: `praeventionsbeauftragter` Rolle (KCanG § 9 Compliance — B2B Differenziator!)

### ✅ Auth (April 15 — von Clerk auf Supabase migriert)
- Supabase Auth: email/password
- Kein Google OAuth
- `getUser()` für Server-seitige Auth
- Admin-Badge ("CannaLog Owner") für Hauptentwickler
- Alte Clerk-User verloren (andere User-ID-Format)

---

## Seiten / Routes

| Route | Beschreibung |
|-------|-------------|
| `/` | Home (Feed + Strain Carousel) |
| `/landing` | Marketing Landing Page (weißes Theme) |
| `/feed` | Activity Feed mit "Entdecken" Tab |
| `/compare` | Strain-Vergleich |
| `/strains` | Strain-Katalog mit Filtern |
| `/strains/[id]` | Strain-Detail |
| `/collection` | Private Collection |
| `/profile` | Eigenes Profil + Badges |
| `/user/[username]` | Öffentliches Profil |
| `/community` | Community Page |

---

## Grow-Tracker (PAUSIERT)

**Status: Pausiert** — rechtliche Klärung in Deutschland ausstehend

Letzte Arbeit (Anfang April):
- Grow Detail UI komplett neu (Phase 7)
- LogEntryModal mit defaultType Auto-Select
- QuickActionBar Fixes
- Timeline mit Erinnerungen
- 3-Pflanzen-Limit DB-Trigger bereits eingebaut (KCanG § 9)

**Nächster Schritt (geplant):** Feature Flag (`NEXT_PUBLIC_GROW_BETA_ENABLED`) für Beta-Tester — Code nicht verrotten lassen während der Pause.

---

## Letzte Änderungen (April 15 — Supabase Auth Migration)

### Was gemacht wurde
- Clerk komplett entfernt (Custom Domain nicht in Team-Besitz)
- Supabase Auth mit email/password implementiert
- `src/lib/supabase/client.ts`, `server.ts`, `admin.ts` neu strukturiert
- Server-seitige Auth mit `getUser()` von Supabase
- Debug-Logging in Grow Log-Entry APIs

### Was verloren ging
- Alte Clerk-User nicht mehr nutzbar (`user_3C7BE3DilaUeeUoWzFGidTvvQ0i`)
- Persönliche Collections/Ratings weg (andere User-IDs)

### Test-Account
- **Email:** pascal.hintermaier@gmail.com
- **Password:** 123456

---

## Offene Tasks

| Priority | Item | Status |
|----------|------|--------|
| P1 | Impressum finalisieren (Betreiber-Name, Adresse, § 55 RStV) | Offen — rechtlich kritisch! |
| P2 | React Query auf weitere Pages ausrollen | Partially done — `useCollection` existiert |
| P3 | Grow-Tracker Feature Flag für Beta-Tester | Geplant |
| P3 | `praeventionsbeauftragter` Rolle hinzufügen | Geplant — B2B Differenziator |

---

## Bekannte Issues
- **Supabase Auth Lock** — "lock was released because another request stole it" → Tab schließen, neu anmelden

---

## Datenbank
- **Project ID:** `uwjyvvvykyueuxtdkscs`
- **URL:** `https://uwjyvvvykyueuxtdkscs.supabase.co`
- **Schema:** `supabase-schema.sql` (vollständig mit RLS Policies, Indexes)
- **Migrations:** `supabase/migrations/`

---

## Nützliche Commands

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog

npm run dev              # Next.js Dev Server
npm run build            # Production Build
npm run lint             # ESLint Check

supabase db push         # Migrations nach Supabase
vercel --prod            # Deploy zu Vercel

gh pr create             # Pull Request erstellen
```

---

## Wichtige Korrekturen (April 2026)

### ⚠️ Kein UUID-Problem im Schema
Das Datenbank-Schema ist konsistent auf TEXT für alle user_id-Spalten ausgelegt. Das ist eine Architekturentscheidung, keine Inkonsistenz. Keine SQL-Migration für UUID nötig.

### ⚠️ Alte Clerk-User sind verwaist
Nach der Clerk → Supabase Auth Migration haben alte User (`user_3C7BE3DilaUeeUoWzFGidTvvQ0i`) eine andere ID-Struktur. Persönliche Collections/Ratings sind nicht mehr zugänglich.

### ✅ `praeventionsbeauftragter` Rolle als B2B-Differenziator
KCanG § 23 Abs. 4 fordert offiziell einen Präventionsbeauftragten für CSCs. Eine zusätzliche Rolle in `organization_members` wäre ein starkes Verkaufsargument für Clubs.

### ✅ Grow-Tracker mit Feature Flag erhalten
Statt den Grow-Code brachliegen zu lassen: Feature Flag `NEXT_PUBLIC_GROW_BETA_ENABLED` für Beta-Tester ermöglicht kontrollierte Weiterentwicklung während der rechtlichen Pause.

---

*Letztes Update: 16. April 2026*