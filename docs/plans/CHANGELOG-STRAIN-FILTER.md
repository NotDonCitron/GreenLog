# GreenLog Strain Filter — Update-Zusammenfassung

## Was wurde eingebaut?

### Strain Filter Panel

Ein neues Filter-System auf den Seiten `/strains` und `/collection`, mit dem man Strains nach Effects, THC-Gehalt und CBD-Gehalt filtern kann.

**Filter-Button** am Ende der Filter-Chip-Leiste in der Header-Sektion.

**Filter-Panel** — Slide-out von rechts:
- **14 Effects-Filter** als Toggle-Buttons (Entspannt, Kreativ, Fokussiert, etc.)
- **THC Range** — dual-handle Slider (0–35%)
- **CBD Range** — dual-handle Slider (0–25%)
- Suchfeld zum Filtern der Effects-Liste
- "Filter anwenden" und "Zurücksetzen" Buttons

**Aktive Filter Badges** — über dem Strain-Grid:
- Zeigt aktive Filter als abnehmbare Badges
- THC/CBD als Cyan-Badge, Effects als Grün-Badge
- "Alle löschen" um alle Filter auf einmal zu entfernen

**URL-Persistenz** — Filter werden in URL-Parametern gespeichert:
```
/strains?effects=Relaxed,Happy&thc_min=15&thc_max=25
```
Damit können Filter geteilt werden.

## Neue Dateien

- `src/lib/constants.ts` — EFFECT_OPTIONS (Deutsch/Englisch Mapping), THC/CBD Ranges
- `src/components/strains/range-slider.tsx` — Dual-Handle Slider Component
- `src/components/strains/filter-panel.tsx` — Slide-out Filter Panel
- `src/components/strains/active-filter-badges.tsx` — Aktive Filter Badges

## Geänderte Dateien

- `src/app/strains/page.tsx` — Filter-Integration mit URL-Param Sync
- `src/app/collection/page.tsx` — Gleiche Filter-Integration

## Design-Entscheidungen

**Deutsch/Englisch Mapping:** Die Leafly-Scraper speichern Effects auf Englisch in der DB ("Relaxed", "Happy", "Focused"). Die Filter-Checkboxen zeigen deutsche Labels, aber URL und DB-Vergleich nutzen Englisch. So matcht alles korrekt.

**Dual-Handle Slider:** Zwei überlagerte Range-Inputs ermöglichen Min/Max-Selection. Visuelle Thumbs werden per CSS positioniert.

**Keine automatische Filter-Anwendung:** "Filter anwenden" muss geklickt werden, um Infinite-Loop-Probleme zu vermeiden und unnötige Rerenders zu verhindern.

## Fixes während der Implementation

- Infinite render loop durch `useCallback` für `onFiltersReady` gelöst
- DialogTitle für Screen-Reader-Accessibility hinzugefügt
- FilterParamReader in Suspense Boundary gewrappt (Next.js 16 Anforderung)
- Duplicate "Achievements" Section im Profil entfernt
