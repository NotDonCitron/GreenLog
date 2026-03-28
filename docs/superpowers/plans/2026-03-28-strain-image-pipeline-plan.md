# Strain Image Multi-Source Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a €0 multi-source image pipeline that finds real Cannabis bud photos for 470+ strains from Seedbank Media Kits → Wikimedia Commons → linhacanabica CC0, with quality filtering.

**Architecture:** Three-stage fallback pipeline. Each strain is checked against sources in priority order. Only botanically plausible bud photos are accepted. Resume-capable via lock-file. Attribution metadata stored for Wikimedia images.

**Tech Stack:** Node.js ESM scripts, curl (CLI), Supabase Storage + Postgres, Wikimedia Commons API

---

## File Map

### New Files
- `scripts/lib/seedbank-scraper.mjs` — Download and match Seedbank Media Kit images
- `scripts/lib/wikimedia-scraper.mjs` — Search Wikimedia Commons, extract bud photos with attribution
- `scripts/lib/linhacanabica-fetcher.mjs` — Fetch from GitHub CC0 archive with fuzzy name matching
- `scripts/fetch-authentic-strain-images.mjs` — Main pipeline orchestrator
- `scripts/lib/attribution-store.mjs` — Store/retrieve image attribution metadata

### Existing Files (reused)
- `scripts/lib/lock-file.mjs` — Lock file utilities (existing, works as-is)
- `scripts/lib/upload-to-storage.mjs` — Supabase Storage upload (existing)

### Modified Files
- `src/app/strains/[slug]/page.tsx` — Add Wikimedia attribution text below bud images
- `src/types/index.ts` — Add `image_attribution` field to strain type

---

## Task 1: Seedbank Media Kit Scraper

**Files:**
- Create: `scripts/lib/seedbank-scraper.mjs`
- Test: `scripts/test-seedbank-scraper.mjs` (manual)

- [ ] **Step 1: Write seedbank-scraper.mjs**

```javascript
// scripts/lib/seedbank-scraper.mjs
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import { createHash } from 'crypto';

/**
 * Fetches a seedbank page and extracts image URLs matching a strain name.
 * Uses curl with browser UA.
 * @param {string} sourceUrl - URL to fetch (seedbank media/pr page)
 * @param {string} strainName - Strain name to search for
 * @returns {Promise<Array<{url: string, author: string, license: string}>>}
 */
export async function findSeedbankImages(sourceUrl, strainName) {
  const html = execFileSync('curl', [
    '-s', '-L', '-A',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    sourceUrl
  ], { encoding: 'utf-8', timeout: 15000 });

  const normalizedName = strainName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const imgRegex = /https?:\/\/[^\s"']+\.(?:jpg|jpeg|png)(?:\?[^\s"']*)?/gi;
  const urls = html.match(imgRegex) || [];

  return urls
    .filter(url => {
      const lower = url.toLowerCase();
      return lower.includes(strainName.toLowerCase()) || lower.includes(normalizedName);
    })
    .map(url => ({ url, author: 'Seedbank', license: 'promotional_use' }));
}

/**
 * Downloads a seedbank image to a temp file.
 * @param {string} imageUrl
 * @returns {Promise<string|null>} Local temp file path or null on failure
 */
export async function downloadSeedbankImage(imageUrl) {
  const tmpDir = os.tmpdir();
  const hash = createHash('md5').update(imageUrl).digest('hex');
  const tmpPath = path.join(tmpDir, `seedbank-${hash}.jpg`);

  try {
    execFileSync('curl', ['-s', '-L', '-o', tmpPath, imageUrl], { timeout: 15000 });
    const stats = fs.statSync(tmpPath);
    if (stats.size > 5000) return tmpPath;
    fs.unlinkSync(tmpPath);
  } catch {}
  return null;
}
```

- [ ] **Step 2: Test seedbank scraper for one strain**

