# Strain Card Redesign — Design Spec

**Datum:** 2026-03-30
**Status:** Implementiert
**Ausgewähltes Design:** Option D — Minimal Badge Style

---

## Problem

Die alte StrainCard schnitt Text ab:
- `line-clamp-2` beim Strain-Namen → abgeschnitten
- `truncate` bei Taste/Effect → "Zitrus, Erdig" wurde zu "Zitrus"
- Das 4er-Grid war zu eng für längere Texte

---

## Card-Layout (von oben nach unten)

### 1. Header — Name + Farmer
- **Farmer** (klein, oben drüber) — `text-[8px]`, uppercase, letter-spacing 0.12em, color rgba foreground/30
- **Strain-Name** (groß, italic, uppercase) — `text-[14px]`, font-weight 900, line-height tight
- Farmer Prefix wird aus dem Strain-Namen entfernt (z.B. "420 Natural Gorilla Glue" mit Farmer "420" → "Natural Gorilla Glue")
- Kein `line-clamp` — Name darf in mehrere Zeilen umbrechen

### 2. Bild-Bereich
- Höhe: 200px (einzelne Card), ~150px (im 2er-Grid)
- `border-radius: 14px`, 10px Abstand links/rechts

**Badges auf dem Bild (nur 2):**

| Position | Badge | Style |
|---|---|---|
| oben links | Type (Sativa / Indica / Hybride) | thematische Farbe, `border-radius: 14px`, backdrop-blur |
| oben rechts | In Sammlung | cyan (#00F5FF), Punkt + Text, nur wenn `isCollected=true` |

- Kein THC-Badge auf dem Bild
- Kein Terpen-Badge auf dem Bild

### 3. Stats-Leiste — unten
```
THC          CBD           Taste          Effect
34%          <1%           Zitrus         Energie
```
- **4-Spalten-Grid** mit ausreichend Platz
- THC/CBD: mit Heading-Label (klein, uppercase)
- Taste/Effect: **nur Wert, kein Label** (Platz sparen)
- `break-words text-left w-full` für Taste/Effect — Text füllt Zeile 1 voll, bricht bei Bedarf in Zeile 2
- Taste: zeigt nur **1 Flavor** (nicht 2 mit Komma)
- Effect: zeigt **konsolidierte Kategorie** (alle ähnlichen Effects werden zu einer zusammengefasst)
- Deutsche Übersetzung für alle Effects und Flavors

---

## Effect-Konsolidierung (Kategorien)

Ähnliche Effects werden zu einer Kategorie zusammengefasst:

| Kategorie | Enthält |
|---|---|
| **Entspannung** | Schläfrig, Müde, Sedativ, Narkotisch, Couch-Lock, Körperlich, Schwer, Beruhigend, Schmerzlinderung, Appetitanregend, Hungrig |
| **Energie** | Energie, Energetic, Erhebend, Uplifted, Erfrischend, Weckend, Aktiviert, Erregt |
| **Fokus** | Fokus, Fokussiert, Konzentriert, Kopf, Cerebral |
| **Euphorie** | Euphorie, Euphorisch, Glücklich, Lachend, Kichernd, Entspannt, Stimmungshebend, Stimmungsaufheller, Gesprächig |
| **Kreativ** | Kreativ, Kreativität, Meditativ |
| **Ausgeglichen** | Angstlösend, Stressabbau |
| **Psychedelisch** | Psychedelisch, Spacig, Kopfreise, Spirituell, Introspektiv, Kribbelnd |
| **Medizinisch** | Medizinisch |

---

## Deutsche Übersetzungen

Alle gängigen englischen Effects und Flavors werden automatisch übersetzt:

- Energy → Energie, Focus → Fokus, Relax → Entspannung
- Citrus → Zitrus, Earthy → Erdig, Fruity → Fruchtig
- u.v.m.

---

## Änderungen gegenüber Bestand

| Vorher | Nachher |
|---|---|
| `line-clamp-2` beim Namen | Name darf umbrechen, `break-words` |
| `truncate` bei Taste/Effect | `break-words text-left w-full` — füllt Zeile voll |
| 2 Flavors mit Komma | Nur 1 Flavor |
| Alle Effects einzeln | Konsolidierte Kategorie |
| Type Badge: HYBRID (EN) | Hybride / Sativa / Indica (DE) |
| Keine deutschen Übersetzungen | Volle DE-Übersetzung für Effects/Flavors |
| Farmer Prefix im Namen | Prefix wird entfernt |

---

## Dateien

- `src/components/strains/strain-card.tsx` — Card-Layout
- `src/lib/display/formatters.ts` — Effect-Konsolidierung, deutsche Übersetzungen, Taste/Effect-Anzeige
