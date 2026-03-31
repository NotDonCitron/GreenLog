// scripts/fill-missing-strain-images.mjs
// Upload local strain images to Supabase Storage and update DB image_url
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PUBLIC_STRAINS_DIR = path.join(process.cwd(), 'public', 'strains');
const RATE_LIMIT_MS = 500; // Half second between uploads to avoid rate limits

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getMissingStrains() {
  const { data } = await supabase
    .from('strains')
    .select('id, slug, name')
    .is('image_url', null);
  return data || [];
}

async function getLocalImages() {
  const files = fs.readdirSync(PUBLIC_STRAINS_DIR)
    .filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i));

  const images = {};
  files.forEach(f => {
    const slug = f.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    // Handle duplicate extensions gracefully
    if (!images[slug]) {
      images[slug] = {
        filename: f,
        fullPath: path.join(PUBLIC_STRAINS_DIR, f)
      };
    }
  });
  return images;
}

async function uploadToStorage(localPath, slug) {
  // Validate slug
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    return { success: false, error: 'Invalid slug' };
  }

  const ext = path.extname(localPath);
  const fileName = `${slug}${ext}`;
  const fileBuffer = fs.readFileSync(localPath);

  const { data, error } = await supabase.storage
    .from('strains')
    .upload(fileName, fileBuffer, {
      contentType: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
      upsert: true,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  const { data: urlData } = supabase.storage
    .from('strains')
    .getPublicUrl(fileName);

  return { success: true, publicUrl: urlData.publicUrl };
}

async function updateDBImageUrl(strainId, publicUrl) {
  const { error } = await supabase
    .from('strains')
    .update({ image_url: publicUrl })
    .eq('id', strainId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

async function main() {
  console.log('=== Fill Missing Strain Images ===\n');

  // Get strains missing images
  const missingStrains = await getMissingStrains();
  console.log('Strains missing images in DB:', missingStrains.length);

  // Get local images
  const localImages = await getLocalImages();
  console.log('Local images found:', Object.keys(localImages).length);

  // Build slug -> strain map
  const strainBySlug = {};
  missingStrains.forEach(s => { strainBySlug[s.slug] = s; });

  // Find matches
  const matches = [];
  Object.entries(localImages).forEach(([slug, img]) => {
    if (strainBySlug[slug]) {
      matches.push({
        strain: strainBySlug[slug],
        image: img
      });
    }
  });

  console.log('\\nMatchable strains (local image → DB entry):', matches.length);
  console.log('Unmatchable local images:', Object.keys(localImages).length - matches.length);
  console.log('Unmatchable DB strains (no local image):', missingStrains.length - matches.length);

  if (matches.length === 0) {
    console.log('\\nNothing to do!');
    return;
  }

  // Process matches
  console.log('\n--- Uploading images to Supabase Storage ---\n');

  const stats = { uploaded: 0, skipped: 0, failed: 0 };
  const lockFile = 'scripts/.fill-missing-images-lock.json';

  // Load lock file if exists
  let processed = {};
  try {
    processed = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    console.log('Resuming from lock file:', Object.keys(processed).length, 'already processed');
  } catch {}

  for (const { strain, image } of matches) {
    if (processed[strain.slug]) {
      console.log(`  Skip (already done): ${strain.name}`);
      stats.skipped++;
      continue;
    }

    console.log(`  ${strain.name} (${strain.slug})...`);

    try {
      // Upload to Supabase Storage
      const uploadResult = await uploadToStorage(image.fullPath, strain.slug);

      if (!uploadResult.success) {
        console.log(`    Upload failed: ${uploadResult.error}`);
        processed[strain.slug] = { status: 'failed', error: uploadResult.error };
        fs.writeFileSync(lockFile, JSON.stringify(processed, null, 2));
        stats.failed++;
        continue;
      }

      // Update DB
      const dbResult = await updateDBImageUrl(strain.id, uploadResult.publicUrl);

      if (!dbResult.success) {
        console.log(`    DB update failed: ${dbResult.error}`);
        processed[strain.slug] = { status: 'failed', error: 'DB: ' + dbResult.error };
        fs.writeFileSync(lockFile, JSON.stringify(processed, null, 2));
        stats.failed++;
        continue;
      }

      console.log(`    OK: ${uploadResult.publicUrl.substring(0, 80)}...`);
      processed[strain.slug] = { status: 'done', url: uploadResult.publicUrl };
      fs.writeFileSync(lockFile, JSON.stringify(processed, null, 2));
      stats.uploaded++;

    } catch (err) {
      console.log(`    Error: ${err.message}`);
      processed[strain.slug] = { status: 'failed', error: err.message };
      fs.writeFileSync(lockFile, JSON.stringify(processed, null, 2));
      stats.failed++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log('\n=== Final Stats ===');
  console.log('Uploaded:', stats.uploaded);
  console.log('Skipped (already done):', stats.skipped);
  console.log('Failed:', stats.failed);
  console.log('\nLock file:', lockFile);
}

main().catch(console.error);
