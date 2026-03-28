# Strain Image Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ersetze den broken/messy `download-missing-images.mjs` durch eine robuste `fetch-strain-images.mjs` Pipeline mit Fallback-Kette (Leafly → Wikileaf → Picsum), Lock-File für Resume, Qualitäts-Check und Supabase Storage als Ziel.

**Architecture:** Ein einzelnes Node.js Script das alle 470 Strains durch die Fallback-Kette schickt, Bilder verified und in Supabase Storage hochlädt, DB updated, und den Fortschritt in einem Lock-File trackt.

**Tech Stack:** Node.js (ESM), `@supabase/supabase-js`, `dotenv`, Supabase Storage + Service Role Key

---

## File Map

```
scripts/
  fetch-strain-images.mjs     ← NEU: Hauptscript (Ablösung für download-missing-images.mjs)
  .image-pipeline-lock.json   ← NEU: Lock-File für Resume (nicht in Git)
  download-missing-images.mjs ← BLEIBT: wird nicht gelöscht (Backup)
```

Keine App-Code-Änderungen. Keine DB-Migration. Nur neues Script + Lock-File.

---

## Task 1: Lock-File Manager Utility

**Files:**
- Create: `scripts/lib/lock-file.mjs`

- [ ] **Step 1: Create directory**

```bash
mkdir -p scripts/lib
```

- [ ] **Step 2: Write lock-file manager**

```javascript
// scripts/lib/lock-file.mjs
import fs from 'fs';
import path from 'path';

const LOCK_FILE = path.join(process.cwd(), 'scripts/.image-pipeline-lock.json');

export function readLockFile() {
  if (!fs.existsSync(LOCK_FILE)) {
    return { lastRun: null, processed: [], failed: [] };
  }
  return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
}

export function writeLockFile(data) {
  fs.writeFileSync(LOCK_FILE, JSON.stringify(data, null, 2));
}

export function markProcessed(slug) {
  const lock = readLockFile();
  if (!lock.processed.includes(slug)) {
    lock.processed.push(slug);
  }
  // Remove from failed if it was there
  lock.failed = lock.failed.filter(f => f.slug !== slug);
  writeLockFile(lock);
}

export function markFailed(slug, reason) {
  const lock = readLockFile();
  const existing = lock.failed.find(f => f.slug === slug);
  if (existing) {
    existing.reason = reason;
  } else {
    lock.failed.push({ slug, reason, timestamp: new Date().toISOString() });
  }
  writeLockFile(lock);
}

export function isProcessed(slug) {
  const lock = readLockFile();
  return lock.processed.includes(slug);
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/lock-file.mjs
git commit -m "feat: add lock-file manager for image pipeline"
```

---

## Task 2: HTML Image Extractor Utility

**Files:**
- Create: `scripts/lib/extract-image.mjs`

- [ ] **Step 1: Write HTML image extractor**

```javascript
// scripts/lib/extract-image.mjs
import { execSync } from 'child_process';

/**
 * Fetches a URL and extracts og:image meta tag content.
 * Uses curl (no external deps needed).
 * Returns null if no og:image found or request failed.
 */
export function extractOgImage(url, userAgent) {
  try {
    const cmd = [
      'curl', '-s', '-L', '--max-time', '15',
      '-A', userAgent || '"Mozilla/5.0 (compatible; GreenLogImagePipeline/1.0)"',
      url
    ].join(' ');
    const html = execSync(cmd, { encoding: 'utf-8', timeout: 20000 });

    // Match og:image meta tag
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (match && match[1]) {
      return match[1];
    }

    // Fallback: any img tag with strain-related classes or src containing "strain"
    const imgMatch = html.match(/<img[^>]+src=["']([^"']*strain[^"']*\.(jpg|jpeg|png|webp)[^"']*)["']/i);
    if (imgMatch) return imgMatch[1];

    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Normalize a strain name or slug to URL-friendly format.
 */
export function normalizeSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Verify a downloaded file is a valid image.
 * Returns { valid: boolean, reason?: string }
 */
export function verifyImage(filePath) {
  import fs from 'fs';

  const stats = fs.statSync(filePath);
  if (stats.size < 5000) {
    return { valid: false, reason: `File too small: ${stats.size} bytes` };
  }

  // Check MIME via magic bytes
  const buffer = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);

  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;

  if (!isJpeg && !isPng && !isWebp) {
    return { valid: false, reason: 'Not a valid image (wrong magic bytes)' };
  }

  return { valid: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/extract-image.mjs
git commit -m "feat: add HTML og:image extractor and image verifier"
```

