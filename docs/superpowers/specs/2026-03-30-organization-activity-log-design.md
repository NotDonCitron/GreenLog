# Organization Activity Log – Design

## Status
Draft — nach Brainstorming genehmigt

## Ziel
Admins und Gründern einer Organization einen transparenten Audit-Trail bieten: Wer hat welche Strains hinzugefügt, wer wurde eingeladen, welche Rollen-Änderungen gab es.

---

## 1. Datenmodell

### Neue Tabelle: `organization_activities`

```sql
CREATE TABLE organization_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL wenn System-Aktion
  event_type TEXT NOT NULL,
  target_type TEXT,              -- 'strain', 'member', 'invite', 'role', 'organization'
  target_id UUID,
  target_name TEXT,               -- Denormalisiert für schnellen Zugriff
  metadata JSONB DEFAULT '{}',    -- Zusatzinfos: alte_rolle, neue_rolle, email, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Event Types

| event_type | target_type | Beschreibung |
|------------|-------------|--------------|
| `strain_added` | strain | Strain zur Org hinzugefügt |
| `strain_updated` | strain | Strain bearbeitet |
| `strain_removed` | strain | Strain aus Org entfernt |
| `member_joined` | member | Member beigetreten |
| `member_removed` | member | Member entfernt |
| `role_changed` | member | Rolle geändert (admin↔member) |
| `invite_sent` | invite | Einladung verschickt |
| `invite_accepted` | invite | Einladung angenommen |
| `invite_revoked` | invite | Einladung widerrufen |

### RLS Policies

```sql
ALTER TABLE organization_activities ENABLE ROW LEVEL SECURITY;

-- Admins und Gründer der Org sehen alles
CREATE POLICY "Org admins see activities"
  ON organization_activities FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_activities.organization_id
      AND user_id = auth.uid()
      AND role IN ('gründer', 'admin')
      AND membership_status = 'active'
    )
  );

-- System oder User erstellen Activities
CREATE POLICY "Members can create own activities"
  ON organization_activities FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() IS NOT NULL  -- System-Aktionen mit user_id = NULL
  );
```

### Indexe

```sql
CREATE INDEX idx_org_activities_org ON organization_activities(organization_id);
CREATE INDEX idx_org_activities_type ON organization_activities(event_type);
CREATE INDEX idx_org_activities_created ON organization_activities(created_at DESC);
```

---

## 2. API Routes

### GET `/api/organizations/[organizationId]/activities`

**Query Params:**
- `?limit=20&offset=0` — Pagination
- `?event_type=strain_added` — Filter auf Event-Type

**Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "event_type": "strain_added",
      "target_type": "strain",
      "target_id": "strain-uuid",
      "target_name": "Gorilla Glue #4",
      "user": { "id": "...", "username": "Maria", "avatar_url": "..." },
      "metadata": { "strain_type": "hybrid", "thc_max": 25 },
      "created_at": "2026-03-30T15:32:00Z"
    }
  ],
  "total": 42,
  "has_more": true
}
```

**Authorization:** Nur `gründer` oder `admin` der Organization.

---

## 3. Frontend

### Page: `/settings/organization/activities`

Neuer Menüpunkt unter Organization Settings (wie "Logo", "Name", "Admins").

**Layout:**
- Header mit "Aktivitäten" Title
- Chronologische Timeline (neueste zuerst)
- Event-Cards mit Icon, User-Avatar, Beschreibung, Timestamp
- Filter-Dropdown: Alle / Strains / Members / Einladungen
- Infinite Scroll oder "Mehr laden" Button

**Beispiel Event-Card:**
```
┌────────────────────────────────────────────────┐
│ 👤 Maria                          vor 2 Std.   │
│ Hat "Gorilla Glue #4" zur Organisation hinzugefügt
│                                          🌿    │
└────────────────────────────────────────────────┘
```

---

## 4. Trigger/Integration

Activities werden an zwei Stellen geschrieben:

### A) API Routes (primär)
Bei jedem API-Call der etwas ändert (Strain hinzufügen, Member einladen, etc.) wird gleichzeitig ein Activity-Record geschrieben.

**Beispiel: Strain erstellen in `/api/strains/route.ts`**
```typescript
// Nach erfolgreichem POST
await supabase.from('organization_activities').insert({
  organization_id: payload.organization_id,
  user_id: user.id,
  event_type: 'strain_added',
  target_type: 'strain',
  target_id: newStrain.id,
  target_name: newStrain.name,
  metadata: { type: payload.type, thc_max: payload.thc_max }
});
```

### B) DB Trigger (optional für额外 Safety)
Für zusätzliche Absicherung können DB-Trigger Activities schreiben, wenn API-Routes das nicht können.

---

## 5. Was NICHT implementiert wird (Scope)

- **Ratings-Analyse** — rechtlich unklar, bleibt raus
- **Export/CVS** — könnte später als separate Feature kommen
- **Real-time Updates** — später mit Supabase Realtime
- **Grows** — pausiert wegen rechtlicher Klärung

---

## 6. Implementation Reihenfolge

1. **DB Schema** – `organization_activities` Tabelle + RLS + Indexe
2. **API Route** – GET `/api/organizations/[orgId]/activities`
3. **Activity Write Helper** – Zentraler Helper für alle Activity-Inserts
4. **Trigger in bestehenden Routes** – Activities schreiben bei Strain/Member-Änderungen
5. **Frontend Page** – `/settings/organization/activities` mit Timeline-UI
6. **Tests** – API Route Tests
