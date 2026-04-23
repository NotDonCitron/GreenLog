#!/usr/bin/env node
/**
 * Strain Image Backfill
 *
 * Replaces placeholder/unsplash images with authentic strain-specific images.
 * Sources (in priority): Leafly → AllBud → Wikimedia Commons
 *
 * Quality gates:
 *   - Min file size: 20KB
 *   - Min dimensions: 300x300px
 *   - No avatar/thumbnail/stock patterns in URL
 *   - Converts to WebP, max 800px on longest edge
 *
 * Usage:
 *   node scripts/strain-image-backfill.mjs --dry-run --limit 20
 *   node scripts/strain-image-backfill.mjs --concurrent=5
 *   node scripts/strain-image-backfill.mjs --resume
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import fs from 'fs';

// ── Load env from project root ───────────────────────────────────────────────
const PROJECT_ROOT = process.cwd();
dotenv.config({ path: `${PROJECT_ROOT}/.env.local` });

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MINIO_ENDPOINT  = process.env.MINIO_ENDPOINT;
const MINIO_ACCESS    = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET    = process.env.MINIO_SECRET_KEY;
const MINIO_REGION    = process.env.MINIO_REGION || 'eu-central-1';
const MINIO_PATH_STYLE = process.env.MINIO_FORCE_PATH_STYLE !== 'false';

const BUCKET       = 'strains';
const PROGRESS_FILE = `${PROJECT_ROOT}/scripts/.image-backfill-progress.json`;

const PLACEHOLDER_PATTERNS = [/placeholder/i, /picsum/i, /unsplash.*photo-160390/i, /default/i];
const BAD_URL_PATTERNS     = [/avatar/i, /thumbnail/i, /50x50/i, /icon/i, /stock[-_]?photo/i, /similar[-_]?to/i];

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const DRY_RUN      = args.has('--dry-run');
const LIMIT        = parseInt(process.argv.find(x => x.startsWith('--limit='))?.split('=')[1] || '0', 10) || 0;
const CONCURRENT   = parseInt(process.argv.find(x => x.startsWith('--concurrent='))?.split('=')[1] || '3', 10) || 3;
const SOURCE_FILTER = process.argv.find(x => x.startsWith('--source='))?.split('=')[1] || null;
const RESUME       = args.has('--resume');

// ── Init clients ─────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: MINIO_REGION,
  credentials: { accessKeyId: MINIO_ACCESS, secretAccessKey: MINIO_SECRET },
  forcePathStyle: MINIO_PATH_STYLE,
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function isPlaceholder(url) { return !url || PLACEHOLDER_PATTERNS.some(p => p.test(url)); }
function isBadUrl(url)     { return BAD_URL_PATTERNS.some(p => p.test(url)); }
function slugify(name) {
  return name.toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

// ── Image validation ─────────────────────────────────────────────────────────
async function validateImage(buffer) {
  if (buffer.length < 20 * 1024)  return { ok: false, reason: 'too_small', size: buffer.length };
  if (buffer.length > 10 * 1024 * 1024) return { ok: false, reason: 'too_large', size: buffer.length };

  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return { ok: false, reason: 'no_dimensions' };
    if (meta.width < 300 || meta.height < 300) {
      return { ok: false, reason: 'too_small_dims', w: meta.width, h: meta.height };
    }
    return { ok: true, w: meta.width, h: meta.height, format: meta.format };
  } catch (e) {
    return { ok: false, reason: 'invalid_image', error: e.message };
  }
}

async function processImage(buffer) {
  try {
    const webp = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
    return { ok: true, buffer: webp, format: 'webp', size: webp.length };
  } catch (e) {
    return { ok: false, reason: 'sharp_failed', error: e.message };
  }
}

// ── Download ─────────────────────────────────────────────────────────────────
async function downloadImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

    const buf = Buffer.from(await res.arrayBuffer());
    const ct  = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return { ok: false, reason: `bad_ct: ${ct}` };

    return { ok: true, buffer: buf, contentType: ct };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// ── Source 1: Leafly ─────────────────────────────────────────────────────────
async function fetchLeafly(strainName) {
  const base = slugify(strainName);
  if (!base) return null;

  const variants = new Set([base]);
  if (base.endsWith('s')) variants.add(base.slice(0, -1));
  variants.add(base + 's');

  for (const variant of [...variants]) {
    await sleep(400);
    try {
      const res = await fetch(`https://www.leafly.com/strains/${variant}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;

      const html = await res.text();
      const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
      if (!m) continue;

      const data = JSON.parse(m[1]);
      const strain = data?.props?.pageProps?.strain;
      if (!strain?.name) continue;

      let url = null, src = null;

      // Priority 1: real nug photo
      if (strain.nugImage && !isBadUrl(strain.nugImage)) {
        url = strain.nugImage; src = 'leafly_nug';
      }
      // Priority 2: highlighted user photos
      else if (strain.highlightedPhotos?.length) {
        for (const p of strain.highlightedPhotos) {
          if (p.imageUrl && !isBadUrl(p.imageUrl)) { url = p.imageUrl; src = 'leafly_photo'; break; }
        }
      }
      // Priority 3: stock nug (still strain-specific)
      else if (strain.stockNugImage) {
        url = strain.stockNugImage; src = 'leafly_stock';
      }

      if (url) return { url, source: src, quality: src.includes('stock') ? 'stock' : 'real', strainSlug: strain.slug };
    } catch { /* continue */ }
  }
  return null;
}