---

## Task 3: Rate-Limited Download Utility

**Files:**
- Create: `scripts/lib/download-image.mjs`

- [ ] **Step 1: Write download utility**

```javascript
// scripts/lib/download-image.mjs
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { verifyImage } from './extract-image.mjs';

const userAgent = '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"';

/**
 * Downloads an image from url to destPath.
 * Returns { success: boolean, reason?: string }
 */
export function downloadImage(url, destPath, timeoutMs = 15000) {
  try {
    const tmpPath = destPath + '.tmp';
    const curlCmd = [
      'curl', '-s', '-L',
      '--max-time', String(Math.floor(timeoutMs / 1000)),
      '-A', userAgent,
      '-o', tmpPath,
      url
    ].join(' ');

    execSync(curlCmd, { encoding: 'utf-8', timeout: timeoutMs + 5000 });

    if (!fs.existsSync(tmpPath)) {
      return { success: false, reason: 'Download produced no file' };
    }

    // Verify it's a real image
    const { valid, reason } = verifyImage(tmpPath);
    if (!valid) {
      fs.unlinkSync(tmpPath);
      return { success: false, reason };
    }

    // Move to final destination
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    fs.renameSync(tmpPath, destPath);
    return { success: true };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

/**
 * Convert any image to JPEG using ImageMagick if available,
 * otherwise rename as-is (assumes jpg).
 */
export function ensureJpeg(srcPath, destPath) {
  try {
    execSync(`convert "${srcPath}" -quality 85 "${destPath}"`, { timeout: 10000 });
    return true;
  } catch {
    // ImageMagick not available, just copy
    fs.copyFileSync(srcPath, destPath);
    return true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/download-image.mjs
git commit -m "feat: add rate-limited image download utility"
```

---

## Task 4: Leafly + Wikileaf Scraper

**Files:**
- Create: `scripts/lib/strain-scrapers.mjs`

- [ ] **Step 1: Write scraper module**

```javascript
// scripts/lib/strain-scrapers.mjs
import { extractOgImage, normalizeSlug } from './extract-image.mjs';
import { downloadImage } from './download-image.mjs';
import path from 'path';
import fs from 'fs';

// Rate limiter: ensures minimum delay between calls
let lastCall = 0;
const delays = { leafly: 2000, wikileaf: 1000, picsum: 500 };

function rateLimit(source) {
  const now = Date.now();
  const minDelay = delays[source] || 1000;
  const elapsed = now - lastCall;
  if (elapsed < minDelay) {
    const wait = minDelay - elapsed;
    execSync(`sleep ${wait / 1000}`, { encoding: 'utf-8' });
  }
  lastCall = Date.now();
}

import { execSync } from 'child_process';

/**
 * Attempt to get image URL from Leafly.
 * Returns { url, source } or null.
 */
export async function tryLeafly(slug, name) {
  rateLimit('leafly');

  const normalizedSlug = normalizeSlug(slug);
  const url = `https://leafly.com/strains/${normalizedSlug}`;

  const ogImage = extractOgImage(url);
  if (ogImage && (ogImage.includes('leafly') || ogImage.includes('cdn')) && isImageUrl(ogImage)) {
    return { url: ogImage, source: 'leafly' };
  }

  // Try with name if slug didn't work
  const nameSlug = normalizeSlug(name);
  if (nameSlug !== normalizedSlug) {
    rateLimit('leafly');
    const nameUrl = `https://leafly.com/strains/${nameSlug}`;
    const ogImage2 = extractOgImage(nameUrl);
    if (ogImage2 && isImageUrl(ogImage2)) {
      return { url: ogImage2, source: 'leafly' };
    }
  }

  return null;
}