Run: `node -e "import('./scripts/lib/seedbank-scraper.mjs').then(m => m.findSeedbankImages('https://www.dutch-passion.com/media/', 'White Widow').then(console.log))"`
Expected: Array of image URLs or empty array

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/seedbank-scraper.mjs
git commit -m "feat: add seedbank media kit scraper"
```

---

## Task 2: Wikimedia Commons Scraper

**Files:**
- Create: `scripts/lib/wikimedia-scraper.mjs`
- Test: `scripts/test-wikimedia-scraper.mjs` (manual)

- [ ] **Step 1: Write wikimedia-scraper.mjs**

```javascript
// scripts/lib/wikimedia-scraper.mjs
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import { createHash } from 'crypto';

/**
 * Searches Wikimedia Commons for cannabis bud photos of a strain.
 * Uses the Wikimedia Commons API (no auth required).
 * @param {string} strainName - e.g. "OG Kush"
 * @returns {Promise<Array<{url: string, author: string, license: string, pageUrl: string}>>}
 */
export async function findWikimediaImages(strainName) {
  const apiUrl = 'https://commons.wikimedia.org/w/api.php?' +
    'action=query&list=search&srsearch=' + encodeURIComponent(strainName + ' cannabis bud') +
    '&srnamespace=6&format=json&origin=*&srlimit=10';

  const json = execFileSync('curl', [
    '-s', '-A', 'GreenLog/1.0',
    apiUrl
  ], { encoding: 'utf-8', timeout: 10000 });

  const data = JSON.parse(json);
  const results = data.query?.search || [];

  const images = [];
  for (const result of results) {
    const title = result.title.toLowerCase();
    // Skip non-bud keywords
    if (title.includes('3d') || title.includes('render') ||
        title.includes('cartoon') || title.includes('icon') ||
        title.includes('logo') || title.includes('seedling')) continue;

    const infoUrl = 'https://commons.wikimedia.org/w/api.php?' +
      'action=query&titles=' + encodeURIComponent(result.title) +
      '&prop=imageinfo&iiprop=url|extmeta' +
      '&iiextmetadata=Artist|LicenseShortName&format=json&origin=*';

    try {
      const infoJson = execFileSync('curl', ['-s', '-A', 'GreenLog/1.0', infoUrl], { encoding: 'utf-8', timeout: 10000 });
      const infoData = JSON.parse(infoJson);
      const pages = infoData.query?.pages || {};
      const page = Object.values(pages)[0];
      const imgInfo = page?.imageinfo?.[0];

      if (imgInfo?.thumburl || imgInfo?.url) {
        const author = (imgInfo.extmeta?.Artist?.value || 'Unknown')
          .replace(/<[^>]+>/g, '').trim();
        const license = imgInfo.extmeta?.LicenseShortName?.value || 'CC BY-SA';
        images.push({
          url: imgInfo.thumburl || imgInfo.url,
          author,
          license,
          pageUrl: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(result.title),
        });
      }
    } catch {}
  }
  return images;
}

/**
 * Downloads a Wikimedia image to a temp file.
 * @param {string} imageUrl
 * @returns {Promise<string|null>} Local temp file path or null
 */
export async function downloadWikimediaImage(imageUrl) {
  const tmpDir = os.tmpdir();
  const hash = createHash('md5').update(imageUrl).digest('hex');
  const tmpPath = path.join(tmpDir, `wikimedia-${hash}.jpg`);

  try {
    execFileSync('curl', ['-s', '-L', '-o', tmpPath, imageUrl], { timeout: 15000 });
    const stats = fs.statSync(tmpPath);
    if (stats.size > 5000) return tmpPath;
    fs.unlinkSync(tmpPath);
  } catch {}
  return null;
}
```

- [ ] **Step 2: Test wikimedia scraper for one strain**

Run: `node -e "import('./scripts/lib/wikimedia-scraper.mjs').then(m => m.findWikimediaImages('OG Kush').then(r => { console.log(r.length + ' images found'); if(r[0]) console.log(r[0].url, r[0].author, r[0].license); }))"`
Expected: Array with author and license info

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/wikimedia-scraper.mjs
git commit -m "feat: add wikimedia commons scraper with attribution extraction"
```

