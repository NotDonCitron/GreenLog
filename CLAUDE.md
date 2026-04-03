# GreenLog – Projekt-Kontext für Claude Code

## Projektübersicht

**GreenLog** ist eine B2B-mandantenfähige Plattform für Clubs und Apotheken zur Verwaltung von Cannabis-Sorten (Strains), Sammlungen und Organizationen (Communities).

- **Primäre Nutzer:** Clubs (CSCs), Apotheken, medizinische Cannabis-Patienten
- **Phase:** MVP abgeschlossen, Phase 2 (Social/Community) teilweise aktiv
- **Rechtsstatus:** Grows (Eigenanbau) vorerst auf Eis – bis rechtliche Klärung in Deutschland

---

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | Next.js 16 (Pages Router), TypeScript, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Styling | Custom CSS + shadcn/ui Komponenten, CSS Variables |
| Deployment | Vercel |
| OCR | Tesseract.js (lazy-loaded) |

---

## Architektur

```
/src
├── /app                    # Next.js Pages Router
│   ├── /api                # API Routes (Route Handlers)
│   │   ├── /badges         # Badge Check & Select
│   │   ├── /communities    # Community Management
│   │   ├── /follow-request # Follow Request Handling
│   │   ├── /notifications  # Polling-based Notifications
│   │   └── /organizations  # Organization CRUD + Members + Invites
│   ├── /(pages)            # Route Pages
│   └── /layout.tsx         # Root Layout
├── /components
│   ├── /ui                 # shadcn/ui Komponenten
│   ├── /social             # Social Features (FollowButton, ActivityFeed, etc.)
│   ├── /community          # Organization/Community Components
│   ├── /strains            # StrainCard, FilterPanel, etc.
│   └── /notifications      # NotificationBell, NotificationsPanel
└── /lib
    ├── /supabase           # Client (browser), Server, Admin clients
    ├── badges.ts            # Badge Definitions & Criteria
    ├── types.ts             # TypeScript Interfaces (zentral)
    └── strain-display.ts    # Formatting/Display Utilities
```

### Wichtige Dateien

| Pfad | Zweck |
|------|-------|
| `supabase-schema.sql` | Komplettes DB-Schema mit RLS Policies |
| `src/lib/types.ts` | Alle TypeScript Interfaces |
| `src/lib/badges.ts` | Badge-Definitionen + Criteria-Funktionen |
| `src/lib/supabase/client.ts` | Browser Supabase Client |
| `src/lib/supabase/server.ts` | Server-side Supabase Client |
| `src/components/auth-provider.tsx` | Auth Context + Memberships + Demo Mode |

---

## Datenmodell (Supabase)

### Kern-Tabellen

- **profiles** – User-Profile (erweitert Supabase Auth)
- **strains** – Strain-Datenbank (470+ Strains mit Bildern)
- **ratings** – 1-5 Sternen Bewertungen mit Reviews
- **user_strain_relations** – Favorites & Wishlist
- **user_collection** – Private Notes, Batch-Info, persönliche THC/CBD
- **grows / grow_entries** – Grow-Journal (AKTUELL PAUSIERT)

### Organization-Tabellen

- **organizations** – Clubs/Apotheken
- **organization_members** – Membership mit Rollen (gründer, admin, member, viewer)
- **organization_invites** – Invite-Tokens

### Social-Tabellen

- **follows** – User-Follows
- **follow_requests** – Für private Profile
- **user_activities** – Activity Feed Events

### Security

- RLS (Row Level Security) auf allen Tabellen
- `is_active_org_member()` SECURITY DEFINER Helper für recursion-freie Policy-Checks
- Profiles öffentlich, Organizations öffentlich, Grows optional privat

---

## Wichtige Konventionen

### API Routes

- **Pattern:** `/api/[resource]/[id]/[action]/route.ts`
- **Auth:** Immer `getUser()` vom Supabase Server Client checken
- **Response:** `{ data, error }` Pattern oder `NextResponse.json()`
- **Error Handling:** Konsistentes Format: `{ error: string, code?: string }`

### Supabase Client Nutzung

| Context | Client |
|---------|--------|
| Browser/Client Components | `@/lib/supabase/client` (singleton) |
| Server Components / API Routes | `@/lib/supabase/server` |
| Admin/Badge Jobs (service role) | `@/lib/supabase/server` mit `SUPABASE_SERVICE_ROLE_KEY` |

### Naming Conventions

- **Tabellen:** snake_case (`user_strain_relations`)
- **TypeScript Interfaces:** PascalCase (`UserStrainRelation`)
- **React Components:** PascalCase mit named export (`export const StrainCard`)
- **API Route Files:** route.ts (lowercase)

