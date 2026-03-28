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

const RATE_LIMIT_MS = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllStrains() {
  const { data } = await supabase.from('strains').select('id, slug, name');
  return data || [];
}

async function cleanupTmp(tmpPath) {
  try { if (tmpPath) await fs.promises.unlink(tmpPath); } catch {}
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
          markProcessed(slug);
          try {
            await supabase.from('strains').update({ image_url: result.publicUrl }).eq('slug', slug);
          } catch (dbErr) {
            console.warn('    DB update failed (non-fatal):', dbErr.message);
          }
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
          markProcessed(slug);
          try {
            await supabase.from('strains').update({ image_url: result.publicUrl }).eq('slug', slug);
          } catch (dbErr) {
            console.warn('    DB update failed (non-fatal):', dbErr.message);
          }
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
          markProcessed(slug);
          try {
            await supabase.from('strains').update({ image_url: result.publicUrl }).eq('slug', slug);
          } catch (dbErr) {
            console.warn('    DB update failed (non-fatal):', dbErr.message);
          }
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

    await sleep(RATE_LIMIT_MS);
  }

  console.log('\nFinal stats:', stats);
  console.log('Lock file: scripts/.strain-image-lock.json');
  console.log('Attribution file: scripts/.image-attributions.json');
}

main().catch(console.error);
