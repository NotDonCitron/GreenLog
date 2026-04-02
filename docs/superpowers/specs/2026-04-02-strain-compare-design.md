# Strain Compare Feature – Design Spec

## Overview

Ermöglicht Usern 2–3 Strains nebeneinander zu vergleichen (THC, CBD, Effects, Flavors, Terpenes).

## Auswahl-Mechanik

**Ansatz: Compare-Button pro Strain-Karte**

- Auf jeder StrainCard erscheint ein kleiner ⚖️ Compare-Button (Tooltip: "Zum Vergleich hinzufügen")
- Beim Klick wird der Strain zur Compare-Liste hinzugefügt (State: `compareSlugs: string[]`, max 3)
- Bereits gewählte Strains zeigen einen aktiven State (grüner Hintergrund)
- Zweiter Klick auf bereits gewählten Strain = entfernen
- Ein "Compare (N)" Floating Button erscheint unten rechts wenn ≥2 Strains gewählt sind
- Klick auf "Compare" öffnet `/strains/compare?slugs=slug1,slug2,slug3`

**Kein Page-Refresh** bei Auswahl/Abwahl – rein clientseitiger State.

## Compare-Seite (`/strains/compare`)

**Route:** `/strains/compare`
**Auth:** Optional (keine Auth nötig, nur Strains anzeigen)
**Query-Param:** `slugs` – kommaseparierte Strain-Slugs (2–3 Stück)

### Layout

- Sticky Header mit "Vergleich" Titel + "← Zurück" Button
- **2–3 Spalten** nebeneinander (responsive: 1 Spalte mobil, 2 tablet, 3 desktop)
- Erste Zeile: Bild + Name + Farmer + Type-Badge
- Dann je Strain: THC-Balken, CBD-Balken, Effects-Tags, Flavors-Tags, Terpene-Tags
- Kein 3. Strain nötig → Placeholder-Spalte mit "+ Strain auswählen"
- Falls ungültige Slugs → nur valide Strains anzeigen, kein Error

### Daten-Fetching

Clientseitig via `useEffect` + Supabase:
```
supabase.from("strains").select("*").in("slug", slugs)
```

### Visuelle Details

- **THC-Balken:** grüner Balken (#2FF801), %-Zahl rechts, Hintergrund dark
- **CBD-Balken:** cyan Balken (#00F5FF), %-Zahl rechts
- **Effects:** dunkelgraue Tags, weiße Schrift
- **Flavors:** gleich wie Effects
- **Terpene:** grüne Outlined-Tags (border #2FF80140, text #2FF801)
- Farblicher Spalten-Border oben passend zum Strain-Type (indica/sativa/hybrid)
- Placeholder-Spalte: gestrichelte Border, "+ Strain auswählen" Text, Klick → `/strains`

### Komponenten

| Komponente | Pfad | Beschreibung |
|---|---|---|
| `compare-button.tsx` | `src/components/strains/compare-button.tsx` | Kleiner ⚖️ Button, fügt Strain zu Compare hinzu |
| `compare-floating-bar.tsx` | `src/components/strains/compare-floating-bar.tsx` | Fixed Bar unten rechts, zeigt gewählte Strains + Compare-Button |
| `strain-compare-grid.tsx` | `src/components/strains/strain-compare-grid.tsx` | Die 2–3 Spalten-Compare-Ansicht |
| `strain-compare-card.tsx` | `src/components/strains/strain-compare-card.tsx` | Einzelne Spalte für einen Strain |
| `compare-placeholder.tsx` | `src/components/strains/compare-placeholder.tsx` | Leerer Slot für 3. Strain |
| `page.tsx` | `src/app/strains/compare/page.tsx` | Route-Handler, lädt Strains, rendert Grid |

### State Management

- `compareSlugs` state im globalen Auth-Provider oder via URL-Param
- **Empfehlung:** URL-Param `?compare=slug1,slug2` – damit Link sharebar
- Bei Page-Refresh: Strains aus URL neu laden

### Edge Cases

- 0 Slugs → Redirect zu `/strains`
- 1 Slug → Redirect zu `/strains`
- 4+ Slugs → Nur erste 3 verwenden
- Strain nicht gefunden → Spalte auslassen, kein Error
- Strain ohne Bild → Placeholder-SVG anzeigen

## Implementation Steps

1. **API/Route:** Keine neue API nötig – clientseitig direkt Supabase
2. **Floating Bar:** Fester Button unten rechts auf `/strains`, nur wenn ≥2 gewählt
3. **Compare-Button:** Auf StrainCard, toggled Strain in/out
4. **Compare Page:** `/strains/compare` Route mit Grid-Layout
5. **URL-Sync:** State in URL-Param `?compare=...` schreiben
6. **Badges:** Keine Badge-Checks nötig (kein neues User-Engagement)

## Untested

- Responsive Layout (mobil 1 Spalte)
- Terpene-Balken optional (falls `percent` vorhanden)