### Rollen (hardcoded strings)

```
gründer, admin, member, viewer
```

---

## Bekannte Issues & Technical Debt

### Offene Issues

1. ~~Vercel Production Layout kaputt~~ – ✅ VERIFIED: tw-animate wird in main branch NICHT importiert (nur in community-hub worktree). CSP-Problem existiert nur dort.
2. ~~Password Reset Flow~~ – ✅ IMPLEMENTIERT (`/update-password`, `forgot-password-dialog.tsx`)
3. ~~Real-time Notifications~~ – ✅ POLLING implementiert (30-Sekunden-Intervall in `notifications-panel.tsx`)

### Refactoring-Bedarf (Stand April 2026)

| Priorität | Thema | Status |
|-----------|-------|--------|
| P0 | API Error Handling standardisieren | ✅ DONE (jsonSuccess/jsonError helpers) |
| P0 | Composite Index auf `follows(follower_id, following_id)` | ✅ War bereits vorhanden |
| P1 | Badge-Check nur bei relevanten Events | ✅ War bereits korrekt (event-driven, nicht login) |
| P1 | Types ↔ Schema Strains-Konsistenz | ✅ DONE (Migration 20260401080000) |
| P2 | React Query / SWR für Data-Fetching | 🔲 Noch offen |
| P2 | PWA / App-Store readiness | 🔲 Noch offen |

### Strain Image Admin Override

**Feature:** App developers can replace global strain images when incorrect.

| Aspect | Detail |
|--------|--------|
| Auth | User ID in APP_ADMIN_IDS env variable |
| Endpoint | `PATCH /api/strains/[id]/image` |
| Storage | `strains-images` bucket (public read) |
| Max Size | 5MB |
| MIME Types | image/jpeg, image/png, image/webp, image/gif |

**Files:**
- `supabase/migrations/20260330150000_strain_image_admin.sql` - Storage bucket + RLS
- `src/app/api/strains/[id]/image/route.ts` - PATCH endpoint

**Setup:** Add user IDs to `APP_ADMIN_IDS` env variable (Vercel dashboard or .env.local). Find your User ID in: Supabase Dashboard > Authentication > Users > copy the UUID.

### Legal Documents

> **AGB:** Die AGB (`src/app/(legal)/agb/page.tsx`) haben echten Inhalt, aber minimale Struktur. Für Cannabis-B2B in Deutschland fehlen wichtige Sections (Widerrufsrecht, Zahlungsbedingungen). Vor Production-Launch sollte ein Anwalt die AGB prüfen und vervollständigen.

> **Impressum:** Muss vor Production von Hand ausgefüllt werden (Betreiber-Name, Adresse, § 55 RStV).

---

## Geplante Features (Phase 2)

### 1. Real-Time Collaboration Dashboard (Organizations)

**Bereits implementiert:**
- Activity Feed (`/settings/organization/activities`) mit Events: strain_added/updated/removed, member_joined/removed, role_changed, invite_sent/accepted/revoked
- API: `/api/organizations/[id]/activities` (polling-basiert)

**Noch offen:**
- Supabase Realtime Channel für echte Echtzeit-Updates (WebSocket)
- "Wer ist online" Member-List
- Live-Notification bei neuen Organization-Members

**API Routes (geplant):**
- `/api/organizations/[id]/realtime/connect` – WebSocket upgrade
- `/api/organizations/[id]/presence` – Online Status

### 2. Advanced Analytics Dashboard (Organizations)

**Bereits implementiert:**
- Analytics Page (`/settings/organization/analytics`)
- Top Strains mit Ratings, Favoriten-Zahl, Sorten-Typ
- Activity Heatmap (Tag × Stunde)
- CSV Export

**API Routes (implementiert):**
- `/api/organizations/[id]/analytics/strains` – Strain-Ranking
- `/api/organizations/[id]/analytics/activity` – Activity Heatmap Data
- `/api/organizations/[id]/analytics/export` – CSV Export

---

## Grows Feature – PAUSIERT

**Grows und Grow-Tracker sind vorerst raus** – rechtliche Klärung in Deutschland steht aus. Bis dahin:

- Keine neuen Grow-Features implementieren
- Bestehenden Grow-Code nicht erweitern
- Fokus auf Social/Community und Analytics

---

## Development

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
npm run dev              # Next.js Dev Server (funktioniert)
supabase db push         # Migrationen zu Supabase
vercel --prod            # Deployment (CSP-Probleme bekannt)
```

### Permissions (settings.local.json)

```
git, npm, supabase, vercel, gh, pnpm
```
