# Terpen-Matching Feature Design

**Datum:** 2026-04-11
**Status:** Design Phase
**Version:** 1.0

---

## 1. Overview

Ein Algorithmus-basiertes Empfehlungssystem, das die chemische Ähnlichkeit zwischen User-Präferenzen und Strain-Profilen berechnet. Das System positioniert sich als "Verbraucheraufklärung" (nicht als Werbung) und ist 100% KCanG-konform.

**Kernidee:** Je mehr ein User bewertet, desto präziser werden die Empfehlungen - ein dynamischer, lernender Algorithmus im Gegensatz zu statischen Strain-Verzeichnissen wie Leafly.

---

## 2. Compliance-Wording

### ❌ Verboten (AIDA-Modell §6 KCanG)
- "Für dich empfohlen"
- "87% Match für dich"
- "Perfekt für Dich"
- "Unsere Top-Empfehlung"

### ✅ Erlaubt (neutral, analytisch)
- "87% Profil-Übereinstimmung"
- "Chemische Ähnlichkeit zu deinen bewerteten Sorten"
- "Höchste Profil-Übereinstimmung (Algorithmus-basiert)"
- "Deine Top-Matches basierend auf Terpen-Profil"

**Prinzip:** Die UI muss wie ein nüchternes Labor-Tool wirken, nicht wie ein E-Commerce-Shop.

---

## 3. Chemischer Vektor (9 Dimensionen)

### Leit-Terpene (4)
| Terpen | Wirkung |
|--------|---------|
| Myrcen | Er entspannend, sedativ |
| Limonen | Zitrus, stresslösend |
| Caryophyllen | Pfeffer, entzündungshemmend |
| Pinen | Kiefer, alert |

### Cannabinoide (5)
| Cannabinoid | Wirkung |
|-------------|---------|
| THC | Psychoaktiv |
| CBD | Entspannend, nicht-psychoaktiv |
| CBG | Antibakteriell, entzündungshemmend |
| CBN | Sedativ |
| THCV | Appetitzügelnd, energetisch |

### Vektor-Aufbau pro Strain
```typescript
interface StrainVector {
  myrcen: number;      // 0.0 - 1.0 (normalisiert)
  limonen: number;
  caryophyllen: number;
  pinen: number;
  thc: number;
  cbd: number;
  cbg: number;
  cbn: number;
  thcv: number;
}
```

---

## 4. Algorithmus

### Kosinus-Ähnlichkeit

```
Match Score (U, V) = Σ(Ui × Vi) / (√ΣUi² × √ΣVi²)
```

| Variable | Bedeutung |
|----------|-----------|
| U | User-Präferenz-Vektor (aus Bewertungen berechnet) |
| V | Strain-Vektor (aus DB) |
| Ergebnis | 0.0 - 1.0 (umgerechnet in %) |

### User-Präferenz-Vektor berechnen (V1)

```
Für jede bewertete Sorte:
  5★ = +0.1 pro Terpen/Cannabinoid Gewichtung
  4★ = +0.05
  3★ = 0 (neutral)
  2★ = -0.025
  1★ = -0.05

  Favorit = +0.03 bonus

  Alle Werte über alle Bewertungen aggregieren (gewichtetes Mittel)
```

### Normalisierung

- Terpene: Prozentuale Werte aus DB direkt nutzen
- Cannabinoide: THC/CBD max = 30% als Referenz normalisieren
- Alle Werte auf 0.0 - 1.0 skalieren

---

## 5. Datenbasis (V1)

| Signal | Quelle | Gewichtung |
|--------|--------|------------|
| Sterne-Bewertung (1-5) | `ratings` Tabelle | Hoch |
| Favoriten | `user_strain_relations.is_favorite` | Mittel |
| Wishlist | `user_strain_relations.is_wishlist` | Niedrig |
| Terpen-Profil | `strains.terpenes` (Array) | Fix |
| Cannabinoid-Profil | `strains.thc_min/max`, `cbd_min/max`, `cbg`, `cbn`, `thcv` | Fix |

**Mindest-Bewertungen für Match:** 3 bewertete Sorten (sonst: "Nicht genug Daten")

---

## 6. Features

### Phase 1 (V1) - Quick Win

#### 6.1 Strain Detail Page
```
┌─────────────────────────────────────┐
│ 🍃 87% Profil-Übereinstimmung      │
│                                     │
│ Basierend auf deinen 23 Bewertungen│
│                                     │
│ [Terpen-Radar-Chart]                │
└─────────────────────────────────────┘
```

#### 6.2 "Deine Top-Matches" Section
Auf Feed Page oder neuer "/recommendations" Page:
```
┌─────────────────────────────────────┐
│ Deine Top-Matches (Algorithmus-basiert)│
│                                     │
│ [Strain Card]  [Strain Card]       │
│ [Strain Card]  [Strain Card]       │
└─────────────────────────────────────┘
```

