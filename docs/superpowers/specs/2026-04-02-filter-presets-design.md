# Saved Filter Presets – Design Spec

## Overview

Private benannte Filter-Presets für die Strains-Suche. User kann aktuelle Filter (Effects, THC, CBD) als Preset speichern, auflisten, anwenden und löschen.

---

## UX Flow

1. User öffnet Filter-Panel (via "Filter" Button auf `/strains`)
2. Stellt Effects / THC / CBD ein
3. Klickt auf "Preset-Leiste" → expandiert
4. Klickt "+ Aktuelles speichern" → gibt Namen ein → Preset gespeichert
5. Preset-Liste zeigt alle eigenen Presets
6. Klick auf Preset → URL + Filter werden sofort angewendet, Panel bleibt offen
7. Löschen via X-Button neben Preset

---

## Datenmodell

### Tabelle: `filter_presets`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | uuid | Primary Key |
| `user_id` | uuid | Owner (references profiles.id) |
| `name` | text | Anzeigename (max 50 chars) |
| `effects` | text[] | Array von Effect-Slugs |
| `thc_min` | numeric | THC Minimum |
| `thc_max` | numeric | THC Maximum |
| `cbd_min` | numeric | CBD Minimum |
| `cbd_max` | numeric | CBD Maximum |
| `created_at` | timestamptz | Created Timestamp |

**RLS:** Nur Owner kann eigene Presets lesen/schreiben/löschen.

---

## UI: FilterPanel Erweiterung

Im FilterPanel (`src/components/strains/filter-panel.tsx`):

```
┌─────────────────────────────┐
│  Filter              [X]     │
├─────────────────────────────┤
│  Effects: [Suche...]        │
│  [☑]Entspannend [☑]Euphor] │
│  ...                        │
├─────────────────────────────┤
│  THC: [======] 5-25%       │
│  CBD: [==] 0-5%            │
├─────────────────────────────┤
│  ▼ Gespeicherte Presets    │  ← Collapsible Header
│    [Mein Sativa] [X]       │
│    [Heavy Indica] [X]       │
│    [+ Aktuelles speichern]  │
├─────────────────────────────┤
│  [Filter anwenden]         │
│  [Zurücksetzen]            │
└─────────────────────────────┘
```

**Collapsible Preset-Leiste:**
- Default: collapsed (nur Header "Gespeicherte Presets" mit ▼)
- Expanded: Liste der Presets + "+ Speichern" Button
- Klick auf Preset-Name → wendet Filter an (URL + State)
- X-Button → löscht Preset (ohne Confirm, direkt)
- Wenn keine Presets: "Noch keine Presets" Text statt Liste

**"Aktuelles speichern" Button:**
- Öffnet inline Input + Save/Cancel
- Input für Preset-Name (max 50 Zeichen)
- Speichert current Filter-Werte (effects, thc_min/max, cbd_min/max)
- Button ist disabled wenn alle Filter auf Default stehen

---

## API Routes

### POST /api/filter-presets

Body: `{ name, effects, thc_min, thc_max, cbd_min, cbd_max }`

Erstellt neuen Preset für aktuellen User.

### GET /api/filter-presets

Liefert alle Presets des aktuellen Users (ohne Auth → 401).

### DELETE /api/filter-presets/[id]

Löscht Preset wenn Owner.

---

## Edge Cases

- **Kein User (Demo Mode):** Presets deaktiviert, Button nicht sichtbar
- **Leerer Name:** Validation Error, nicht speichern
- **Name > 50 Zeichen:** Abschneiden
- **Filter auf Default:** "Speichern" Button disabled
- **Löschen:** Kein Confirm, direkt DELETE

---

## Implementation Steps

1. **DB:** Migration für `filter_presets` Tabelle + RLS Policies
2. **API:** 3 Route Handler (POST, GET, DELETE)
3. **FilterPanel:** Collapsible Preset-Leiste + "+ Speichern" UI
4. **Apply on Click:** Preset → URL updaten + FilterPanel mit Werten füllen

---

## Files to Change

| File | Action |
|------|--------|
| `supabase/schema.sql` | Migration für filter_presets |
| `src/app/api/filter-presets/route.ts` | GET + POST |
| `src/app/api/filter-presets/[id]/route.ts` | DELETE |
| `src/components/strains/filter-panel.tsx` | Preset-Leiste einbauen |

## Untested

- Styling der Preset-Leiste (collapsed/expanded states)
- Input-Validation UX
- Demo Mode handling
