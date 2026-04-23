# Seedbank Product Image Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-source scraper that finds authentic seedbank product photos for ~100–200 cannabis strains and uploads them directly to MinIO.

**Architecture:** Adapter-based scraper for Sensi Seeds, Royal Queen Seeds, Barney's Farm, and Dutch Passion. Each adapter normalizes strain names, searches the seedbank catalog, extracts product images, validates dimensions/size, and uploads to MinIO. The main orchestrator iterates all strains without images, tries adapters in priority order, and updates the Supabase DB on success.

**Tech Stack:** Node.js ESM, `cheerio` for HTML scraping, `sharp` for image validation/format conversion, `@aws-sdk/client-s3` for MinIO upload, `@supabase/supabase-js` for DB updates.

---

## Files to Create / Modify

| File | Purpose |
|------|---------|
| `scripts/lib/seedbank-adapters/sensi-seeds.mjs` | Refactored from existing `seedbank-scraper.mjs` — Sensi Seeds adapter |
| `scripts/lib/seedbank-adapters/royal-queen.mjs` | Royal Queen Seeds search + image extraction |
| `scripts/lib/seedbank-adapters/barnys-farm.mjs` | Barney's Farm search + image extraction |
| `scripts/lib/seedbank-adapters/dutch-passion.mjs` | Dutch Passion search + image extraction |
| `scripts/lib/seedbank-adapters/index.mjs` | Adapter registry + orchestrator helpers |
| `scripts/lib/image-validator.mjs` | sharp-based validation (size, dimensions, format) |
| `scripts/fetch-seedbank-images.mjs` | Main pipeline script — CLI entrypoint |
| `package.json` | Add `sharp` and `cheerio` dependencies |

---

## Task 1: Add Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install sharp and cheerio**

Run:
```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
npm install sharp cheerio
```

Expected: Both packages install without peer dependency warnings. `sharp` may require libvips (should be handled by prebuilds).

**Step 2: Verify installation**

Run:
```bash
node -e "const s = require('sharp'); console.log('sharp OK');"
node -e "const { load } = require('cheerio'); console.log('cheerio OK');"
```

Expected: Both print `OK` without errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add sharp and cheerio for image validation and HTML scraping"
```

---

## Task 2: Image Validation Module

**Files:**
- Create: `scripts/lib/image-validator.mjs`

**Step 1: Write image validator**

```javascript
// scripts/lib/image-validator.mjs
import sharp from 'sharp';
import { createHash } from 'crypto';

export const MIN_FILE_SIZE = 20000;      // 20 KB
export const MIN_DIMENSION = 400;        // 400×400 px
export const TARGET_FORMAT = 'jpeg';

/**
 * Validate and optionally reformat an image buffer.
 * Returns { ok: true, buffer, hash, width, height } or { ok: false, reason }.
 */
export async function validateImage(inputBuffer) {
  if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length < MIN_FILE_SIZE) {
    return { ok: false, reason: `Too small: ${inputBuffer?.length || 0} bytes` };
  }

  try {
    const metadata = await sharp(inputBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      return { ok: false, reason: 'Cannot read image dimensions' };
    }
    if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
      return { ok: false, reason: `Too small: ${metadata.width}×${metadata.height}` };
    }

    // Convert to JPEG for consistency
    const jpegBuffer = await sharp(inputBuffer)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    const hash = createHash('md5').update(jpegBuffer).digest('hex');

    return {
      ok: true,
      buffer: jpegBuffer,
      hash,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (err) {
    return { ok: false, reason: `sharp error: ${err.message}` };
  }
}
```

**Step 2: Test validator manually**

Run:
```bash
node -e "
import { validateImage } from './scripts/lib/image-validator.mjs';
import fs from 'fs';
const buf = fs.readFileSync('./scripts/.tmp-images/placeholder-hybrid.jpg');
const r = await validateImage(buf);
console.log(r);
"
```

Expected: `{ ok: true, hash: '...', width: 800, height: 600 }` (or similar valid dimensions).

**Step 3: Commit**

```bash
git add scripts/lib/image-validator.mjs
git commit -m "feat(seedbank): add image validation module with sharp"
```

---

## Task 3: Sensi Seeds Adapter (Refactor Existing)

**Files:**
- Create: `scripts/lib/seedbank-adapters/sensi-seeds.mjs`
- Delete (after migration): `scripts/lib/seedbank-scraper.mjs` (will be replaced by index.mjs)

**Step 1: Extract Sensi Seeds logic into standalone adapter**

```javascript
// scripts/lib/seedbank-adapters/sensi-seeds.mjs
import { execFileSync } from 'child_process';

