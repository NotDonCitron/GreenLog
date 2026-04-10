# Calendar Feature Design — Collection Timeline

**Datum:** 2026-04-10
**Status:** Draft
**Feature:** Kalender-Filter für gesammelte Strains auf der Collection-Seite

---

## 1. Konzept & Vision

Ein interaktiver Kalender auf der Collection-Seite, der die persönliche Sammel-History visualisiert. Der Kalender zeigt rote Dots an Tagen mit gesammelten Strains. Woche/Monat sind umschaltbar. Ein Tag-Klick filtert den Strain-Feed und ermöglicht simultanes Scroll-to zum ersten Eintrag dieses Tags.

---

## 2. Design Language

**Farben:**
- Primary Accent: `#2FF801` (GreenLog Green)
- Background: `#0a0a0a` (dark), `#1a1a1a` (cards)
- Text: `#ffffff`, `#888888`
- Dot-Color: `#FF6B35` (orange für gesammelte Strains)

**Typography:** Space Grotesk + Inter (bestehend)

**Spacing:** 8px Grid

**Motion:** 200ms ease-out transitions, hover:scale-1.02

---

## 3. Layout & Struktur

```
Collection Page (/collection)
├── Header: "Meine Sammlung" + Suchfeld + Filter-Button
├── Calendar Panel (einklappbar, default: collapsed)
│   ├── Toggle: Week / Month
│   ├── Navigation: ‹ April 2026 ›
│   └── Days Grid mit Activity-Dots
├── Filter Badges (wenn Filter aktiv)
└── Strain Grid (StrainCards)
```

**Kalender-Position:** Direkt unter dem Header, ausklappbar via Button "Kalender".
**Responsive:** Kalender passt sich an — am Smartphone kompakter.

---

## 4. Features & Interactions

### 4.1 Kalender-Ansicht (Woche/Monat Toggle)

- **Monat:** Klassische Monatsansicht mit Tag-Zellen
- **Woche:** 7-Tage-Grid, kompakter
- Navigation: Links/Rechts Pfeile für Monat/Woche
- Heute-Button zum Zurücksetzen

### 4.2 Activity Dots

- Roter Dot (`#FF6B35`) unter dem Datum wenn Strain gesammelt
- Mehrere Dots möglich (max. 3 sichtbar, dann "+N")
- Klick auf Tag selektiert ihn (grüner Ring um Tag)

### 4.3 Tag-Interaktion

1. **Erster Klick auf Tag:**
   - Kalender springt zu diesem Monat/Woche falls nötig
   - Feed filtert auf Strains mit `date_added` an diesem Tag
   - Grüner Selektierungsring um Tag

2. **Zweiter Klick auf selektierten Tag:**
   - Scrollt im Strain-Feed zum ersten Strain dieses Tags
   - Selektierung bleibt aktiv

3. **Klick auf anderen Tag:**
   - Neue Selektierung, Feed neu gefiltert

4. **Klick auf gleichen Tag nochmal:**
   - De-Selektiert, Feed zeigt alle Strains

### 4.4 Filter-Badges

Wenn ein Tag selektiert ist: Badge "📅 6 Einträge am 10.04" mit ✕ zum Löschen.

---

## 5. Datenmodell & Queries

### Quelle: `user_collection`

```sql
SELECT uc.date_added, s.id, s.name, s.image_url
FROM user_collection uc
JOIN strains s ON uc.strain_id = s.id
WHERE uc.user_id = :userId
ORDER BY uc.date_added DESC
```

### Activity Dots berechnen

```typescript
// Group by date (YYYY-MM-DD)
const activityByDate = collection
  .filter(item => item.date_added)
  .reduce((acc, item) => {
    const dateKey = format(new Date(item.date_added), 'yyyy-MM-dd');
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
```

---

## 6. Komponenten

### CalendarWidget
- Zeigt Monat oder Woche je nach State
- Navigation Buttons (‹ ›)
- Week/Month Toggle Button
- "Heute" Button
- Ruft `onDateSelect(date)` Callback auf

### CalendarDot
- Roter Punkt unter Tag-Nummer
- Zeigt Anzahl der Events (max 3 sichtbar)

### DateRangeFilter
- Zeigt aktuellen Filter-Status
- Clear-Button zum Zurücksetzen

### ActivityFeedItem (bestehend, StrainCard)
- Zeigt gesammelte Strains mit Timestamp
- Filterbar nach Datum

---

## 7. Technischer Ansatz

### Bestehende Infrastruktur
- `Calendar` Komponente: `src/components/ui/calendar.tsx` (react-day-picker)
- CollectionPage: `src/app/collection/CollectionPageClient.tsx`
- `useCollection` Hook: `src/hooks/useCollection.ts`

### Änderungen

1. **CalendarWidget erweitern:**
   - Mode-Prop (week/month)
   - onDateSelect Callback
   - Dots-Rendering über `modifiers`

2. **CollectionPageClient:**
   - State für `selectedDate: Date | null`
   - Gefilterte Strains basierend auf `selectedDate`
   - "Kalender" Toggle-Button im Header

3. **Kalender-Panel:**
   - Einklappbar mit Animation
   - Position: unter Header

### Keine neue API nötig
- Bestehende `useCollection` Hook liefert `date_added` pro Strain
- Filterung passiert client-seitig

---

## 8. Offene Fragen

- Sollen vergangene Monate lazy-loaded werden? (Performance bei 470+ Strains)
- Kalender default: collapsed oder expanded?

---

## 9. Nicht in Scope (Phase 1)

- Social Feed (Follow-Aktivitäten)
- Organization-Aktivitäten
- Andere Event-Typen (Ratings, Favorites, Notes)
- Grow-Timeline

Diese können als separate Phase implementiert werden.