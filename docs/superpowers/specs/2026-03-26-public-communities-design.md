# Public Communities + Follower-System

## Overview

Communities werden öffentlich einsehbar. Jeder eingeloggte Nutzer kann einer Community folgen und den Feed sehen. Jeder Nutzer kann max. 1 Community gründen. Gründer und Admins können Strains erstellen, nur Gründer können Admins einladen.

## Roles & Permissions

| Rolle | Feed sehen | Strains erstellen | Admins einladen | Community verwalten |
|-------|-----------|-------------------|-----------------|---------------------|
| **Follower** | ✅ | ❌ | ❌ | ❌ |
| **Admin** | ✅ | ✅ | ❌ | ❌ |
| **Gründer** | ✅ | ✅ | ✅ | ✅ |

- Jeder Nutzer kann **max. 1 Community gründen**
- Gründer können nur von DB-Admin manuell wiederhergestellt werden (Notfall)
- Community-Typen (Club, Apotheke) bleiben wie bisher

## Data Model

### Neve Tabelle: `community_followers`

```sql
CREATE TABLE community_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
```

### Geändert: `organization_members`

Wird zur Admin-Tabelle (keine "member" Rolle mehr):

```sql
-- Rolle: 'gründer' | 'admin'
-- Keine 'member' Rolle
```

### Geändert: `organization_invites`

Nur noch für Admin-Einladungen:

```sql
-- role: 'admin' (immer)
-- created_by: gründer user_id
```

### Neue Tabelle: `community_feed`

```sql
CREATE TABLE community_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'strain_created', 'grow_logged', 'rating_added'
  reference_id UUID,        -- strain_id, grow_id, rating_id
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_community_feed_org_created ON community_feed(organization_id, created_at DESC);
```

## RLS Policies

### `community_followers`
- SELECT: alle authentifizierten User (_followers öffentlich für Feed-Anzeige)
- INSERT: jeder User kann sich selbst eintragen `auth.uid() = user_id`
- DELETE: nur User selbst oder Org-Gründer

### `strains` (Org-strains)
- SELECT: öffentlich (kein Filter auf Mitgliedschaft)
- INSERT: nur Admins und Gründer (`role IN ('admin', 'gründer')`)
- UPDATE/DELETE: nur Admins und Gründer

### `community_feed`
- SELECT: öffentlich
- INSERT: via DB-Trigger (automatisch)

### `organization_members`
- SELECT: alle (für Admin-Badge-Anzeige)
- INSERT: nur DB-Admin oder bei Community-Gründung (max 1 pro User prüfen)
- UPDATE/DELETE: nur Gründer

## Feed-Triggers

Automatische Feed-Einträge bei:

1. **Strain erstellt** (`strains` INSERT) → `event_type = 'strain_created'`
2. **Grow geloggt** (`grows` INSERT) → `event_type = 'grow_logged'`
3. **Rating hinzugefügt** (`ratings` INSERT) → `event_type = 'rating_added'`

## API Endpoints

### `GET /api/communities/[id]/feed`
- Query: `?page=1&limit=20`
- Return: Feed-Items mit User-Info, Event-Typ, Referenz

### `POST /api/communities/[id]/follow`
- Auth erforderlich
- Toggle: follow/unfollow

### `POST /api/communities/[id]/invite`
- Auth erforderlich
- Nur Gründer
- Body: `{ email }`

## UI Changes

### Community Page (`/community/[id]`)
- Public — kein Login nötig zum Sehen
- "Folgen" / "Entfolgen" Button für eingeloggte User
- Follower-Count anzeigen
- Feed chronologisch
- "Strain erstellen" Button nur für Admin/Gründer sichtbar

### Community erstellen (`/community/new`)
- Jeder eingeloggte User kann eine Community gründen
- Max 1 pro User — Button deaktivieren wenn bereits Gründer
- Automatisch Gründer-Rolle zugewiesen

### Community Settings
- Followers-Liste statt Members-Liste
- Admins einladen: nur für Gründer sichtbar
- Rollen: nur "admin" auswählbar (kein "member" mehr)

### Profile Page
- "Gründer einer Community" Badge wenn `organization_members.role = 'gründer'`

## Verification (Future)

Verifizierung ist ein separates Ticket. Für jetzt:
- `organizations.is_verified` BOOLEAN DEFAULT false
- Kein UI dafür — manuell in DB setzen

## One Community Per User

Prüfung in Application-Layer (nicht DB-Constraint da unterschiedliche Apps):
```sql
-- Bei Community-Gründung prüfen:
SELECT COUNT(*) FROM organization_members
WHERE user_id = auth.uid() AND role = 'gründer'
-- Wenn >= 1: Ablehnen
```

## Naming

- "Community" = Organization (beibehalten)
- "Folgen" = Follow (Instagram-Modell)
- "Gründer" = Founder (statt "Owner")