#### 6.3 API Route
```
GET /api/recommendations/top?limit=5
→ { matches: [{ strain, score, based_on_ratings: number }] }

GET /api/recommendations/match?strain_id=xxx
→ { score: 87, based_on_ratings: 23 }
```

### Phase 2 (V2) - Optional

| Feature | Beschreibung |
|---------|--------------|
| Checkbox-Filter | "Geschmack/Wirkung entsprach meinen Präferenzen" um Qualitätsmängel (schlecht getrocknet) vom Terpen-Profil zu trennen |
| Filter-Optionen | Ausschluss von Terpenen die man NICHT mag |
| "Similar Strains" | Auf Detail Page: "Ähnliche Sorten" zu aktuell angezeigter |

---

## 7. Technische Umsetzung

### Neue/abzuändernde Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/types.ts` | `StrainVector` Interface hinzufügen |
| `src/lib/algorithms/terpene-matching.ts` | **NEU:** Kosinus-Ähnlichkeit + Profil-Berechnung |
| `src/app/api/recommendations/top/route.ts` | **NEU:** Top Matches API |
| `src/app/api/recommendations/match/route.ts` | **NEU:** Einzelner Match Score API |
| `src/components/strains/strain-detail.tsx` | Match-Score Anzeige hinzufügen |
| `src/app/feed/page.tsx` | "Deine Top-Matches" Section |

### Algorithmus-Module (neu)

```typescript
// src/lib/algorithms/terpene-matching.ts

export function calculateUserProfile(ratings: UserRating[]): StrainVector
export function cosineSimilarity(u: number[], v: number[]): number
export function calculateMatchScore(userProfile: StrainVector, strain: Strain): number
export function getTopMatches(userProfile: StrainVector, strains: Strain[], limit: number): Match[]
```

---

## 8. UI/UX Richtlinien

### Farbschema
- Match-Score Badge: neutral (grau/schwarz), nicht grün (sonst wirkt es wie "gut" = werblich)
- Keine Farben die Kaufimpulse auslösen könnten

### Layout
- Terpen-Radar-Chart bleibt wie aktuell ✅
- Match-Score dezent und klein anzeigen, nicht als Hero-Element
- "Algorithmus-basiert" als Subtext immer sichtbar

### Beispiele

| ❌ | ✅ |
|----|----|
| "Top-Empfehlung!" | "Höchste Profil-Übereinstimmung" |
| "Passt perfekt zu dir" | "87% chemische Ähnlichkeit" |
| "Von Usern geliebt" | "Du hast ähnliche Sorten bewertet" |

---

## 9. RLS & Security

- Match-API erfordert Auth (nur eingeloggte User)
- Keine neuen Tabellen nötig (berechneter Wert, nicht gespeichert)
- Rate-Limiting: 60 req/min pro User

---

## 10. Erfolgsmetriken

| Metrik | Ziel |
|--------|------|
| Match-Anzeigen auf Strain Detail | >50% der bewerteten Sorten |
| "Top-Matches" CTR | >20% |
| Durchschnittliche Bewertungen pro User | >10 nach 30 Tagen |
| Retention nach 7 Tagen | >40% |

---

## 11. Compliance-Dokument (für Behörden)

> **GreenLog Terpen-Matching Algorithmus - Technische Dokumentation**
>
> Das Matching-System berechnet die mathematische Ähnlichkeit zwischen dem chemischen Profil einer Sorte (Terpene und Cannabinoide) und den aggregierten Präferenzen eines Users basierend auf dessen expliziten Bewertungen.
>
> Das System verwendet ausschließlich neutrale, analytische Begriffe ("Profil-Übereinstimmung", "chemische Ähnlichkeit"). Es werden keine verkaufsfördernden oder emotionalisierenden Formulierungen verwendet.
>
> Die Berechnung basiert auf: Kosinus-Ähnlichkeit zwischen 9-dimensionalen Vektoren (4 Terpene + 5 Cannabinoide).

---

## 12. Offen / Backlog

| Item | Priorität |
|------|-----------|
| Checkbox "entsprach Präferenzen" | V2 |
| Filter für Terpene die man nicht mag | V2 |
| Similar Strains auf Detail Page | V2 |
| Match-Score auch für User ohne Bewertungen (Popularität) | V2 |

---

## 13. Geschätzter Aufwand

| Task | Aufwand |
|------|---------|
| Algorithmus-Library (`terpene-matching.ts`) | 2-4h |
| API Routes (top + match) | 2h |
| UI: Match-Score auf Strain Detail | 1h |
| UI: Top-Matches Section | 2h |
| Testing | 2h |
| **Total V1** | **~1 Tag** |