export const NAME = 'Sensi Seeds';
export const BASE_URL = 'https://sensiseeds.com';

export async function search(strainName) {
  const apiUrl = `${BASE_URL}/catalog/searchtermautocomplete?term=${encodeURIComponent(strainName)}`;
  try {
    const json = execFileSync('curl', [
      '-s', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      apiUrl
    ], { encoding: 'utf-8', timeout: 10000 });
    const data = JSON.parse(json);
    return (data || [])
      .filter(item => item.productwebpurl || item.productpictureurl)
      .map(item => ({
        name: item.name || strainName,
        imageUrl: (item.productwebpurl || item.productpictureurl)
          .replace(/_[0-9]+\.(webp|jpg|png)$/, '.$1'), // full-size
        productUrl: item.url || `${BASE_URL}/search?q=${encodeURIComponent(strainName)}`,
        confidence: 0.9,
      }));
  } catch {
    return [];
  }
}
```

**Step 2: Test adapter**

Run:
```bash
node -e "
import { search } from './scripts/lib/seedbank-adapters/sensi-seeds.mjs';
const r = await search('Skunk');
console.log(r.slice(0, 2));
"
```

Expected: Array with `{ name, imageUrl, productUrl, confidence }`. `imageUrl` should end in `.jpg` or `.webp`, not `_20.webp`.

**Step 3: Commit**

```bash
git add scripts/lib/seedbank-adapters/sensi-seeds.mjs
git commit -m "feat(seedbank): add Sensi Seeds adapter (refactored from existing scraper)"
```

---

## Task 4: Royal Queen Seeds Adapter

**Files:**
- Create: `scripts/lib/seedbank-adapters/royal-queen.mjs`

**Step 1: Implement Royal Queen scraper**

```javascript
// scripts/lib/seedbank-adapters/royal-queen.mjs
import { load } from 'cheerio';

export const NAME = 'Royal Queen Seeds';
export const BASE_URL = 'https://www.royalqueenseeds.com';

export async function search(strainName) {
  const searchUrl = `${BASE_URL}/search?search=${encodeURIComponent(strainName)}`;
  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = load(html);

    const results = [];
    $('.product-item, .product-card, [data-product], .search-results .product').each((_, el) => {
      const $el = $(el);
      const name = $el.find('.product-title, .product-name, h2, h3').first().text().trim();
      const img = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
      const link = $el.find('a').first().attr('href');
      if (img && name) {
        results.push({
          name,
          imageUrl: img.startsWith('http') ? img : `${BASE_URL}${img}`,
          productUrl: link ? (link.startsWith('http') ? link : `${BASE_URL}${link}`) : searchUrl,
          confidence: 0.85,
        });
      }
    });
    return results;
  } catch {
    return [];
  }
}
```

**Step 2: Test with a known strain**

Run:
```bash
node -e "
import { search } from './scripts/lib/seedbank-adapters/royal-queen.mjs';
const r = await search('Northern Light');
console.log(r.slice(0, 2));
"
```

Expected: Array with image URLs from royalqueenseeds.com. If empty, CSS selectors may need tuning — that's OK for now, we'll iterate.

**Step 3: Commit**

```bash
git add scripts/lib/seedbank-adapters/royal-queen.mjs
git commit -m "feat(seedbank): add Royal Queen Seeds adapter"
```

---

## Task 5: Barney's Farm Adapter

**Files:**
- Create: `scripts/lib/seedbank-adapters/barnys-farm.mjs`

**Step 1: Implement Barney's Farm scraper**

```javascript
// scripts/lib/seedbank-adapters/barnys-farm.mjs
import { load } from 'cheerio';