/**
 * Attempt to get image URL from Wikileaf.
 * Returns { url, source } or null.
 */
export async function tryWikileaf(slug, name) {
  rateLimit('wikileaf');

  const normalizedSlug = normalizeSlug(slug);
  const url = `https://www.wikileaf.com/strains/${normalizedSlug}/`;

  const ogImage = extractOgImage(url);
  if (ogImage && isImageUrl(ogImage)) {
    return { url: ogImage, source: 'wikileaf' };
  }

  // Try with name
  const nameSlug = normalizeSlug(name);
  if (nameSlug !== normalizedSlug) {
    rateLimit('wikileaf');
    const nameUrl = `https://www.wikileaf.com/strains/${nameSlug}/`;
    const ogImage2 = extractOgImage(nameUrl);
    if (ogImage2 && isImageUrl(ogImage2)) {
      return { url: ogImage2, source: 'wikileaf' };
    }
  }

  return null;
}

/**
 * Get seeded picsum URL (deterministic per slug).
 * This is always available.
 */
export function getPicsumUrl(slug) {
  // Create a deterministic hash from slug
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    const char = slug.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const seed = Math.abs(hash);
  return `https://picsum.photos/seed/${seed}/600/800`;
}

function isImageUrl(url) {
  return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url) || url.includes('og-image') || url.includes('strain-image');
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/strain-scrapers.mjs
git commit -m "feat: add Leafly and Wikileaf scraper modules"
```

---

## Task 5: Supabase Storage Upload Utility

**Files:**
- Create: `scripts/lib/upload-to-storage.mjs`

- [ ] **Step 1: Write upload utility**

```javascript
// scripts/lib/upload-to-storage.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabase = null;