// ── Source 2: AllBud ─────────────────────────────────────────────────────────
async function fetchAllbud(strainName) {
  const slug = slugify(strainName);
  if (!slug) return null;

  await sleep(400);
  try {
    const res = await fetch(`https://www.allbud.com/marijuana-strains/${slug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const m = html.match(/<meta property="og:image" content="(.*?)"/i);
    if (!m) return null;

    const url = m[1];
    if (isBadUrl(url)) return null;
    return { url, source: 'allbud', quality: 'real', strainSlug: slug };
  } catch { return null; }
}

// ── Source 3: Wikimedia Commons ──────────────────────────────────────────────
async function fetchWikimedia(strainName) {
  await sleep(300);
  try {
    // 1. Search
    const searchRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`cannabis strain "${strainName}"`)}&srlimit=3&format=json&origin=*`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const results = searchData?.query?.search;
    if (!results?.length) return null;

    // 2. Get image info for first result
    const title = results[0].title;
    const infoRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|mime&format=json&origin=*`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!infoRes.ok) return null;
    const infoData = await infoRes.json();
    const page = Object.values(infoData?.query?.pages || {})[0];
    const ii = page?.imageinfo?.[0];
    if (!ii?.url) return null;
    if (ii.width < 300 || ii.height < 300) return null;

    return { url: ii.url, source: 'wikimedia', quality: 'real', strainSlug: null, width: ii.width, height: ii.height };
  } catch { return null; }
}

// ── Multi-source resolver ────────────────────────────────────────────────────
async function findBestImage(strain) {
  const sources = [];
  if (!SOURCE_FILTER || SOURCE_FILTER === 'leafly')    sources.push(() => fetchLeafly(strain.name));
  if (!SOURCE_FILTER || SOURCE_FILTER === 'allbud')    sources.push(() => fetchAllbud(strain.name));
  if (!SOURCE_FILTER || SOURCE_FILTER === 'wikimedia') sources.push(() => fetchWikimedia(strain.name));

  for (const fetcher of sources) {
    const meta = await fetcher();
    if (!meta?.url) continue;

    const dl = await downloadImage(meta.url);
    if (!dl.ok) continue;

    const validation = await validateImage(dl.buffer);
    if (!validation.ok) continue;

    const processed = await processImage(dl.buffer);
    if (!processed.ok) continue;

    return {
      ...meta,
      buffer: processed.buffer,
      originalSize: dl.buffer.length,
      processedSize: processed.buffer,
      width: validation.w,
      height: validation.h,
    };
  }
  return null;
}

// ── MinIO upload ─────────────────────────────────────────────────────────────
async function uploadToMinIO(slug, buffer) {
  const key = `${slug}.webp`;

  if (DRY_RUN) {
    const host = MINIO_ENDPOINT.replace(/\/+$/, '').replace(/^http:\/\//, 'https://');
    return { ok: true, path: key, publicUrl: `${host}/${BUCKET}/${key}`, dryRun: true };
  }

  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: buffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    // Build public URL (Traefik routes storage.cannalog.fun → MinIO)
    const host = MINIO_ENDPOINT.replace(/\/+$/, '').replace(/^http:\/\//, 'https://');
    const publicUrl = `${host}/${BUCKET}/${key}`;
    return { ok: true, path: key, publicUrl };
  } catch (e) {
    return { ok: false, reason: 'upload_failed', error: e.message };
  }
}

// ── DB ops ───────────────────────────────────────────────────────────────────
async function getPlaceholderStrains() {
  const all = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('strains')
      .select('id, slug, name, type, image_url, canonical_image_path, publication_status, primary_source')
      .or('image_url.ilike.%placeholder%,image_url.ilike.%picsum%,canonical_image_path.ilike.%placeholder%')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) { console.error('DB Error:', error); break; }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return all;
}

async function updateStrain(strain, result) {
  if (DRY_RUN) return { ok: true };

  const { error } = await supabase.from('strains').update({
    image_url: result.publicUrl,
    canonical_image_path: result.path,
    image_attribution: {
      source: result.source,
      url: result.strainSlug
        ? `https://www.leafly.com/strains/${result.strainSlug}`
        : result.url,
    },
    source_notes: `Image: ${result.source} ${result.width}x${result.height} (${Math.round(result.processedSize.length / 1024)}KB)`,
  }).eq('id', strain.id);

  return error ? { ok: false, error: error.message } : { ok: true };
}