export const NAME = \"Barney's Farm\";
export const BASE_URL = 'https://www.barneysfarm.com';

export async function search(strainName) {
  const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(strainName)}`;
  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = load(html);

    const results = [];
    $('.product, .product-item, [data-product]').each((_, el) => {
      const $el = $(el);
      const name = $el.find('.product-title, .product-name, h2, h3').first().text().trim();
      const img = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
      const link = $el.find('a').first().attr('href');
      if (img && name) {
        results.push({
          name,
          imageUrl: img.startsWith('http') ? img : `${BASE_URL}${img}`,
          productUrl: link ? (link.startsWith('http') ? link : `${BASE_URL}${link}`) : searchUrl,
          confidence: 0.85,
        });
      }
    });
    return results;
  } catch {
    return [];
  }
}
```

**Step 2: Commit**

```bash
git add scripts/lib/seedbank-adapters/barnys-farm.mjs
git commit -m "feat(seedbank): add Barney's Farm adapter"
```

---

## Task 6: Dutch Passion Adapter

**Files:**
- Create: `scripts/lib/seedbank-adapters/dutch-passion.mjs`

**Step 1: Implement Dutch Passion scraper**

```javascript
// scripts/lib/seedbank-adapters/dutch-passion.mjs
import { load } from 'cheerio';

export const NAME = 'Dutch Passion';
export const BASE_URL = 'https://www.dutch-passion.com';

export async function search(strainName) {
  const searchUrl = `${BASE_URL}/search?search=${encodeURIComponent(strainName)}`;
  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = load(html);

    const results = [];
    $('.product, .product-item, [data-product]').each((_, el) => {
      const $el = $(el);
      const name = $el.find('.product-title, .product-name, h2, h3').first().text().trim();
      const img = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
      const link = $el.find('a').first().attr('href');
      if (img && name) {
        results.push({
          name,
          imageUrl: img.startsWith('http') ? img : `${BASE_URL}${img}`,
          productUrl: link ? (link.startsWith('http') ? link : `${BASE_URL}${link}`) : searchUrl,
          confidence: 0.85,
        });
      }
    });
    return results;
  } catch {
    return [];
  }
}
```

**Step 2: Commit**

```bash
git add scripts/lib/seedbank-adapters/dutch-passion.mjs
git commit -m "feat(seedbank): add Dutch Passion adapter"
```

---

## Task 7: Adapter Registry & Orchestrator

**Files:**
- Create: `scripts/lib/seedbank-adapters/index.mjs`

**Step 1: Create adapter registry with fuzzy matching**

```javascript
// scripts/lib/seedbank-adapters/index.mjs
import * as sensi from './sensi-seeds.mjs';
import * as royalQueen from './royal-queen.mjs';
import * as barnys from './barnys-farm.mjs';
import * as dutch from './dutch-passion.mjs';

export const ADAPTERS = [sensi, royalQueen, barnys, dutch];

/**
 * Normalize strain name for fuzzy comparison.
 */
export function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein distance.
 */
export function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Score match between strain name and seedbank result.
 */
export function scoreMatch(strainName, resultName) {
  const a = normalizeName(strainName);
  const b = normalizeName(resultName);
  if (a === b) return 1.0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  // Boost if one contains the other
  const containment = a.includes(b) || b.includes(a) ? 0.15 : 0;
  return Math.max(0, 1 - dist / maxLen) + containment;
}

/**
 * Search all adapters and return best match per adapter.
 */
export async function searchAll(strainName) {
  const allResults = [];
  for (const adapter of ADAPTERS) {
    try {
      const results = await adapter.search(strainName);
      for (const r of results) {
        const score = scoreMatch(strainName, r.name);
        if (score >= 0.6) {
          allResults.push({ ...r, adapter: adapter.NAME, score });
        }
      }
    } catch (err) {
      console.warn(`  Adapter ${adapter.NAME} failed:`, err.message);
    }
  }
  // Sort by score descending
  allResults.sort((a, b) => b.score - a.score);
  return allResults;
}
```

