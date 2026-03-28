# Strain Image Pipeline Design

## Status
Draft — in Brainstorming

## Problem

GreenLog zeigt bei manchen Strains Placeholder-Bilder oder unspezifische Stock-Fotos (LoremFlickr), die nicht als Cannabis-Buds erkennbar sind. Das sieht auf einer B2B-Plattform für Clubs und Apotheken unprofessionell aus.

### Aktueller Stand
- 470 Strains in DB
- 441 JPGs in `public/strains/` (LoremFlickr-Downloads — keine strain-spezifischen Bilder)
- 6 test/admin-Strains komplett ohne Bild
- Fallback-Kette: Leafly → LoremFlickr (LoremFlickr ist visuell nicht akzeptabel)
- Kein Qualitäts-Filter, kein Resume bei Abbruch

---

## Design

### 1. Architektur

**Storage:** Supabase Storage (`strains` Bucket) statt `public/strains/`
- Vorteil: CDN-Distribution, keine Git-Tracking, Zugriffskontrolle
- Access: Public für alle (read-only über public URL)

**Pipeline-Script:** `scripts/fetch-strain-images.mjs`
- Ablöse des bestehenden `scripts/download-missing-images.mjs`
- Resumable via Lock-Tracking in `scripts/.image-pipeline-lock.json`
- Bestehende Bilder werden nicht gelöscht (bleiben in `public/strains/` als Backup)

**DB-Feld:** `strains.image_url` wird zur Supabase-Storage-URL:
```
https://uwjyvvvykyueuxtdkscs.supabase.co/storage/v1/object/public/strains/{slug}.jpg
```

### 2. Image Source Strategy (Fallback-Kette)

| Priority | Source | URL-Pattern | Rate-Limit |
|----------|--------|-------------|------------|
| 1 | Leafly | `og:image` meta tag von `leafly.com/strains/{slug}` | 1 req / 2s |
| 2 | Wikileaf | `og:image` meta tag von `wikileaf.com/strains/{slug}` | 1 req / 1s |
| 3 | Picsum Photos | `picsum.photos/seed/{slug-hash}/600/800` | 1 req / 500ms |

**Slug-Mapping:** Bei 404 auf `{slug}` → Retry mit `slug` transformed via `name.toLowerCase().replace(/[^a-z0-9]+/g, '-')`

**LoremFlickr wird komplett entfernt** — liefert unpassende Stock-Fotos.

### 3. Pipeline-Ablauf

```
FÜR JEDEN Strain in DB:

  1. Prüfe .image-pipeline-lock.json:
     → Wenn slug already processed, skip

  2. Baue Leafly-URL:
     leafly.com/strains/{normalized-slug}
     Hole og:image via curl
     Rate-Limit: 2s warten zwischen requests

     Bei 404 → Retry mit alternate slug (name-based)

  3. Fallback → Wikileaf:
     wikileaf.com/strains/{normalized-slug}
     Hole og:image
     Rate-Limit: 1s warten

  4. Fallback → Picsum:
     picsum.photos/seed/{slug-hash}/600/800
     Immer funktioniert, konsistente neutrale Bilder

  5. Verify:
     - MIME-Type: image/jpeg oder image/png?
     - Dateigrösse: > 5KB?
     → Wenn fails → nächstes Fallback

  6. Upload zu Supabase Storage:
     Bucket: 'strains'
     Pfad: '{slug}.jpg'
     Content-Type: image/jpeg

  7. Update DB:
     UPDATE strains SET image_url = Storage-URL WHERE slug = {slug}

  8. Markiere in .image-pipeline-lock.json als processed
```

**Concurrency:** Max 1 Request gleichzeitig (strict rate-limiting)

**Resume-Fähigkeit:** Lock-File ermöglicht Resume bei Abbruch ohne Doppel-Arbeit.

### 4. Lock-File Format

`scripts/.image-pipeline-lock.json`:
```json
{
  "lastRun": "2026-03-28T12:00:00Z",
  "processed": ["slug-1", "slug-2"],
  "failed": [
    { "slug": "slug-3", "reason": "leafly_404 wikileaf_404 picsum_failed" }
  ]
}
```

### 5. Qualitätssicherung

- **MIME-Check:** Nur `image/jpeg`, `image/png`, `image/webp` akzeptiert
- **Grössen-Check:** Datei muss > 5KB sein
- **Picsum-Fallback ist bewusst "gut genug":** Neutrale Ästhetik, nicht cringe wie LoremFlickr
- **Rate-Limiting:** Feste Delays zwischen Requests schützen vor IP-Sperren (2s Leafly, 1s Wikileaf, 500ms Picsum)

### 6. Cron/Automation (Optional für später)

Pipeline kann als separater Cron-Job laufen:
```bash
# Täglich um 3 Uhr neue Strains scrapen
0 3 * * * cd /home/phhttps/Dokumente/Greenlog/GreenLog && node scripts/fetch-strain-images.mjs --new-only
```

Flag `--new-only`: Nur Strains ohne gültiges image_url oder mit placeholder-Referenz.

---

## Offene Fragen / Annahmen

1. **Supabase Storage Bucket `strains` muss existieren** — wird vor dem ersten Lauf angelegt
2. **Service Role Key** in `.env.local` ist vorhanden (ist der Fall)
3. **Leafly/Wikileaf crawling** ist für einmaligen Bulk-Download akzeptabel (nicht für tägliches Scraping)

---

## Nicht in Scope

- User-Upload-Flow (existiert bereits in `/strains/[slug]/page.tsx`)
- Migration der 441 bestehenden lokalen Bilder nach Supabase Storage (bleiben in `public/strains/` als lokaler Cache)
- Automatisches re-scraping bei Leafly-URL-Änderungen