// ── Progress ─────────────────────────────────────────────────────────────────
function loadProgress() {
  try {
    if (!RESUME) return { processed: new Set(), stats: { updated: 0, skipped: 0, failed: 0 } };
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    return { processed: new Set(data.processed || []), stats: data.stats || { updated: 0, skipped: 0, failed: 0 } };
  } catch {
    return { processed: new Set(), stats: { updated: 0, skipped: 0, failed: 0 } };
  }
}

function saveProgress(processed, stats) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
      processed: [...processed],
      stats,
      lastRun: new Date().toISOString(),
    }, null, 2));
  } catch (e) { console.warn('Progress save failed:', e.message); }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Strain Image Backfill ===\n');
  console.log(`Mode:       ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Concurrent: ${CONCURRENT}`);
  if (LIMIT)       console.log(`Limit:      ${LIMIT}`);
  if (SOURCE_FILTER) console.log(`Source:     ${SOURCE_FILTER}`);
  console.log('');

  const { processed, stats } = loadProgress();
  console.log(`Resuming: ${processed.size} already done`);

  console.log('\nLoading placeholder strains...');
  const strains = await getPlaceholderStrains();
  console.log(`Found ${strains.length} strains with placeholders`);

  const targets = strains.filter(s => !processed.has(s.slug)).slice(0, LIMIT || Infinity);
  console.log(`Targets:  ${targets.length}\n`);

  if (!targets.length) { console.log('Nothing to do!'); return; }

  let { updated, skipped, failed } = stats;
  const start = Date.now();

  for (let i = 0; i < targets.length; i += CONCURRENT) {
    const batch = targets.slice(i, i + CONCURRENT);

    await Promise.all(batch.map(async (strain) => {
      process.stdout.write(`[${i + 1}/${targets.length}] ${strain.name}... `);

      const img = await findBestImage(strain);
      if (!img) {
        console.log('⚠️ Not found');
        skipped++;
        processed.add(strain.slug);
        return;
      }

      const up = await uploadToMinIO(strain.slug, img.buffer);
      if (!up.ok) { console.log(`❌ Upload: ${up.error}`); failed++; return; }

      const db = await updateStrain(strain, { ...up, ...img });
      if (!db.ok) { console.log(`❌ DB: ${db.error}`); failed++; return; }

      console.log(`✅ ${img.source} ${img.width}x${img.height} → ${Math.round(img.buffer.length / 1024)}KB`);
      updated++;
      processed.add(strain.slug);
    }));

    saveProgress(processed, { updated, skipped, failed });

    const elapsed = (Date.now() - start) / 1000;
    const rate = updated / (elapsed / 60) || 0;
    const remaining = targets.length - i - batch.length;
    const eta = rate > 0 ? Math.round(remaining / rate) : '?';

    console.log(`  📊 ${Math.min(i + CONCURRENT, targets.length)}/${targets.length} | ✅${updated} ⚠️${skipped} ❌${failed} | ~${Math.round(rate)}/min | ETA ~${eta}min\n`);
    await sleep(800);
  }

  const total = Math.round((Date.now() - start) / 1000);
  console.log(`=== Done in ${total}s ===`);
  console.log(`Updated: ${updated} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log(`Success rate: ${Math.round(updated / targets.length * 100)}%`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
