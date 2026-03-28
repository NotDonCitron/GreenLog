# Strain Image Pipeline Design
## Multi-Quelle Authentische Bud-Fotos — Kosten: €0

## Status
Draft — nach Brainstorming

## Problem

GreenLog zeigt bei manchen Strains Placeholder-Bilder oder unspezifische Stock-Fotos. Das sieht auf einer B2B-Plattform für Clubs und Apotheken unprofessionell aus. Die alte Pipeline (Leafly → Wikileaf → Picsum) liefert wegen JS-Rendering und Anti-Bot-Schutz keine strain-spezifischen Bilder.

**Ziel**: Echte Cannabis Bud-Fotos von 470+ Strains, ohne neue Kosten.

---

## Design

### 1. Drei kostenlose Quellen (Prioritätsreihenfolge)

| Priority | Source | Type | Coverage | Quality | Cost |
|----------|--------|------|----------|---------|------|
| 1 | Seedbank Media Kits | Dutch Passion, RQS, Sensi Seeds | ~80-100 Strains (Original-Genetiken) | Studio ★★★★★ | €0 |
| 2 | Wikimedia Commons | Makro-Aufnahmen, CC BY-SA | Strain-spezifisch, variiert | Hoch ★★★★ | €0 |
| 3 | GitHub linhacanabica | 10GB CC0 Archiv | 470+ Strains | Mix ★★★ | €0 |

**Kritische Einschränkung**: linhacanabica enthält eine Mischung aus echten Bud-Fotos und generischen Stock-Bildern. Nur botanisch plausible Fotos werden behalten.

### 2. Pipeline-Ablauf

```
FÜR JEDEN Strain in DB (470 Strains):

  1. Seedbank Match?
     → Hole Seedbank Media Kit ZIPs (Dutch Passion, RQS, Sensi Seeds)
     → Prüfe ob Strain-Name im ZIP enthalten ist (case-insensitive)
     → Wenn ja → beste Resolution verwenden → √

  2. Falls kein Seedbank-Match → Wikimedia Match?
     → Suche "Cannabis {strain_name} bud" auf Wikimedia
     → Regex: /wp-content/uploads/.*\.(jpg|jpeg|png)/i
     → Visuell plausibel? → √

  3. Falls kein Wikimedia-Match → linhacanabica Fuzzy Match?
     → Strain-Name → Datei-Name Fuzzy Match (Levenshtein-Distance < 3)
     → Bild-Analyse: hat Bud-Form? hat Trichome-Textur?
     → Wenn botanisch plausibel → √

  4. Kein Match → LEER (kein Placeholder)
     → Strain-Seite zeigt Placeholder-SVG
     → Bild bleibt null

  5. Download & Upload zu Supabase Storage:
     → Lock-File: `scripts/.strain-image-lock.json`
     → Resume-fähig bei Abbruch
     → Rate-Limit: 1 req/s

  6. Update DB:
     → UPDATE strains SET image_url = '{supabase-storage-url}' WHERE slug = '{slug}'
```

### 3. Lock-File Format

`scripts/.strain-image-lock.json`:
```json
{
  "lastRun": "2026-03-28T12:00:00Z",
  "processed": ["ak-47", "og-kush"],
  "failed": [
    { "slug": "rare-strain-x", "reason": "no_match" }
  ],
  "seedbank_coverage": 87,
  "wikimedia_coverage": 124,
  "linhacanabica_coverage": 45,
  "unmatched": 214
}
```

### 4. Qualitätssicherung

**Seedbank Media Kits:**
- Direkter Download von .zip-Dateien der Züchter
- strain-name Matching via CSV-Mapping (Züchter-Name → Strain-Name)
- Original-Auflösung behalten

**Wikimedia Commons:**
- Regex-Filter: Nur Bud-Fotos, keine Illustrationen
- Ausschluss: `3D render`, `cartoon`, `icon`, `logo`, `seedling`
- Attribution-Pflicht: UI muss "Foto: {Autor}, CC BY-SA 4.0" unter dem Bild zeigen → **UI-Task: Attribution-Hinweis einbauen**

**linhacanabica:**
- Datei-Matching: Nur wenn Dateiname exakt oder fuzzy-match auf Strain-Name (Levenshtein < 5)
- Visuelle Plausibilitäts-Checks (semi-automatisch):
  - Bild ist > 200x200px
  - Aspect Ratio: 1:1 bis 4:3 (Bud-Form)
  - Keine Illustrationen/Screenshot/3D-Render
- Rest wird nicht heruntergeladen

### 5. Was GreenLog bekommt

| Coverage | Strains | Bildquelle |
|----------|---------|------------|
| ~100 Strains | Echte Studio-Fotos | Seedbank Media Kits |
| ~50-100 Strains | Echte Bud-Fotos | Wikimedia |
| ~50-100 Strains | Echte Bud-Fotos | linhacanabica (verifiziert) |
| ~170-270 Strains | leer (Placeholder-SVG) | — |

**Erwartetes Ergebnis**: 40-60% der 470 Strains mit echten, rechtssicheren Bud-Fotos.

### 6. Nicht in Scope

- KI-Placeholders (User will lückenhaft, nicht synthetisch)
- Community-Upload (Phase später, wenn kritische Masse erreicht)
- Leafly-Scraping (Anti-Bot zu aufwendig für 2026)
- Alte Pipeline-Scripts (`fetch-strain-images.mjs`, `lib/strain-scrapers.mjs`) bleiben unberührt aber inaktiv

---

## Offene Fragen / Annahmen

1. **Seedbank Media Kits** — Download-URLs müssen verifiziert werden (sind öffentlich auf den PR-Seiten)
2. **Wikimedia Attribution** — UI muss Quellenangabe unter jedem Wikimedia-Bild zeigen
3. **linhacanabica** — 10GB GitHub-LFS, nur relevante Dateien downloaden (nicht das ganze Repo)
4. **Supabase Storage** — Bucket `strains` existiert bereits (aus alter Pipeline)

---

## Implementierungsreihenfolge

1. Seedbank Media Kits scripten (einfachster Start, höchste Qualität)
2. Wikimedia scraper bauen
3. linhacanabica fuzzy-matcher integrieren
4. Lock-File + DB-Update
5. Qualitäts-Check / Review der heruntergeladenen Bilder
