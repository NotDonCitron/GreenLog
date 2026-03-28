import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { readLockFile, writeLockFile, markProcessed, markFailed, isProcessed } from './lib/lock-file.mjs';
import { tryLeafly, tryWikileaf, getPicsumUrl } from './lib/strain-scrapers.mjs';
import { downloadImage } from './lib/download-image.mjs';
import { uploadToStorage } from './lib/upload-to-storage.mjs';

const LOCK_FILE_PATH = path.join(process.cwd(), 'scripts/.image-pipeline-lock.json');
const TMP_DIR = path.join(process.cwd(), 'scripts/.tmp-images');

// CLI flags
const args = process.argv.slice(2);
const newOnly = args.includes('--new');
const force = args.includes('--force');

// Ensure tmp dir exists
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Initialize lock file if it doesn't exist
if (!fs.existsSync(LOCK_FILE_PATH)) {
  writeLockFile({ lastRun: null, processed: [], failed: [] });
}

// Supabase client (service role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// DB query for strains
async function getStrains() {
  // Exclude custom strains - they keep their user-uploaded images
  let query = supabase
    .from('strains')
    .select('id, slug, name, image_url')
    .eq('is_custom', false);

  if (newOnly) {
    query = query.or('image_url.is.null,image_url.like.%placeholder%');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Update strain image_url in DB
async function updateStrainImageUrl(strainId, imageUrl) {
  const { error } = await supabase
    .from('strains')
    .update({ image_url: imageUrl })
    .eq('id', strainId);
  if (error) throw error;
}

async function main() {
  const strains = await getStrains();
  console.log(`\nFound ${strains.length} strain(s) to process\n`);

  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const strain of strains) {
    const { slug, name, image_url } = strain;

    // Skip check: if not force and already processed, skip
    if (!force && isProcessed(slug)) {
      console.log(`  Skipping: ${slug} (${name}) — already processed`);
      skippedCount++;
      continue;
    }

    console.log(`  Processing: ${slug} (${name})`);

    try {
      let imageUrl = null;
      let source = null;

      // Step 1: Try Leafly
      process.stdout.write(`    → Leafly... `);
      const leaflyResult = await tryLeafly(slug, name);
      if (leaflyResult) {
        imageUrl = leaflyResult.url;
        source = 'leafly';
        console.log(`OK (${imageUrl.substring(0, 60)}...)`);
      } else {
        console.log(`not found`);
      }

      // Step 2: Try Wikileaf if Leafly failed
      if (!imageUrl) {
        process.stdout.write(`    → Wikileaf... `);
        const wikileafResult = await tryWikileaf(slug, name);
        if (wikileafResult) {
          imageUrl = wikileafResult.url;
          source = 'wikileaf';
          console.log(`OK (${imageUrl.substring(0, 60)}...)`);
        } else {
          console.log(`not found`);
        }
      }

      // Step 3: Fallback to Picsum if both failed
      if (!imageUrl) {
        process.stdout.write(`    → Picsum fallback... `);
        imageUrl = getPicsumUrl(slug);
        source = 'picsum';
        console.log(`OK (${imageUrl})`);
      }

      // Step 4: Download image
      const tmpPath = path.join(TMP_DIR, `${slug}.jpg`);
      process.stdout.write(`    → Downloading... `);
      const downloadResult = downloadImage(imageUrl, tmpPath);
      if (!downloadResult.success) {
        throw new Error(`Download failed: ${downloadResult.reason}`);
      }
      console.log(`OK`);

      // Step 5: Upload to storage
      process.stdout.write(`    → Uploading to Storage... `);
      const uploadResult = await uploadToStorage(tmpPath, slug);
      if (!uploadResult.success) {
        throw new Error(`Upload failed: ${uploadResult.error}`);
      }
      const publicUrl = uploadResult.publicUrl;
      console.log(`OK (${publicUrl.substring(0, 60)}...)`);

      // Step 6: Update DB
      process.stdout.write(`    → Updating DB... `);
      await updateStrainImageUrl(strain.id, publicUrl);
      console.log(`OK`);

      // Step 7: Cleanup tmp file after successful upload
      try { fs.unlinkSync(tmpPath); } catch {}

      // Step 8: Mark as processed
      markProcessed(slug);

      console.log(`  ✅ Done!\n`);
      successCount++;

    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}\n`);
      markFailed(slug, err.message);
      failedCount++;
    }

    // Rate limiting between strains: 500ms
    await sleep(500);
  }

  console.log(`\n========== SUMMARY ==========`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed:  ${failedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`============================\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
