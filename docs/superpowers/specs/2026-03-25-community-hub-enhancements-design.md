# Community Hub Verbesserungen — Design

> **Datum:** 2026-03-25
> **Status:** Draft

## Ziel

Das Community Hub (/community) von einer reinen Navigations-Seite zu einem echten Informations-Hub erweitern. Mit Stats, Quick Actions und org-relevantem Activity Feed.

---

## A) Stats auf der Org-Info Card

**Wo:** Bestehende Org-Info Card (ganz oben auf `/community`)

**Erweiterung der Card:**

| Feld | Quelle | Anmerkung |
|------|--------|-----------|
| Member-Count | `organization_members` WHERE `organization_id = ?` + `membership_status = 'active'` | Zahl mit `👥` Icon |
| Strain-Count | `strains` WHERE `organization_id = ?` | Zahl mit `🌿` Icon |
| Neueste Sorte | `strains` WHERE `organization_id = ?` ORDER BY `created_at` DESC LIMIT 1 | Name der Sorte, grüner Text |

**Layout:**

```
┌──────────────────────────────────────────────┐
│ [🏢 Icon]  Org-Name              [+ ] [✉️ ] │  ← Quick Actions (Admin)
│           Club • 👥 12  🌿 8                 │  ← Stats
│           Neueste: Gorilla Glue #4           │  ← Neueste Sorte
│           [👑 Admin]                         │  ← Admin Badge
└──────────────────────────────────────────────┘
```

- Member-Count und Strain-Count nebeneinander mit Icon
- Neueste Sorte als eigener Text-Link unter dem Namen
- Admin-Badge bleibt wie bisher

---

## B) Quick Actions (Admin-Only)

**Wo:** Oben rechts auf der Org-Info Card, als Icon-Buttons

**Buttons:**

| Icon | Aktion | URL |
|------|--------|-----|
| `+` (Plus) | Eigene Sorte erstellen | `/settings/organization/strains` |
| `✉️` (Mail) | Einladung senden | `/settings/organization/invites` |

**Details:**
- Buttons nur sichtbar für `owner` und `admin` Rollen
- Kleine Icon-Buttons (32x32), farblich passend (Plus = grün, Einladung = lila/cyan)
- Hover: leichte Skalierung

---

## C) Activity Feed — Org-Strains Aktivitäten

**Wo:** Zwischen Org-Info Card und Navigation Cards

**Datenquelle:** `user_activities` + `strains` + `profiles`

**Gefilterte Typen:**
- `strain_created` — neuer eigener Strain der Organisation
- `strain_rated` — Bewertung auf einem Strain der Organisation

**Query:**
```sql
SELECT
  ua.id,
  ua.activity_type,
  ua.created_at,
  ua.strain_id,
  ua.user_id,
  p.display_name,
  p.username,
  s.name AS strain_name,
  r.rating
FROM user_activities ua
JOIN profiles p ON p.id = ua.user_id
JOIN strains s ON s.id = ua.strain_id
WHERE s.organization_id = :orgId
  AND ua.activity_type IN ('strain_created', 'strain_rated')
ORDER BY ua.created_at DESC
LIMIT 5
```

**UI — Ein Activity Item:**

```
┌──────────────────────────────────────────────────┐
│ 🌿 [Display Name] hat "Strain Name" bewertet     │
│    ★★★★☆  •  vor 2 Stunden                      │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ 🌿 [Display Name] hat "Strain Name" erstellt     │
│    +Neue Sorte  •  gestern                      │
└──────────────────────────────────────────────────┘
```

**Struktur:**
- Max 5 Items, absteigend nach Zeit
- Relative Zeitangabe ("vor 2 Std", "gestern", "vor 3 Tagen")
- Kein explizites "org-strain" Label — implizit durch Kontext
- Falls keine Aktivitäten: kurze Empty-State Nachricht ("Noch keine Strain-Aktivitäten")

---

## Komponenten

| Komponente | Datei | Bemerkung |
|------------|-------|-----------|
| `CommunityPage` | `src/app/community/page.tsx` | Hauptrace, holt alle Daten |
| `OrgInfoCard` | `src/components/community/org-info-card.tsx` | Extrahiert aus Page |
| `ActivityFeed` | `src/components/community/activity-feed.tsx` | Neukomponente |
| `ActivityItem` | `src/components/community/activity-item.tsx` | Einzelnes Item |

---

## Datenfluss

```
CommunityPage (Server Component)
  ├─ useAuth() → activeOrganization
  ├─ fetch: memberCount, strainCount, newestStrain
  ├─ fetch: activityFeed (5 items)
  └─ render:
      ├─ OrgInfoCard (stats + quick actions)
      ├─ ActivityFeed (org-strain activities)
      └─ NavigationCards (bestehend)
```

---

## API Endpoints

### `GET /api/organizations/[orgId]/stats`
Neuer Endpunkt für Community Hub Stats.

**Response:**
```json
{
  "memberCount": 12,
  "strainCount": 8,
  "newestStrain": { "id": "uuid", "name": "Gorilla Glue #4" }
}
```

### `GET /api/organizations/[orgId]/activities`
Neuer Endpunkt für org-relevante Activity Feed Items.

**Query params:** `?limit=5`

**Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "type": "strain_rated",
      "user": { "displayName": "Pascal", "username": "pascal123" },
      "strain": { "id": "uuid", "name": "Gorilla Glue #4" },
      "rating": 4,
      "createdAt": "2026-03-25T10:00:00Z"
    }
  ]
}
```

---

## Offene Fragen

- [ ] Soll der Feed automatisch refreshed werden (Polling) oder nur beim Laden?
- [ ] Sollen Ratings einen Link zum Strain haben?

---

## Nicht in diesem Design

- Member-spezifische Aktivitäten (wer beitritt, Rollenänderungen) — NICHT in diesem Sprint
- Sorten-Feed (chronologische Strains-Liste) — separate Feature
