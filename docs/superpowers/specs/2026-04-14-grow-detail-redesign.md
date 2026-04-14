# Grow-Diary Detailseite — Redesign Spec

**Datum:** 2026-04-14
**Status:** Genehmigt — in Implementierung
**Lead:** Pascal

---

## Ziel

Die Grow-Detailseite (`/grows/[id]`) neu gestalten: Mobile-first, übersichtlich, sofort verständlich — auf einen Blick sieht man Grow-Status, Pflanzen-Phasen und letzte Aktivitäten.

---

## Design-Entscheidungen (genehmigt)

| Entscheidung | Wahl |
|-------------|------|
| Layout-Prinzip | Feed-First (Timeline als Hauptinhalt) + kompakter Summary-Header |
| Quick Actions | Sticky Action Bar — 4 wichtigste Log-Typen, scrollen mit |
| Entry-Interaktion | Inline-Expand auf Tap |
| Reminders | Kompakt — nur nächste 2-3, Rest eingeklappt |
| Keine Tabs | Mobile Nutzer scrollen, nicht tabben |

---

## Layout-Struktur (Mobile, 375px Basis)

```
┌─────────────────────────────────────┐
│ ← Grow Details                      │
│ "Gorilla Glue #4"                   │
├─────────────────────────────────────┤
│ ● AKTIV · 🌱 Keimung · Tag 5       │  ← GrowDetailHeader
├─────────────────────────────────────┤
│ [💧Gießen] [🌿Füttern] [📸Foto]   │  ← QuickActionBar (sticky)
│ [📝Notiz]                          │
├─────────────────────────────────────┤
│ 🌱 Plant 1   🌿 Plant 2   ➕        │  ← PlantCarousel (horiz. scroll)
├─────────────────────────────────────┤
│ ── Zeitstrahl ────────────────────  │
│ ● TAG 5 · 14.04            💧🌿    │  ← TimelineEntry (collapsed)
│   2.5L gegossen · pH 6.2           │
├─────────────────────────────────────┤
│ ● TAG 4 · 13.04              🏁    │  ← TimelineEntry (collapsed)
│   🏁 Keimung erreicht               │
├─────────────────────────────────────┤
│ 🔔 Erinnerungen                     │
│ 🔴 Gießen überfällig · vor 2h      │  ← ReminderPanel (compact)
│ 🟡 Nährstoffe · heute 18:00        │
├─────────────────────────────────────┤
│ [🏠]    [➕]    [🌿]    [👤]      │  ← BottomNav (vorhanden)
└─────────────────────────────────────┘
```

---

## Komponenten

### 1. `GrowDetailHeader`
Kompakter Header mit Grow-Zusammenfassung.

**Inhalt:**
- Status-Badge: `● AKTIV` (grün) / `● ABGESCHLOSSEN` (blau) / `● ARCHIVIERT` (grau)
- Strain-Name (gross, bold)
- Phase + Tag: `🌱 Keimung · Tag 5`
- Public/Private Indicator

**Visuell:**
- Gradient-Hintergrund oder subtle Glow
- Keine Edit-Buttons hier — Edit via Dreipunkt-Menü

### 2. `QuickActionBar`
Sticky Action Bar mit 4 wichtigsten Log-Typen.

**Inhalt:**
- 💧 Gießen
- 🌿 Füttern
- 📸 Foto
- 📝 Notiz
- [+ Mehr] → öffnet `LogEntryModal` mit allen 7 Typen

**Visuell:**
- Horizontale Icon-Buttons, gleichmässig verteilt
- Border `1px solid var(--border)`
- Hover: `border-[#2FF801]/50`
- `position: sticky; top: 0` (unter dem Header)

### 3. `PlantCarousel`
Horizontal scrollbare Pflanzen-Karten.

**Jede Karte zeigt:**
- Phase-Icon + Phase-Label
- Pflanzenname
- Tag-Nummer
- Status-Farbcodierung (active = bright, harvested/destroyed = muted)

**Visuell:**
- Horizontales Scrollen mit `overflow-x: auto`, `scroll-snap-type: x mandatory`
- Aktive Pflanzen = farbiger Border (`#2FF801` für Keimung, etc.)
- `+` Karte am Ende zum Pflanzen hinzufügen (nur Owner)

### 4. `TimelineSection`
Chronologische Timeline —Entries **nicht nach Typ gruppiert**.

**Struktur:**
- Vertical line mit Gradient (`#2FF801` → `var(--border)`)
- Day Markers: today = filled green circle, past = muted circle
- Day Cards: kompakte Info, auf Tap expandieren

**Entry-Typ Icons pro Tag:**
- 💧 Gießen
- 🌿 Füttern
- 📊 pH/EC
- 📏 Höhe
- 📷 Foto
- ☀️ DLI
- 🏁 Meilenstein

### 5. `TimelineEntry` (Inline-Expand)

**Collapsed State:**
```
┌─────────────────────────────────┐
│ TAG 5 · 14.04            💧🌿📷 │
│ 2.5L gegossen, BioBloom         │
└─────────────────────────────────┘
```

