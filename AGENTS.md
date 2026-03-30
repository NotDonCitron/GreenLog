# GreenLog – Agent Guidelines

## Bevor du startest

1. **Lies CLAUDE.md** – dort ist der komplette Projektkontext
2. **Prüfe MEMORY.md** (`~/.claude/projects/-home-phhttps-Dokumente-Greenlog/memory/`) für aktuelle Status-Updates
3. **Nutze Skills** wenn verfügbar:
   - `greenlog-supabase-rls` – bei RLS/Policy Problemen
   - `greenlog-strain-import` – beim Importieren von Strains
   - `greenlog-vercel-deploy` – bei Vercel Deployment/CSP Issues

## Architektur-Entscheidungen

### Pages Router (nicht App Router!)
Dieses Projekt nutzt **Next.js Pages Router** (`/src/app` mit `pages/`-Struktur unter `/src/app`).

### Supabase Realtime
- Realtime ist für **Notifications** geplant aber noch nicht aktiv
- **WebSocket vs Polling**: Aktuell Polling (`/api/notifications`), Realtime kommt mit Feature #1

### RLS Besonderheiten
- Helper `is_active_org_member()` nutzt `SECURITY DEFINER` um RLS-Recursion zu vermeiden
- Bei neuen Tables: RLS erst NACH dem Design aktivieren, nicht vorher

## DO:

- Folg dem Naming in CLAUDE.md
- Nutze `src/lib/types.ts` für alle Interfaces
- Nutze Badge-Criteria aus `src/lib/badges.ts` für Badge-Checks
- Fehlerbehandlung in API Routes konsistent: `try/catch` mit `NextResponse.json({ error: "..." }, { status: 500 })`
- Schreibe Tests für neue API Routes

## DON'T:

- **Keine Grow-Features** – sind pausiert (rechtliche Klärung ausstehend)
- Keine Annahmen über Server-Client-Kommunikation ohne `use client` Directive
- Keine hartcodierten URLs oder API-Keys – `.env.local` nutzen
- Vermeide `any` Typen – lieber explizite Interfaces aus `types.ts`

## Workflow für neue Features

1. Plan erstellen in `/docs/plans/[feature-name].md`
2. API Routes zuerst (mit Tests)
3. Frontend Components
4. Integration testen
5. Dokumentation in CLAUDE.md aktualisieren

## Bei Fragen

- DB Schema: `supabase-schema.sql`
- Types: `src/lib/types.ts`
- Badge System: `src/lib/badges.ts`
- Aktueller Stand: MEMORY.md in `/home/phhttps/.claude/projects/-home-phhttps-Dokumente-Greenlog/memory/`
