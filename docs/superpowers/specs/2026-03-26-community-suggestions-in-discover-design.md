# Design: Community-Vorschläge im "Entdecken"-Bereich

## Ziel
Im "Entdecken"-Bereich der Social-Seite (`/feed/page.tsx`) sollen neben User-Vorschlägen auch Community-Vorschläge angezeigt werden — in der gleichen horizontalen Instagram-Stories-Sektion.

## Bestehende Struktur

- `/feed/page.tsx` → Social/Activity-Seite
  - `SuggestedUsers` → horizontale Stories-Scroll mit User-Vorschlägen
  - `ActivityFeed` → Aktivitäten gefolgter User

## Komponenten-Änderung: `SuggestedUsers`

**Datei:** `src/components/social/suggested-users.tsx`

### Neuer Prop
```ts
showCommunities?: boolean  // default: false (backwards compatible)
```

### Datenfetching (Erweiterung)

1. **Users** (bestehend): Profiles die nicht der eigene User sind, nicht bereits gefolgt, nach gemeinsamen Strains sortiert.
2. **Communities** (neu):
   - Query: `organizations` mit `status = 'active'` und `id NOT IN (already joined orgs)`
   - Limit: 8
   - Sortierung: nach `name` alphabetisch

### Rendering

Beide (Users + Communities) werden in dieselbe horizontale Scroll-Sektion gemischt:
- Reihenfolge: erst Users, dann Communities
- Community-Karte im gleichen Stories-Stil:
  - Avatar-Kreis mit Building2-Icon und gradient ring
  - Name (truncated)
  - Typ-Label ("Club" / "Apotheke")
  - Plus-Button → Join

### Community Join Button

- Bei bereits beigetretenen Communities: Checkmark (✓)
- Bei nicht-beigetretenen: Plus (+)
- Click → `POST /api/community/{id}/join`

### Klick-Verhalten

- Klick auf Community-Karte → `/community/{id}` (Navigation zur Community-Detailseite)

## Neuer API-Endpoint

**Datei:** `src/app/api/community/[id]/join/route.ts`

```
POST /api/community/{id}/join
```

**Request:** Kein Body nötig (Auth-User aus Session)

**Response:**
```json
{ "success": true }
```
oder
```json
{ "error": "already_member" | "not_found" | "server_error" }
```

**Logik:**
1. Auth-User aus Session holen
2. Prüfen ob bereits Member in `organization_members`
3. Wenn nicht: Insert mit Rolle "member", Status "active"
4. Page reload nach Erfolg (wie bei Follow-Button)

## Datenbank

Keine Schema-Änderung nötig. `organization_members` existiert bereits.

## Komponenten-Änderung: Feed Page

**Datei:** `src/app/feed/page.tsx`

```tsx
<SuggestedUsers
  limit={8}
  showViewAll={true}
  showCommunities={true}  // NEU
/>
```

## Akzeptanzkriterien

- [x] Im Bereich "Entdecken" werden sowohl User- als auch Community-Vorschläge angezeigt
- [x] Community-Karten im gleichen Stories-Style wie User-Vorschläge
- [x] Klick auf Community-Karte navigiert zu `/community/{id}`
- [x] Plus-Button tritt Community bei (via neuer API-Endpoint)
- [x] Bereits beigetretene Communities zeigen Checkmark statt Plus
- [x] Bestehende User-Vorschläge funktionieren unverändert

## Aufwandsschätzung

- `SuggestedUsers`-Erweiterung: ~60 Zeilen Code
- Neuer API-Endpoint: ~40 Zeilen Code
- Feed-Page-Änderung: 1 Zeile
- **Total: ~100 Zeilen neue/modifizierte Codezeilen**