**Expanded State (auf Tap):**
```
┌─────────────────────────────────┐
│ TAG 5 · 14.04 · Heute    💧🌿📷│
│ 2.5L gegossen, BioBloom         │
├─────────────────────────────────┤
│ 💧 2.5L Wasser                  │
│ 🌿 BioBloom 5ml/L · EC 1.8     │
│ 📊 pH 6.2                       │
│ 🌡️ 22°C                        │
│ 📷 2 Fotos angehängt           │
│ ──────────────────────────────  │
│ "Pflanzen sehen gut aus, erste │
│ Blätter zeigen sich"            │
└─────────────────────────────────┘
```

**Visuell:**
- Expand mit smooth height transition (`transition-all duration-300`)
- Border-left farbig nach dominantem Entry-Typ
- Fotos als Thumbnail-Grid inside expanded view

### 6. `ReminderPanelCompact`
Kompakte Reminder-Ansicht.

**Inhalt:**
- Nur nächsten 3 Reminders (überfällige zuerst, dann nach Datum)
- Überfällig = rote Akzentfarbe
- Heute fällig = gelbe Akzentfarbe
- Rest = collapsed, "Alle anzeigen" Expander

**Actions:**
- Checkbox zum Erledigen
- Tap zum Editieren
- Swipe zum Löschen

### 7. `LogEntryModal`
Bestehendes Modal — keine Änderungen.

---

## Visuelles Design-System

| Token | Wert |
|-------|------|
| Accent (Neon-Grün) | `#2FF801` |
| Secondary Accent (Cyan) | `#00F5FF` |
| Background | `#0e0e0f` |
| Card | `#1a191b` |
| Border | `#333333` |
| Muted | `#888888` |

**Phase-Farben:**
| Phase | Farbe |
|-------|-------|
| Keimung | `#2FF801` (green) |
| Vegetation | `#00F5FF` (blue) |
| Blüte | `#A855F7` (purple) |
| Flush | `#EAB308` (yellow) |
| Ernte | `#F97316` (orange) |

**Typography:**
- Header: `font-display`, `italic`, `uppercase`, `tracking-tighter`
- Labels: `uppercase`, `tracking-wider`, `text-[10px]`, `font-black`
- Body: `text-sm`, `font-medium`

---

## Zustandsänderungen

### Loading State
- Skeleton-Placeholder für Header, Plants, Timeline
- Pulse-Animation in grün

### Empty State (keine Entries)
```
┌─────────────────────────────────┐
│         🌱                      │
│   Noch keine Einträge           │
│   Erste Pflanze angelegt?       │
│   Starte mit 💧 Gießen         │
└─────────────────────────────────┘
```

### Error State
- Roter Banner oben: "Fehler beim Laden"
- Retry-Button

---

## Komponenten-Aufspaltung (`page.tsx` → neue Dateien)

| Neue Datei | Enthält |
|------------|---------|
| `src/components/grows/grow-detail-header.tsx` | GrowDetailHeader |
| `src/components/grows/quick-action-bar.tsx` | QuickActionBar |
| `src/components/grows/plant-carousel.tsx` | PlantCarousel |
| `src/components/grows/timeline-entry.tsx` | TimelineEntry (expand logic) |
| `src/components/grows/reminder-panel-compact.tsx` | ReminderPanelCompact |

**Übrig bleibendes `page.tsx`:** Orchestriert die Komponenten, verwaltet State (grow, plants, entries, reminders), ruft API auf.

---

## Datenfluss

```
page.tsx (Server Client Fetch)
    │
    ├── fetchGrow(id) → setGrow
    ├── fetchPlants(growId) → setPlants
    ├── fetchEntries(growId) → setEntries
    ├── fetchMilestones(growId) → setMilestones
    └── fetchReminders(growId) → setReminders

User Action: Log Entry
    → LogEntryModal → POST /api/grows/log-entry
    → refetch entries → setEntries

User Action: Plant Status Update
    → handleUpdatePlantStatus → PATCH plants/:id
    → setPlants (lokales Update)
```

---

## Technische Constraints

- **Pages Router** — alle Components `'use client'`
- **Bestehende `GrowTimeline`** — wird überarbeitet, nicht ersetzt
- **`LogEntryModal`** — bleibt unverändert
- **`PhaseBadge`** — wird wiederverwendet
- **`ReminderPanel`** — wiederverwendet, als `ReminderPanelCompact` eingebettet
- **React 19 / Next.js 16** kompatibel
- **TanStack Query** bestehend — kein Wechsel

---

## Success Criteria

1. **At a Glance** — Grower sieht in < 2 Sekunden: Status, Pflanzen, letzte Aktion
2. **Self-Explanatory Entries** — Ein Timeline-Entry sagt sofort "was passiert ist" — nicht "Tag 5"
3. **One-Tap Logging** — 💧Gießen → Modal → gespeichert → zurück, in < 10 Sekunden
4. **Mobile Native Feel** — Horizontal Scroll für Plants, Inline Expand für Details
5. **No Layout Shift** — Skeleton während Load, keine Sprünge
6. **KCanG Compliance** — Max 3 aktive Pflanzen, Hard-Limit via DB-Trigger bleibt aktiv

---

## Offene Fragen (nach Implementierung klären)

- Kommentar-Sektion: Wird sie in die Timeline integriert oder bleibt sie separat?
- Follower/Public-Grow: Soll der Follow-Button in den Header?
- Harvest Certificate Link: Wo platzieren?
