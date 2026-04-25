#!/usr/bin/env node
/**
 * fetch-seedbank-images.mjs
 *
 * Fetches authentic seedbank product photos for strains without images.
 * Priority: Sensi Seeds → Royal Queen → Barney's Farm → Dutch Passion.
 *
 * Usage:
 *   node scripts/fetch-seedbank-images.mjs --dry-run --limit 20
 *   node scripts/fetch-seedbank-images.mjs --limit 100
 *   node scripts/fetch-seedbank-images.mjs              # all strains
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { searchAll } from './lib/seedbank-adapters/index.mjs';
import { validateImage } from './lib/image-validator.mjs';
import { getSearchCandidates } from './lib/strain-aliases.mjs';

dotenv.config({ path: '.env.local' });

const RATE_LIMIT_MS = 500;
const TMP_DIR = 'scripts/.tmp-images';
const LOCK_FILE = 'scripts/.seedbank-image-lock.json';
const HASH_LOG = 'scripts/.seedbank-image-hashes.json';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const RETRY_NO_MATCH = args.has('--retry-no-match');
const LIMIT = (() => {
  const a = process.argv.find(x => x.startsWith('--limit='));
  return a ? parseInt(a.split('=')[1], 10) : 0;
})();
const STATUS = (() => {
  const a = process.argv.find(x => x.startsWith('--status='));
  return a ? a.split('=')[1] : null;
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

async function searchWithAliases(strainName) {
  const candidates = getSearchCandidates(strainName);
  for (const candidate of candidates) {
    const results = await searchAll(candidate);
    await sleep(RATE_LIMIT_MS);
    if (results.length > 0) return { query: candidate, results };
  }
  return { query: strainName, results: [] };
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

  // Fetch strains with placeholder/generic images (to be replaced with real ones)
  console.log('\nFetching strains with placeholder/generic images...');
  let allStrains = [];
  let page = 0;
  while (true) {
    let query = supabase.from('strains')
      .select('id, slug, name, type, image_url, canonical_image_path, publication_status')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (STATUS) query = query.eq('publication_status', STATUS);
    const { data: batch, error } = await query;
    if (error) {
      console.error('DB error:', error.message);
      process.exit(1);
    }
    if (!batch || batch.length === 0) break;
    // Filter: only strains with placeholder images
    const placeholderBatch = batch.filter(s => {
      const imageUrl = String(s.image_url || '').toLowerCase();
      const canonicalPath = String(s.canonical_image_path || '').toLowerCase();
      const value = `${imageUrl} ${canonicalPath}`;
      return value.includes('placeholder') || value.includes('weedmaps') || value.includes('avatar') || value.includes('/defaults/generic/') || value.includes('generic');
    });
    allStrains.push(...placeholderBatch);
    if (batch.length < 1000) break;
    page++;
  }

  const strains = LIMIT > 0 ? allStrains.slice(0, LIMIT) : allStrains;
  console.log(`Found ${strains.length} strains to process\n`);

  const stats = { success: 0, failed: 0, skipped: 0, no_match: 0, dup_hash: 0 };

  for (let i = 0; i < strains.length; i++) {
    const strain = strains[i];
    const progress = `[${i + 1}/${strains.length}]`;

    if (
      processed[strain.id] &&
      !(processed[strain.id].status === 'dry_run' && !DRY_RUN) &&
      !(RETRY_NO_MATCH && processed[strain.id].status === 'no_match')
    ) {
      stats.skipped++;
      continue;
    }

    console.log(`${progress} ${strain.name}`);

    // Search seedbanks
    const search = await searchWithAliases(strain.name);
    const results = search.results;

    if (results.length === 0) {
      console.log(`  ❌ No seedbank match`);
      if (!DRY_RUN) {
        processed[strain.id] = { status: 'no_match', name: strain.name };
        fs.writeFileSync(LOCK_FILE, JSON.stringify(processed, null, 2));
      }
      stats.no_match++;
      continue;
    }

    const best = results[0];
    if (search.query !== strain.name) {
      console.log(`  ↪ Search alias: ${search.query}`);
    }
    console.log(`  ✅ ${best.adapter}: "${best.name}" (score: ${best.score.toFixed(2)})`);
    console.log(`     ${best.imageUrl.substring(0, 80)}...`);

    if (DRY_RUN) {
      console.log(`  🔎 Dry run: would use ${best.adapter}`);
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