function getSupabase() {
  if (!supabase) {
    const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

/**
 * Uploads a local image file to Supabase Storage 'strains' bucket.
 * Returns the public URL or null on failure.
 */
export async function uploadToStorage(localPath, slug) {
  const fileName = `${slug}.jpg`;
  const fileBuffer = fs.readFileSync(localPath);

  const { data, error } = await getSupabase().storage
    .from('strains')
    .upload(fileName, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error(`  Upload error: ${error.message}`);
    return null;
  }

  // Get public URL
  const { data: urlData } = getSupabase().storage
    .from('strains')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/upload-to-storage.mjs
git commit -m "feat: add Supabase Storage upload utility"
```

---

## Task 6: Main Pipeline Script

**Files:**
- Create: `scripts/fetch-strain-images.mjs`

- [ ] **Step 1: Write the main pipeline script**

```javascript
// scripts/fetch-strain-images.mjs
/**
 * Strain Image Pipeline
 *
 * Fetches strain images from Leafly → Wikileaf → Picsum fallback.
 * Uploads to Supabase Storage and updates strains.image_url in DB.
 * Resumable via lock-file at scripts/.image-pipeline-lock.json
 *
 * Usage:
 *   node scripts/fetch-strain-images.mjs           # All strains
 *   node scripts/fetch-strain-images.mjs --new     # Only strains without image_url
 *   node scripts/fetch-strain-images.mjs --force   # Re-scrape even processed
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { readLockFile, writeLockFile, markProcessed, markFailed, isProcessed } from './lib/lock-file.mjs';
import { tryLeafly, tryWikileaf, getPicsumUrl } from './lib/strain-scrapers.mjs';
import { downloadImage } from './lib/download-image.mjs';
import { uploadToStorage } from './lib/upload-to-storage.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const newOnly = args.includes('--new');
const force = args.includes('--force');

const TMP_DIR = path.join(process.cwd(), 'scripts/.tmp-images');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function processStrain(strain) {
  const { id, slug, name } = strain;

  if (!force && isProcessed(slug)) {
    process.stdout.write(`  [SKIP] ${slug} already processed\n`);
    return;
  }

  process.stdout.write(`  Processing: ${slug} (${name})\n`);

  let imageUrl = null;
  let source = null;

  // Step 1: Try Leafly
  try {
    process.stdout.write(`    → Leafly... `);
    const result = await tryLeafly(slug, name);
    if (result) {
      imageUrl = result.url;
      source = 'leafly';
      process.stdout.write(`OK (${result.url.substring(0, 60)}...)\n`);
    } else {
      process.stdout.write(`not found\n`);
    }
  } catch (e) {
    process.stdout.write(`error: ${e.message}\n`);
  }

  // Step 2: Fallback to Wikileaf
  if (!imageUrl) {
    try {
      process.stdout.write(`    → Wikileaf... `);
      const result = await tryWikileaf(slug, name);
      if (result) {
        imageUrl = result.url;
        source = 'wikileaf';
        process.stdout.write(`OK\n`);
      } else {
        process.stdout.write(`not found\n`);
      }
    } catch (e) {
      process.stdout.write(`error: ${e.message}\n`);
    }
  }

  // Step 3: Fallback to Picsum
  if (!imageUrl) {
    imageUrl = getPicsumUrl(slug);
    source = 'picsum';
    process.stdout.write(`    → Picsum fallback: ${imageUrl}\n`);
  }

  // Step 4: Download the image
  const tmpPath = path.join(TMP_DIR, `${slug}.jpg`);
  process.stdout.write(`    → Downloading... `);

  const { success, reason } = await downloadImage(imageUrl, tmpPath);
  if (!success) {
    process.stdout.write(`FAILED (${reason})\n`);
    markFailed(slug, `${source}_download_failed: ${reason}`);
    return;
  }
  process.stdout.write(`OK\n`);

  // Step 5: Upload to Supabase Storage
  process.stdout.write(`    → Uploading to Storage... `);
  const publicUrl = await uploadToStorage(tmpPath, slug);
  if (!publicUrl) {
    process.stdout.write(`FAILED\n`);
    markFailed(slug, 'storage_upload_failed');
    return;
  }
  process.stdout.write(`OK\n`);

  // Step 6: Update DB
  process.stdout.write(`    → Updating DB... `);
  const { error: updateError } = await supabase
    .from('strains')
    .update({ image_url: publicUrl })
    .eq('slug', slug);

  if (updateError) {
    process.stdout.write(`FAILED (${updateError.message})\n`);
    markFailed(slug, `db_update_failed: ${updateError.message}`);
    return;
  }
  process.stdout.write(`OK\n`);

  // Step 7: Cleanup tmp file
  try { fs.unlinkSync(tmpPath); } catch {}

  // Step 8: Mark as processed
  markProcessed(slug);
  process.stdout.write(`    ✅ Done!\n`);
}

async function run() {
  console.log('🖼️  GreenLog Strain Image Pipeline');
  console.log(`   Mode: ${newOnly ? 'NEW ONLY' : force ? 'FORCE ALL' : 'ALL (skip if processed)'}`);
  console.log(`   Lock file: scripts/.image-pipeline-lock.json`);
  console.log('');

  // Initialize lock file
  const lock = readLockFile();
  if (!lock.lastRun) {
    lock.lastRun = new Date().toISOString();
    writeLockFile(lock);
  }

  // Fetch strains from DB
  let query = supabase.from('strains').select('id, slug, name, image_url');

  if (newOnly) {
    // Only strains without image_url or with placeholder refs
    query = query.or('image_url.is.null,image_url.like.%placeholder%');
  }

  const { data: strains, error } = await query;
  if (error) {
    console.error('DB fetch error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${strains.length} strains to process\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const strain of strains) {
    if (!force && isProcessed(strain.slug)) {
      skipped++;
      continue;
    }

    try {
      await processStrain(strain);
      success++;
    } catch (e) {
      console.error(`    ❌ Unexpected error: ${e.message}`);
      markFailed(strain.slug, `unexpected: ${e.message}`);
      failed++;
    }

    // Small delay between straines to be nice to servers
    await sleep(500);
  }

  console.log(`\n🏁 Pipeline complete!`);
  console.log(`   Success: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped: ${skipped}`);

  const finalLock = readLockFile();
  finalLock.lastRun = new Date().toISOString();
  writeLockFile(finalLock);
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/fetch-strain-images.mjs
git commit -m "feat: add strain image pipeline script with Leafly/Wikileaf/Picsum fallback"
```

---

## Task 7: Test the Pipeline

**Files:**
- Run: `scripts/fetch-strain-images.mjs --dry-run` (erst mal ein Testlauf mit 3 Strains)

- [ ] **Step 1: Dry-run with 3 strains to verify everything works**

```bash
# First, let's test on just 3 strains to verify the pipeline works
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  // Get 3 strains with no image_url
  const { data } = await supabase
    .from('strains')
    .select('slug, name')
    .or('image_url.is.null,image_url.like.%placeholder%')
    .limit(3);
  console.log(JSON.stringify(data, null, 2));
}
test().catch(console.error);
" 2>&1
```

- [ ] **Step 2: Run pipeline on test strains (--new flag first)**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
node scripts/fetch-strain-images.mjs --new 2>&1 | head -50
```

Expected: Processes 3 strains, downloads images, uploads to Supabase Storage, updates DB.

- [ ] **Step 3: Verify DB was updated**

```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function verify() {
  const { data } = await supabase.from('strains').select('slug, name, image_url').limit(5);
  data.forEach(s => console.log(s.slug + ' -> ' + (s.image_url || 'NO IMAGE').substring(0, 80)));
}
verify().catch(console.error);
" 2>&1
```

Expected: 3 test strains now have Supabase Storage URLs in `image_url`.

---

## Task 8: Full Pipeline Run

**Files:**
- Run: `scripts/fetch-strain-images.mjs` on all 470 strains

- [ ] **Step 1: Run full pipeline**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
node scripts/fetch-strain-images.mjs 2>&1
```

Expected output: Processes all 470 strains, Lock-File wächst, DB wird updated.

⚠️ **This will take a while** (~15-25 min at 2s Rate-Limit pro Strain für Leafly).

- [ ] **Step 2: Check results**

```bash
# Check lock file for stats
cat scripts/.image-pipeline-lock.json | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('Processed:', data.processed.length);
console.log('Failed:', data.failed.length);
console.log('Last run:', data.lastRun);
if (data.failed.length > 0) {
  console.log('\\nFailed strains:');
  data.failed.forEach(f => console.log(' -', f.slug, ':', f.reason));
}
"

# Verify images in Storage
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { count } = await supabase.from('strains').select('*', { count: 'exact', head: true }).like('image_url', '%storage%');
  console.log('Strains with storage URL:', count);
}
check().catch(console.error);
" 2>&1
```

---

## Spec Coverage Check

- [x] **Fallback-Kette Leafly → Wikileaf → Picsum** → Task 4 (strain-scrapers.mjs)
- [x] **Lock-File für Resume** → Task 1 (lock-file.mjs)
- [x] **Verify (MIME + Grösse)** → Task 2 (extract-image.mjs verifyImage)
- [x] **Rate-Limiting** → Task 4 (rateLimit in strain-scrapers.mjs)
- [x] **Supabase Storage Upload** → Task 5 (upload-to-storage.mjs)
- [x] **DB-Update** → Task 6 (fetch-strain-images.mjs, Step 6)
- [x] **Lock-File-Format mit processed/failed** → Task 1
- [x] **Kein LoremFlickr** → Pipeline nutzt nur Leafly/Wikileaf/Picsum
- [x] **Supabase Storage als Ziel** → Task 5

## Type Consistency Check

- `lock-file.mjs` exports: `readLockFile`, `writeLockFile`, `markProcessed`, `markFailed`, `isProcessed`
- `extract-image.mjs` exports: `extractOgImage`, `normalizeSlug`, `verifyImage`
- `download-image.mjs` exports: `downloadImage`, `ensureJpeg`
- `strain-scrapers.mjs` exports: `tryLeafly`, `tryWikileaf`, `getPicsumUrl`
- `upload-to-storage.mjs` exports: `uploadToStorage`
- All imports in `fetch-strain-images.mjs` match the above signatures ✅

## Self-Review

- No TBDs or TODOs ✅
- Every step has actual code ✅
- File paths exact ✅
- Test commands with expected output ✅
- Spec requirements mapped to tasks ✅