---

## Task 3: Attribution Store Utility

**Files:**
- Create: `scripts/lib/attribution-store.mjs`
- Modify: `supabase-schema.sql` (add column)

- [ ] **Step 1: Write attribution-store.mjs**

```javascript
// scripts/lib/attribution-store.mjs
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const fs = require('fs');

const ATTR_FILE = join(process.cwd(), 'scripts/.image-attributions.json');

const DEFAULT_DATA = {};

export function readAttributions() {
  try {
    return JSON.parse(fs.readFileSync(ATTR_FILE, 'utf-8'));
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function writeAttributions(data) {
  fs.writeFileSync(ATTR_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function saveAttribution(slug, attribution) {
  const data = readAttributions();
  data[slug] = attribution;
  writeAttributions(data);
}

export function getAttribution(slug) {
  return readAttributions()[slug] || null;
}
```

- [ ] **Step 2: Add attribution column to schema**

In `supabase-schema.sql`, find the strains table and add:
```sql
-- Add after image_url field:
image_attribution JSONB DEFAULT '{"source": "none"}',
```

Then run in Supabase SQL Editor:
```sql
ALTER TABLE strains ADD COLUMN IF NOT EXISTS image_attribution JSONB DEFAULT '{"source": "none"}';
```

- [ ] **Step 3: Test attribution store**

Run: `node -e "import('./scripts/lib/attribution-store.mjs').then(m => { m.saveAttribution('og-kush', {source:'wikimedia',author:'Test',license:'CC BY-SA'}); console.log(m.getAttribution('og-kush')); })"`
Expected: `{ source: 'wikimedia', author: 'Test', license: 'CC BY-SA' }`

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/attribution-store.mjs supabase-schema.sql
git commit -m "feat: add attribution store for image sources"
```

---

## Task 4: linhacanabica Fetcher

**Files:**
- Create: `scripts/lib/linhacanabica-fetcher.mjs`
- Test: `scripts/test-linhacanabica-fetcher.mjs` (manual)

Note: linhacanabica is a 10GB GitHub repo with CC0 images. We search file names via GitHub API rather than cloning the whole repo.

- [ ] **Step 1: Write linhacanabica-fetcher.mjs**

```javascript
// scripts/lib/linhacanabica-fetcher.mjs
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';

/**
 * Searches linhacanabica GitHub repo for matching strain images.
 * Uses GitHub search API (code search on filenames).
 * Repo: https://github.com/linhacanabica/images-strains-weed
 * @param {string} strainName
 * @returns {Promise<{url: string, filename: string}|null>}
 */
export async function findLinhacanabicaImage(strainName) {
  const searchUrl = 'https://api.github.com/search/code' +
    '?q=' + encodeURIComponent(strainName + ' repo:linhacanabica/images-strains-weed') +
    '&per_page=5&type=code';

  try {
    const json = execFileSync('curl', [
      '-s', '-A', 'GreenLog/1.0',
      '-H', 'Accept: application/vnd.github.v3+json',
      searchUrl
    ], { encoding: 'utf-8', timeout: 10000 });

    const data = JSON.parse(json);
    const items = (data.items || []).filter(item =>
      /\.(?:jpg|jpeg|png)$/i.test(item.name)
    );

    if (items.length === 0) return null;

    const firstMatch = items[0];
    // Convert github.com URL to raw.githubusercontent.com URL
    const rawUrl = firstMatch.html_url
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');

    return { url: rawUrl, filename: firstMatch.name };
  } catch {
    return null;
  }
}

/**
 * Downloads a linhacanabica image to a temp file.
 * @param {string} imageUrl
 * @returns {Promise<string|null>}
 */
