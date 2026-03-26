# APP-1048: Layout- und Kachel-Anpassungen in der eigenen Community-Ansicht

**Datum**: 2026-03-26
**Ticket**: APP-1048
**Status**: Genehmigt

---

## Ziel

Die Community-Detailseite (`/community/[id]`) wird für Admin/Gründer-Nutzer umgestaltet: neue Kacheln, Follow-Button neu positioniert, "Deine Community"-Label entfernt.

---

## Änderungen

### 1. Header neu strukturiert

**Bedingung**: `isAdminOrGründer === true`

- Das türkise Label "Deine Community" wird entfernt
- Der Follow-Button wird direkt unter dem Community-Namen platziert (statt in der rechten Aktionsleiste)
- Die bisherigen Icons (Plus, Settings) verschwinden aus dem Header

**Neue Header-Struktur**:
```
[← Zurück]
[Community Name]
[OrgTypeLabel]
[Follow Button]
```

### 2. Neue Kachel-Sektion

**Position**: Zwischen Stats und Activity Feed

**Drei Kacheln** (gleiches Design wie bestehende Kacheln):

| Kachel | Icon | Aktion |
|--------|------|--------|
| Strains hinzufügen | Plus (+) | Öffnet `CreateStrainModal` (bestehend) |
| Admin anlegen | Users (oder Shield) | Öffnet neues `InviteAdminModal` |
| Einstellungen | Settings | Navigation zu `/settings/organization` |

### 3. Neue Komponente: `InviteAdminModal`

**Zweck**: Admin-Einladung versenden

**UI**:
- Modal mit E-Mail-Feld
- Role-Dropdown (Vorschlag: "Admin")
- "Einladung senden" Button
- Feedback bei Erfolg/Fehler

**API**: Bestehender Endpoint `/api/communities/[id]/invite` (muss ggf. für Role=Admin erweitert werden)

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/app/community/[id]/page.tsx` | Header-Layout, Kachel-Sektion |
| `src/components/community/invite-admin-modal.tsx` | **Neu** |

---

## Akzeptanzkriterien

- [ ] "Deine Community"-Label wird in der eigenen Community nicht mehr angezeigt
- [ ] Follow-Button befindet sich nun direkt unter dem Community-Namen
- [ ] "Strains hinzufügen" wird als Kachel dargestellt
- [ ] Zwei neue Kacheln für "Admin anlegen" und "Einstellungen" existieren
- [ ] "Admin anlegen" öffnet das InviteAdminModal
- [ ] "Einstellungen" navigiert zu `/settings/organization`
