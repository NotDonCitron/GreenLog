#!/usr/bin/env node
/**
 * enrich-draft-images.mjs
 *
 * Anreicherung von draft Strains mit Bildern von Leafly.
 * Holt draft Strains ohne Bild, scrapt Leafly, lädt Bilder in Storage,
 * updated die DB und setzt auf 'review' wenn das Publish-Gate passiert.
 *
 * Usage:
 *   node scripts/enrich-draft-images.mjs --dry --limit=50
 *   node scripts/enrich-draft-images.mjs --limit=100
 *   node scripts/enrich-draft-images.mjs                    # alle draft ohne Bild
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

const execAsync = promisify(exec);

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local'), override: false });

// ── Config ──
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry');
const LIMIT = parseNumberArg('--limit', 0);
const CONCURRENT = parseNumberArg('--concurrent', 3);
const SET_REVIEW = args.includes('--set-review');
const CURL_TIMEOUT = 20;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'strain-images';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseNumberArg(name, fallback) {
  const eqArg = args.find(a => a.startsWith(`${name}=`));
  if (eqArg) {
    const val = Number(eqArg.split('=').slice(1).join('='));
    return Number.isFinite(val) ? val : fallback;
  }
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    const val = Number(args[idx + 1]);
    return Number.isFinite(val) ? val : fallback;
  }
  return fallback;
}

// ── Leafly HTTP fetch ──
async function httpFetchHtml(url) {
  try {
    const { stdout } = await execAsync(
      `curl -s --compressed --max-time ${CURL_TIMEOUT} --max-redirs 5 \
       -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" \
       -H "Accept-Language: en-US,en;q=0.9" \
       -L "${url.replace(/"/g, '\\"')}"`,
      { timeout: CURL_TIMEOUT * 1000 + 5000 }
    );
    return stdout || null;
  } catch {
    return null;
  }
}

function parseNextData(html) {
  if (!html) return null;
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function isPlaceholderImage(url) {
  if (!url) return true;
  return /\/defaults\//.test(url.toLowerCase());
}

function extractBestImage(strain) {
  const highlighted = strain.highlightedPhotos || [];
  for (const photo of highlighted) {
    if (photo?.imageUrl && !isPlaceholderImage(photo.imageUrl)) {
      return { url: photo.imageUrl, source: 'leafly_user' };
    }
  }
  if (strain.nugImage && !isPlaceholderImage(strain.nugImage)) {
    return { url: strain.nugImage, source: 'leafly_nug' };
  }
  if (strain.stockNugImage && !isPlaceholderImage(strain.stockNugImage)) {
    return { url: strain.stockNugImage, source: 'leafly_similar' };
  }
  return null;
}

function normalizeSlug(name) {
  return name.toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── Download + Upload ──
async function downloadImage(url, slug) {
  const tmpPath = `/tmp/enrich-${slug}.jpg`;
  try {
    await execAsync(`curl -sL "${url.replace(/"/g, '\\"')}" -o "${tmpPath}" --max-time 15`, { timeout: 20000 });
    const stats = fs.statSync(tmpPath);
    if (stats.size < 2000) {
      fs.unlinkSync(tmpPath);
      return null;
    }
    return tmpPath;
  } catch {
    return null;
  }
}

async function uploadToStorage(localPath, slug) {
  const ext = 'jpg';
  const fileName = `strains/${slug}.${ext}`;
  const fileBuffer = fs.readFileSync(localPath);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, fileBuffer, { upsert: true, contentType: `image/${ext}` });

  if (uploadError) {
    console.error(`   ❌ Upload failed: ${uploadError.message}`);
    return null;
  }

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  fs.unlinkSync(localPath);
  return urlData.publicUrl;
}

// ── Publish Gate ──
function passesPublishGate(strain) {
  const reasons = [];
  if (!strain.description || strain.description.length < 20) reasons.push('description');
  if (strain.thc_min == null || strain.thc_max == null) reasons.push('thc');
  if (!Array.isArray(strain.terpenes) || strain.terpenes.length < 2) reasons.push('terpenes');
  if (!Array.isArray(strain.effects) || strain.effects.length < 1) reasons.push('effects');
  if (!Array.isArray(strain.flavors) || strain.flavors.length < 1) reasons.push('flavors');
  return { passed: reasons.length === 0, reasons };
}

// ── Main ──
async function main() {
  console.log('');
  console.log('🖼️  Draft Strain Image Enrichment');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚠️  EXECUTE'}`);
  console.log(`Concurrent: ${CONCURRENT}`);
  if (LIMIT) console.log(`Limit: ${LIMIT}`);
  console.log('');

  // 1. Fetch draft strains without images
  console.log('📥 Lade draft Strains ohne Bild...');
  let offset = 0;
  const pageSize = 1000;
  let draftStrains = [];

  while (true) {
    const { data, error } = await supabase
      .from('strains')
      .select('id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, terpenes, effects, flavors, image_url, publication_status, primary_source')
      .eq('publication_status', 'draft')
      .or('image_url.is.null,image_url.like.%placeholder%,image_url.like.%picsum%')
      .range(offset, offset + pageSize - 1);

    if (error) { console.error('❌ DB Error:', error.message); process.exit(1); }
    if (!data?.length) break;
    draftStrains.push(...data);
    offset += pageSize;
    if (LIMIT > 0 && draftStrains.length >= LIMIT) {
      draftStrains = draftStrains.slice(0, LIMIT);
      break;
    }
  }

  console.log(`   ${draftStrains.length} draft Strains ohne Bild gefunden`);
  if (draftStrains.length === 0) {
    console.log('✅ Nichts zu enrichieren.');
    return;
  }
  console.log('');

  // 2. Process
  const pLimit = (await import('p-limit')).default;
  const limiter = pLimit(CONCURRENT);

  let enriched = 0;
  let failed = 0;
  let notFound = 0;
  let noImage = 0;
  let promoted = 0;
  const start = Date.now();

  const tasks = draftStrains.map((strain, idx) => limiter(async () => {
    const slug = normalizeSlug(strain.name);
    const url = `https://leafly.com/strains/${slug}`;

    console.log(`[${idx + 1}/${draftStrains.length}] 🔍 ${strain.name} → ${slug}`);

    const html = await httpFetchHtml(url);
    if (!html) {
      console.log(`   ❌ HTTP failed`);
      failed++;
      return;
    }

    const nextData = parseNextData(html);
    if (!nextData?.props?.pageProps?.strain) {
      console.log(`   ❌ Keine Leafly-Daten`);
      notFound++;
      return;
    }

    const leaflyStrain = nextData.props.pageProps.strain;
    const imageData = extractBestImage(leaflyStrain);

    if (!imageData) {
      console.log(`   ⚠️  Kein Bild auf Leafly`);
      noImage++;
      return;
    }

    console.log(`   ✅ Bild gefunden: ${imageData.source}`);

    if (DRY_RUN) {
      enriched++;
      // Check if would be promoted
      const updatedStrain = { ...strain, image_url: imageData.url };
      const gate = passesPublishGate(updatedStrain);
      if (gate.passed) {
        console.log(`   🚀 Würde auf 'review' gesetzt (Gate passed)`);
        promoted++;
      }
      return;
    }

    // Download & Upload
    const localPath = await downloadImage(imageData.url, slug);
    if (!localPath) {
      console.log(`   ❌ Download fehlgeschlagen`);
      failed++;
      return;
    }

    const publicUrl = await uploadToStorage(localPath, slug);
    if (!publicUrl) {
      failed++;
      return;
    }

    // Build update
    const update = { image_url: publicUrl };

    // Also enrich other data if missing
    const lStrain = leaflyStrain;
    if (!strain.description && lStrain.descriptionPlain) {
      update.description = lStrain.descriptionPlain;
    }
    if (strain.thc_min == null && lStrain.cannabinoids?.thc?.percentile50 != null) {
      update.thc_min = lStrain.cannabinoids.thc.percentile50;
    }
    if (strain.thc_max == null && lStrain.cannabinoids?.thc?.percentile50 != null) {
      update.thc_max = lStrain.cannabinoids.thc.percentile50;
    }
    if (strain.cbd_min == null && lStrain.cannabinoids?.cbd?.percentile50 != null) {
      update.cbd_min = lStrain.cannabinoids.cbd.percentile50;
    }
    if (strain.cbd_max == null && lStrain.cannabinoids?.cbd?.percentile50 != null) {
      update.cbd_max = lStrain.cannabinoids.cbd.percentile50;
    }
    if ((!strain.effects || strain.effects.length === 0) && lStrain.effects) {
      update.effects = Object.entries(lStrain.effects)
        .filter(([_, d]) => d?.score > 0.5)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 6)
        .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1));
    }
    if ((!strain.flavors || strain.flavors.length === 0) && lStrain.flavors) {
      update.flavors = Object.entries(lStrain.flavors)
        .filter(([_, d]) => d?.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([name]) => name.replace(/([A-Z])/g, ' $1').trim());
    }
    if ((!strain.terpenes || strain.terpenes.length === 0) && lStrain.terps) {
      update.terpenes = Object.entries(lStrain.terps)
        .filter(([_, d]) => d?.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1));
    }

    // Check publish gate
    const updatedStrain = { ...strain, ...update };
    const gate = passesPublishGate(updatedStrain);
    if (gate.passed && SET_REVIEW) {
      update.publication_status = 'review';
      promoted++;
    }

    // Update DB
    const { error: updateError } = await supabase.from('strains').update(update).eq('id', strain.id);
    if (updateError) {
      console.error(`   ❌ DB update failed: ${updateError.message}`);
      failed++;
      return;
    }

    enriched++;
    console.log(`   ✅ Enriched${gate.passed && SET_REVIEW ? ' + promoted to review' : ''}`);
  }));

  await Promise.all(tasks);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ ENRICHMENT ABGESCHLOSSEN');
  console.log('='.repeat(60));
  console.log(`   Enriched:     ${enriched}`);
  console.log(`   Not found:    ${notFound}`);
  console.log(`   No image:     ${noImage}`);
  console.log(`   Failed:       ${failed}`);
  if (SET_REVIEW) console.log(`   Promoted:     ${promoted}`);
  console.log(`   Zeit:         ${elapsed}s`);
  console.log(`   Rate:         ${(draftStrains.length / Number(elapsed)).toFixed(1)} strains/s`);
  console.log('');
}

main().catch(err => {
  console.error('💀 Fatal:', err);
  process.exit(1);
});