export async function downloadLinhacanabicaImage(imageUrl) {
  const tmpDir = os.tmpdir();
  const hash = createHash('md5').update(imageUrl).digest('hex');
  const tmpPath = path.join(tmpDir, `linha-${hash}.jpg`);

  try {
    execFileSync('curl', ['-s', '-L', '-o', tmpPath, imageUrl], { timeout: 20000 });
    const stats = fs.statSync(tmpPath);
    if (stats.size > 5000) return tmpPath;
    fs.unlinkSync(tmpPath);
  } catch {}
  return null;
}
```

- [ ] **Step 2: Test linhacanabica fetcher**

Run: `node -e "import('./scripts/lib/linhacanabica-fetcher.mjs').then(m => m.findLinhacanabicaImage('OG Kush').then(console.log))"`
Expected: `{ url: '...', filename: 'og-kush.jpg' }` or null

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/linhacanabica-fetcher.mjs
git commit -m "feat: add linhacanabica CC0 image fetcher"
```

---

## Task 5: Main Pipeline Script

**Files:**
- Create: `scripts/fetch-authentic-strain-images.mjs`

- [ ] **Step 1: Write main pipeline script**

```javascript
// scripts/fetch-authentic-strain-images.mjs
import dotenv from 'dotenv';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { readLockFile, markProcessed, markFailed, isProcessed } from './lib/lock-file.mjs';
import { findSeedbankImages, downloadSeedbankImage } from './lib/seedbank-scraper.mjs';
import { findWikimediaImages, downloadWikimediaImage } from './lib/wikimedia-scraper.mjs';
import { findLinhacanabicaImage, downloadLinhacanabicaImage } from './lib/linhacanabica-fetcher.mjs';
import { uploadToStorage } from './lib/upload-to-storage.mjs';
import { saveAttribution } from './lib/attribution-store.mjs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RATE_LIMIT_MS = 1000; // 1 second between requests

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllStrains() {
  const { data } = await supabase.from('strains').select('id, slug, name');
  return data || [];
}

async function cleanupTmp(tmpPath) {
  try { if (tmpPath) fs.unlinkSync(tmpPath); } catch {}
}

async function processStrain(strain) {
  const { slug, name } = strain;

  try {
    // Priority 1: Seedbank
    const seedbankImages = await findSeedbankImages(name);
    for (const img of seedbankImages) {
      const tmpPath = await downloadSeedbankImage(img.url);
      if (tmpPath) {
        const result = await uploadToStorage(tmpPath, slug);
        await cleanupTmp(tmpPath);
        if (result.success) {
          await saveAttribution(slug, { source: 'seedbank', author: img.author, license: img.license, url: img.url });
          await supabase.from('strains').update({ image_url: result.publicUrl }).eq('slug', slug);
          markProcessed(slug);
          return { slug, source: 'seedbank', success: true };
        }
      }
    }

    await sleep(RATE_LIMIT_MS);

    // Priority 2: Wikimedia
    const wikimediaImages = await findWikimediaImages(name);
    for (const img of wikimediaImages) {
      const tmpPath = await downloadWikimediaImage(img.url);
      if (tmpPath) {
        const result = await uploadToStorage(tmpPath, slug);
        await cleanupTmp(tmpPath);
        if (result.success) {
          await saveAttribution(slug, { source: 'wikimedia', author: img.author, license: img.license, url: img.pageUrl });
          await supabase.from('strains').update({ image_url: result.publicUrl }).eq('slug', slug);
          markProcessed(slug);
          return { slug, source: 'wikimedia', success: true };
        }
      }
    }

    await sleep(RATE_LIMIT_MS);

    // Priority 3: linhacanabica
    const linhaImage = await findLinhacanabicaImage(name);
    if (linhaImage) {
      const tmpPath = await downloadLinhacanabicaImage(linhaImage.url);
      if (tmpPath) {
        const result = await uploadToStorage(tmpPath, slug);
        await cleanupTmp(tmpPath);
        if (result.success) {
          await saveAttribution(slug, { source: 'linhacanabica', author: '', license: 'CC0', url: '' });
          await supabase.from('strains').update({ image_url: result.publicUrl }).eq('slug', slug);
          markProcessed(slug);
          return { slug, source: 'linhacanabica', success: true };
        }
      }
    }

    markFailed(slug, 'no_match');
    return { slug, source: null, success: false };
  } catch (err) {
    markFailed(slug, err.message);
    return { slug, source: null, success: false, error: err.message };
  }
}

async function main() {
  const strains = await getAllStrains();
  console.log('Processing ' + strains.length + ' strains...');

  const stats = { seedbank: 0, wikimedia: 0, linhacanabica: 0, no_match: 0 };

  for (const strain of strains) {
    if (isProcessed(strain.slug)) {
      console.log('  Skip (already processed): ' + strain.slug);
      continue;
    }

    console.log('  Processing: ' + strain.name + ' (' + strain.slug + ')');
    const result = await processStrain(strain);

    if (result.success) {
      stats[result.source]++;
      console.log('    OK from ' + result.source);
    } else {
      stats.no_match++;
      console.log('    No match');
    }
  }

  console.log('\nFinal stats:', stats);
  console.log('Lock file: scripts/.strain-image-lock.json');
  console.log('Attribution file: scripts/.image-attributions.json');
}

main().catch(console.error);
```

