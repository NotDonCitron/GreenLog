/**
 * TerpScout → GreenLog Strain Importer
 * 
 * Fetches strains from TerpScout (65k+ strains), mirrors images to Supabase Storage,
 * and imports into GreenLog strains table following the Curated Canon publish gate.
 * 
 * Usage: 
 *   LEEFII_API_KEY=xxx SUPABASE_SERVICE_KEY=xxx node import-terpscout.js
 * 
 * Features:
 *   - Paginated fetch (24 strains/page, full corpus in ~2741 pages)
 *   - Image mirror: downloads TerpScout images → Supabase Storage
 *   - Duplicate detection by slug (skips existing)
 *   - Publish gate: sets publication_status to 'review' only when image was successfully mirrored
 *   - Progress logging every 50 strains
 *   - Dry-run mode: --dry-run flag shows what would be imported without writing to DB
 * 
 * Sources: TerpScout (terpscout.com), License: internal use
 */

import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── Config ──────────────────────────────────────────────────────────────────

const TERPSCOUT_BASE = 'https://www.terpscout.com/api/strains';
const SUPABASE_URL = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const STORAGE_BUCKET = 'strains-images';

const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const pageLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const batchSize = 50; // strains per DB upsert batch

if (!supabaseServiceKey) {
  console.error('❌  SUPABASE_SERVICE_KEY env var required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, supabaseServiceKey, {
  auth: { persistSession: false }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normalize a strain name into a URL-safe slug.
 */
function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')        // remove fancy quotes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Download an image and return the buffer. Returns null on failure.
 */
async function downloadImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GreenLogImporter/1.0)' },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;
    const chunks = [];
    for await (const chunk of res.body) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

/**
 * Upload a buffer to Supabase Storage and return the public URL.
 */
async function uploadToSupabase(buffer, destPath, contentType = 'image/jpeg') {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(destPath, buffer, {
      contentType,
      upsert: true,
      cacheControl: '31536000' // 1 year cache
    });
  if (error) {
    console.error(`   ⚠️  Storage upload failed: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(destPath);
  return data.publicUrl;
}

/**
 * Fetch one page of strains from TerpScout.
 */
async function fetchTerpScoutPage(page, take = 24) {
  const url = `${TERPSCOUT_BASE}?page=${page}&take=${take}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GreenLogImporter/1.0)' },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`TerpScout ${res.status} for skip=${skip}`);
  const json = await res.json();
  return {
    strains: json.strains || [],
    total: json.total || 0,
    page: json.page || 1,
    totalPages: json.totalPages || 1
  };
}

/**
 * Map a TerpScout strain to GreenLog strains table fields.
 */
function mapStrain(strain, canonicalImageUrl) {
  // Normalize type: TerpScout uses uppercase HYBRID/SATIVA/INDICA
  const typeMap = { HYBRID: 'hybrid', SATIVA: 'sativa', INDICA: 'indica' };
  const type = typeMap[strain.type?.toUpperCase()] || 'hybrid';

  // Map terpenes: TerpScout has {name, level} objects
  const terpenes = Array.isArray(strain.terpenes)
    ? strain.terpenes.map(t => t.name).filter(Boolean)
    : [];

  // Map flavors and effects
  const flavors = Array.isArray(strain.flavors)
    ? strain.flavors.map(f => f.name || f).filter(Boolean)
    : [];
  const effects = Array.isArray(strain.effects)
    ? strain.effects.map(e => e.name || e).filter(Boolean)
    : [];

  // Guard: thc_min must not exceed thc_max
  let thcMin = strain.thcMin ?? null;
  const thcMax = strain.thcMax ?? null;
  if (thcMin !== null && thcMax !== null && thcMin > thcMax) {
    thcMin = thcMax; // swap: min becomes max
  }

  // CBD fallback: if null, leave as null (publish gate allows null CBD)
  let cbdMin = strain.cbdMin ?? null;
  const cbdMax = strain.cbdMax ?? null;
  if (cbdMin !== null && cbdMax !== null && cbdMin > cbdMax) {
    cbdMin = cbdMax;
  }

  // Source attribution
  const imageAttribution = {
    source: 'TerpScout',
    original_url: strain.imageUrl || null,
    sources: strain.sources || []
  };

  return {
    name: strain.name,
    slug: strain.slug || slugify(strain.name),
    type,
    thc_min: thcMin,
    thc_max: thcMax,
    cbd_min: cbdMin,
    cbd_max: cbdMax,
    description: strain.description || '',
    terpenes,
    flavors,
    effects,
    image_url: canonicalImageUrl,
    canonical_image_path: canonicalImageUrl, // mirrors image_url for now
    image_attribution: imageAttribution,
    publication_status: canonicalImageUrl ? 'review' : 'draft',
    primary_source: 'TerpScout',
    source_notes: [
      strain.lineage ? `Lineage: ${strain.lineage}` : null,
      strain.breeder ? `Breeder: ${strain.breeder}` : null,
      strain.growDifficulty ? `Grow difficulty: ${strain.growDifficulty}` : null,
    ].filter(Boolean).join(' | ') || null,
    created_by: null, // system import
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌿 TerpScout → GreenLog Importer');
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log('');

  // Test Supabase connection
  if (!dryRun) {
    const { error: sbError } = await supabase.from('strains').select('id').limit(1);
    if (sbError) {
      console.error('❌  Supabase connection failed:', sbError.message);
      process.exit(1);
    }
    console.log('✅  Supabase connected');
  }

  // Ensure storage bucket exists (no-op if already exists)
  // Note: requires service role with storage admin permissions

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let totalImagesMirrored = 0;
  let totalImagesSkipped = 0;
  let page = 1;
  const take = 24;

  while (true) {
    process.stdout.write(`\n📄 Fetching TerpScout page ${page}... `);
    let pageData;
    try {
      pageData = await fetchTerpScoutPage(page, take);
    } catch (err) {
      console.error(`\n❌  Fetch failed: ${err.message}`);
      process.exit(1);
    }

    const { strains, total, totalPages } = pageData;
    if (strains.length === 0) {
      console.log('No more strains — done.');
      break;
    }
    console.log(`${strains.length} strains (total: ${total}, pages: ${totalPages})`);

    for (const strain of strains) {
      if (dryRun) {
        console.log(`   [DRY] Would import: ${strain.name} (${strain.slug})`);
        totalImported++;
        continue;
      }

      // 1. Check duplicate by slug
      const { data: existing } = await supabase
        .from('strains')
        .select('id, slug')
        .eq('slug', strain.slug)
        .maybeSingle();

      if (existing) {
        totalSkipped++;
        process.stdout.write('s');
        continue;
      }

      // 2. Mirror image to Supabase Storage
      let canonicalImageUrl = null;
      if (strain.imageUrl) {
        process.stdout.write('🖼');
        const buffer = await downloadImage(strain.imageUrl);
        if (buffer) {
          // Path: strain-images/{slug}.{ext}
          const ext = strain.imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
          const extClean = ['jpg','jpeg','png','webp','gif'].includes(ext) ? ext : 'jpg';
          const storagePath = `${strain.slug}.${extClean}`;
          canonicalImageUrl = await uploadToSupabase(buffer, storagePath);
          if (canonicalImageUrl) {
            totalImagesMirrored++;
            process.stdout.write('✅');
          } else {
            process.stdout.write('⚠️');
            totalImagesSkipped++;
          }
        } else {
          process.stdout.write('❌');
          totalImagesSkipped++;
        }
      } else {
        process.stdout.write('-');
        totalImagesSkipped++;
      }

      // 3. Map and insert
      const mapped = mapStrain(strain, canonicalImageUrl);
      const { error: insertError } = await supabase.from('strains').insert(mapped);

      if (insertError) {
        console.error(`\n   ⚠️  Insert failed for ${strain.name}: ${insertError.message}`);
        totalFailed++;
      } else {
        totalImported++;
        if (totalImported % 50 === 0) {
          console.log(`\n   📊 Progress: ${totalImported} imported, ${totalSkipped} skipped, ${totalFailed} failed`);
        }
        process.stdout.write('✓');
      }
    }

    // Safety: stop after all pages or hard page limit
    if (page >= totalPages || page > 3000 || page > pageLimit) {
      console.log('\n✅ All pages fetched.');
      break;
    }
    page++;
  }

  console.log('\n');
  console.log('═'.repeat(50));
  console.log('📦 Import Summary');
  console.log('═'.repeat(50));
  console.log(`   ✅ Imported:  ${totalImported}`);
  console.log(`   ⏭️  Skipped:   ${totalSkipped} (duplicates)`);
  console.log(`   ❌ Failed:    ${totalFailed}`);
  console.log(`   🖼  Images mirrored:  ${totalImagesMirrored}`);
  console.log(`   🖼  Images skipped:  ${totalImagesSkipped}`);
  console.log('═'.repeat(50));

  if (!dryRun && totalImported > 0) {
    console.log('\n💡 Strains with mirrored images are set to `review` status.');
    console.log('   Others are `draft`. Run publish gate evaluation to promote them.');
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