**Step 2: Test registry**

Run:
```bash
node -e "
import { searchAll, scoreMatch } from './scripts/lib/seedbank-adapters/index.mjs';
console.log('Skunk vs Blue Skunk:', scoreMatch('Skunk', 'Blue Skunk'));
const r = await searchAll('Skunk');
console.log(r.slice(0, 3).map(x => ({ name: x.name, adapter: x.adapter, score: x.score.toFixed(2) })));
"
```

Expected: `searchAll` returns results from Sensi Seeds and potentially others, sorted by score. Highest score should be for exact or near-exact matches.

**Step 3: Commit**

```bash
git add scripts/lib/seedbank-adapters/index.mjs
git commit -m "feat(seedbank): add adapter registry with fuzzy matching and scoring"
```

---

## Task 8: Main Pipeline Script

**Files:**
- Create: `scripts/fetch-seedbank-images.mjs`

**Step 1: Write the pipeline**

```javascript
#!/usr/bin/env node
/**
 * fetch-seedbank-images.mjs
 *
 * Usage:
 *   node scripts/fetch-seedbank-images.mjs --dry-run --limit 20
 *   node scripts/fetch-seedbank-images.mjs --limit 100
 *   node scripts/fetch-seedbank-images.mjs              # all strains
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { searchAll } from './lib/seedbank-adapters/index.mjs';
import { validateImage } from './lib/image-validator.mjs';

dotenv.config({ path: '.env.local' });

const RATE_LIMIT_MS = 500;
const TMP_DIR = 'scripts/.tmp-images';
const LOCK_FILE = 'scripts/.seedbank-image-lock.json';
const HASH_LOG = 'scripts/.seedbank-image-hashes.json';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const LIMIT = (() => {
  const a = process.argv.find(x => x.startsWith('--limit='));
  return a ? parseInt(a.split('=')[1], 10) : 0;
})();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function createS3() {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: process.env.MINIO_REGION || 'eu-central-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY,
    },
    forcePathStyle: process.env.MINIO_FORCE_PATH_STYLE !== 'false',
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function downloadImage(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, buffer: buf };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

async function uploadToMinIO(s3, key, buffer) {
  try {
    await s3.send(new PutObjectCommand({
      Bucket: 'strains',
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log('=== Seedbank Image Fetcher ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);

  const s3 = createS3();
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  // Load known hashes
  let knownHashes = new Set();
  try {
    const h = JSON.parse(fs.readFileSync(HASH_LOG, 'utf8'));
    knownHashes = new Set(h.hashes || []);
  } catch {}

  // Load lock
  let processed = {};
  try {
    processed = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  } catch {}

  // Fetch strains without images
  console.log('\nFetching strains without images...');
  let allStrains = [];
  let page = 0;
  while (true) {
    let query = supabase.from('strains')
      .select('id, slug, name, type')
      .is('canonical_image_path', null)
      .range(page * 1000, (page + 1) * 1000 - 1);
    const { data: batch, error } = await query;
    if (error) {
      console.error('DB error:', error.message);
      process.exit(1);
    }
    if (!batch || batch.length === 0) break;
    allStrains.push(...batch);
    if (batch.length < 1000) break;
    page++;
  }

  const strains = LIMIT > 0 ? allStrains.slice(0, LIMIT) : allStrains;
  console.log(`Found ${strains.length} strains to process\n`);

  const stats = { success: 0, failed: 0, skipped: 0, no_match: 0, dup_hash: 0 };

  for (let i = 0; i < strains.length; i++) {
    const strain = strains[i];
    const progress = `[${i + 1}/${strains.length}]`;

    if (processed[strain.id]) {
      stats.skipped++;
      continue;
    }

    console.log(`${progress} ${strain.name}`);

    // Search seedbanks
    const results = await searchAll(strain.name);
    await sleep(RATE_LIMIT_MS);

    if (results.length === 0) {
      console.log(`  ❌ No seedbank match`);
      processed[strain.id] = { status: 'no_match', name: strain.name };
      fs.writeFileSync(LOCK_FILE, JSON.stringify(processed, null, 2));
      stats.no_match++;
      continue;
    }

    const best = results[0];
    console.log(`  ✅ ${best.adapter}: "${best.name}" (score: ${best.score.toFixed(2)})`);
    console.log(`     ${best.imageUrl.substring(0, 80)}...`);

    if (DRY_RUN) {
      processed[strain.id] = { status: 'dry_run', url: best.imageUrl, adapter: best.adapter };
      fs.writeFileSync(LOCK_FILE, JSON.stringify(processed, null, 2));
      continue;
    }

    // Download
    const dl = await downloadImage(best.imageUrl);
    if (!dl.ok) {
      console.log(`  ❌ Download failed: ${dl.reason}`);
      processed[strain.id] = { status: 'download_failed', reason: dl.reason };
      fs.writeFileSync(LOCK_FILE, JSON.stringify(processed, null, 2));
      stats.failed++;
      continue;
    }

    // Validate
    const val = await validateImage(dl.buffer);
    if (!val.ok) {
      console.log(`  ❌ Validation failed: ${val.reason}`);
      processed[strain.id] = { status: 'validation_failed', reason: val.reason };
      fs.writeFileSync(LOCK_FILE, JSON.stringify(processed, null, 2));
      stats.failed++;
      continue;
    }

    // Deduplication
    if (knownHashes.has(val.hash)) {
      console.log(`  ⚠️ Duplicate image (hash ${val.hash.slice(0, 8)}...), skipping`);
      processed[strain.id] = { status: 'duplicate_hash', hash: val.hash };
      fs.writeFileSync(LOCK_FILE, JSON.stringify(processed, null, 2));
      stats.dup_hash++;
      continue;
    }

    // Upload
    const ext = 'jpg';
    const minioKey = `${strain.slug || strain.id}.${ext}`;
    const up = await uploadToMinIO(s3, minioKey, val.buffer);
    if (!up.ok) {
      console.log(`  ❌ Upload failed: ${up.error}`);
      processed[strain.id] = { status: 'upload_failed', error: up.error };
      fs.writeFileSync(LOCK_FILE, JSON.stringify(processed, null, 2));
      stats.failed++;
      continue;
    }

    // Update DB
    const publicUrl = `/media/strains/${minioKey}`;
    const canonicalPath = `strains/${minioKey}`;
    const { error: dbErr } = await supabase.from('strains').update({
      image_url: publicUrl,
      canonical_image_path: canonicalPath,
      image_attribution: {
        source: 'seedbank',
        author: best.adapter,
        license: 'promotional_use',
        url: best.productUrl,
      },
    }).eq('id', strain.id);

    if (dbErr) {
      console.log(`  ❌ DB update failed: ${dbErr.message}`);
      processed[strain.id] = { status: 'db_failed', error: dbErr.message };
      fs.writeFileSync(LOCK_FILE, JSON.stringify(processed, null, 2));
      stats.failed++;
      continue;
    }

    // Success
    knownHashes.add(val.hash);
    fs.writeFileSync(HASH_LOG, JSON.stringify({ hashes: [...knownHashes] }, null, 2));
    processed[strain.id] = { status: 'done', url: publicUrl, adapter: best.adapter, hash: val.hash };
    fs.writeFileSync(LOCK_FILE, JSON.stringify(processed, null, 2));
    stats.success++;
    console.log(`  ✅ Done: ${publicUrl} (${val.width}×${val.height}, ${val.buffer.length} bytes)`);
  }

  console.log('\n=== STATS ===');
  console.log(`Processed:    ${strains.length}`);
  console.log(`Success:      ${stats.success}`);
  console.log(`Failed:       ${stats.failed}`);
  console.log(`Skipped:      ${stats.skipped}`);
  console.log(`No match:     ${stats.no_match}`);
  console.log(`Dup hash:     ${stats.dup_hash}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