- [ ] **Step 2: Run for first 3 strains to verify**

Run: `node scripts/fetch-authentic-strain-images.mjs` (let it run on first 3 strains, Ctrl+C after)

- [ ] **Step 3: Commit**

```bash
git add scripts/fetch-authentic-strain-images.mjs
git commit -m "feat: main multi-source image pipeline orchestrator"
```

---

## Task 6: Wikimedia Attribution in UI

**Files:**
- Modify: `src/app/strains/[slug]/page.tsx` (add attribution display)
- Modify: `src/types/index.ts` (add image_attribution type)
- Modify: `src/lib/get-strain.ts` or API route (load attribution from DB)

- [ ] **Step 1: Add image_attribution to strain type**

In `src/types/index.ts`, extend the Strain interface:
```typescript
export interface Strain {
  // ... existing fields ...
  image_attribution?: {
    source: 'seedbank' | 'wikimedia' | 'linhacanabica' | 'none';
    author?: string;
    license?: string;
    url?: string;
  };
}
```

- [ ] **Step 2: Add attribution display in strain page**

In `src/app/strains/[slug]/page.tsx`, find the image display section and add below the strain image:

```tsx
{strain.image_attribution && strain.image_attribution.source !== 'none' && (
  <p className="text-xs text-gray-500 mt-1">
    Foto: {strain.image_attribution.author} · {strain.image_attribution.license}
    {strain.image_attribution.url && (
      <> · <a href={strain.image_attribution.url} target="_blank" rel="noopener noreferrer" className="underline">Quelle</a></>
    )}
  </p>
)}
```

- [ ] **Step 3: Update DB query to include attribution**

Add `image_attribution` to the strain SELECT in the strain detail page API/server action.

- [ ] **Step 4: Commit**

```bash
git add src/app/strains/[slug]/page.tsx src/types/index.ts
git commit -m "feat: show image attribution for wikimedia/seedbank images"
```

---

## Task 7: Run Full Pipeline

- [ ] **Step 1: Run pipeline for all 470 strains**

Run: `node scripts/fetch-authentic-strain-images.mjs`

- [ ] **Step 2: Review stats**

Check output for coverage breakdown. Unmatched strains stay with `image_url = null`.

---

## Coverage Expectations

| Source | Expected Coverage |
|--------|-----------------|
| Seedbank Media Kits | ~80-100 strains |
| Wikimedia Commons | ~50-100 strains |
| linhacanabica CC0 | ~50-100 strains |
| No match (empty) | ~170-270 strains |

Total: 40-60% der 470 Strains mit echten Bud-Fotos.

---

## Dependencies

- curl (CLI) — used by all scrapers
- Node.js 18+ with ESM support
- Supabase Storage bucket `strains` (already exists)
- `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