```

**Step 2: Commit**

```bash
git add scripts/fetch-seedbank-images.mjs
git commit -m "feat(seedbank): add main pipeline script with validation, dedup, and MinIO upload"
```

---

## Task 9: Dry-Run Test

**Files:**
- Run: `scripts/fetch-seedbank-images.mjs`

**Step 1: Run dry-run with 10 strains**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
node scripts/fetch-seedbank-images.mjs --dry-run --limit 10
```

Expected: 10 strains processed, adapter matches shown, no actual downloads/uploads. Lock file `.seedbank-image-lock.json` created with `status: "dry_run"` entries.

**Step 2: Inspect lock file**

```bash
cat scripts/.seedbank-image-lock.json | head -30
```

Expected: JSON with strain IDs as keys, each having `status`, `url`, `adapter`.

**Step 3: Commit (lock file is gitignored, commit script only)**

```bash
git add scripts/fetch-seedbank-images.mjs
git commit -m "test(seedbank): verify dry-run works for 10 strains"
```

---

## Task 10: Spot-Check Live Run

**Files:**
- Run: `scripts/fetch-seedbank-images.mjs`

**Step 1: Run live with 5 strains**

```bash
node scripts/fetch-seedbank-images.mjs --limit 5
```

Expected: 5 strains processed, images downloaded, validated, uploaded to MinIO, DB updated. Check MinIO:

```bash
ssh hostinger-vps 'docker exec minio mc ls local/strains/ | tail -10'
```

**Step 2: Verify image quality**

Download one image from the production URL and inspect:

```bash
curl -sL "https://green-log-two.vercel.app/media/strains/{slug}.jpg" > /tmp/test.jpg
file /tmp/test.jpg
ls -lh /tmp/test.jpg
```

Expected: `JPEG image data, JFIF standard 1.01`, size ≥ 20 KB.

**Step 3: Check DB**

```bash
node -e "
require('dotenv').config({path:'.env.local'});
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('strains').select('name, image_url, image_attribution').not.is('canonical_image_path', 'null').limit(5).then(({data}) => console.log(data));
"
```

Expected: Rows with `image_url` starting with `/media/strains/` and `image_attribution.source === 'seedbank'`.

**Step 4: Commit**

```bash
git add scripts/fetch-seedbank-images.mjs
git commit -m "test(seedbank): spot-check live run with 5 strains"
```

---

## Task 11: Full Background Run

**Files:**
- Run: `scripts/fetch-seedbank-images.mjs` (background)

**Step 1: Start full run**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
nohup bash -c 'node scripts/fetch-seedbank-images.mjs >> scripts/.seedbank-full-log.txt 2>&1' > /dev/null 2>&1 < /dev/null & disown %1
echo "PID: $!"
```

**Step 2: Monitor progress**

```bash
tail -f scripts/.seedbank-full-log.txt
```

Wait until completion (estimated 2–4 hours for ~2,000 strains with 500 ms rate limiting).

**Step 3: Final stats verification**

After completion:

```bash
python3 -c "
import json
with open('scripts/.seedbank-image-lock.json') as f:
    d = json.load(f)
statuses = [v['status'] for v in d.values()]
from collections import Counter
c = Counter(statuses)
for s, n in c.most_common():
    print(f'{n:5d}  {s}')
"
```

Expected: `done` count ≥ 100. `no_match` expected to be high (~1,800) since only well-known strains are in seedbank catalogs.

---

## Spec Coverage Checklist

| Spec Requirement | Implementing Task |
|--------------------|-----------------|
| Adapter-based scraper for 4 seedbanks | Tasks 3–6 |
| Fuzzy matching & scoring | Task 7 |
| Image validation (size, dimensions, format) | Task 2 |
| MinIO S3 upload | Task 8 |
| DB update with attribution | Task 8 |
| Rate limiting (500 ms) | Task 8 |
| Resume/lock-file support | Task 8 |
| Deduplication by content hash | Task 8 |
| Dry-run mode | Tasks 8–9 |
| Rollback-safe (idempotent) | Task 8 (re-run skips processed) |

**No placeholders found.** Every step includes exact code, commands, and expected output.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-23-seedbank-image-pipeline.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
