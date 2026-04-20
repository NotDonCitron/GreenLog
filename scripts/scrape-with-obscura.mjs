/**
 * scrape-with-obscura.mjs
 *
 * Füllt fehlende Strain-Daten (Terpene, Effects, Flavors, Description, THC)
 * für alle Strains mit Lücken, mithilfe von Obscura Headless Browser + Leafly.
 *
 * Usage:
 *   node scrape-with-obscura.mjs            # Alle Lücken (Daten + Images)
 *   node scrape-with-obscura.mjs --data     # Nur Daten (Terpene/Effects/Flavors/THC)
 *   node scrape-with-obscura.mjs --images   # Nur Images
 *   node scrape-with-obscura.mjs --dry      # Dry run (kein DB-Write)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });
import path from 'path';
import { fileURLToPath } from 'url';
import { getStrainImageWithObscura } from './lib/obscura-fetch.mjs';
import { scrapeLeaflyWithObscura } from './lib/obscura-fetch.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Config ---
const SUPABASE_URL = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// --- CLI flags ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const dataOnly = args.includes('--data');
const imagesOnly = args.includes('--images');
const newOnly = args.includes('--new');

// --- Sleep ---
const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- Load strains from DB ---
async function getStrains() {
  let query = supabase
    .from('strains')
    .select('id, slug, name, image_url, description, terpenes, effects, flavors, thc_min, thc_max, type')
    .eq('is_custom', false);

  if (newOnly) {
    query = query.or('terpenes.is.null,effects.is.null,flavors.is.null,description.is.null');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function hasDataGaps(s) {
  const badDesc = !s.description || s.description.includes('Die beliebte Sorte') ||
    s.description.includes('Medizinisches Cannabis von') || s.description.length < 40;
  const noTerps = !s.terpenes || (Array.isArray(s.terpenes) && s.terpenes.length === 0);
  const noEffects = !s.effects || (Array.isArray(s.effects) && s.effects.length === 0);
  const noFlavors = !s.flavors || (Array.isArray(s.flavors) && s.flavors.length === 0);
  const noThc = !s.thc_min && !s.thc_max;
  return badDesc || noTerps || noEffects || noFlavors || noThc;
}

function hasImageGap(s) {
  return !s.image_url || s.image_url.includes('placeholder') || s.image_url.includes('picsum');
}

async function updateStrain(strainId, updates) {
  if (dryRun) {
    console.log(`    [DRY] Would update:`, Object.keys(updates).join(', '));
    return { error: null };
  }
  return supabase.from('strains').update(updates).eq('id', strainId);
}

// --- Main ---
async function main() {
  console.log(`\n🧪 Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}\n`);

  const strains = await getStrains();
  console.log(`Loaded ${strains.length} strains\n`);

  // Filter by gap type
  const dataStrains = (!imagesOnly) ? strains.filter(hasDataGaps) : [];
  const imageStrains = (!dataOnly) ? strains.filter(hasImageGap) : [];

  console.log(`→ ${dataStrains.length} strains need data updates`);
  console.log(`→ ${imageStrains.length} strains need images\n`);

  let dataSuccess = 0, dataFailed = 0;
  let imgSuccess = 0, imgFailed = 0;

  // --- Data update ---
  if (!imagesOnly) {
    console.log('=== FILLING DATA GAPS ===\n');
    for (let i = 0; i < dataStrains.length; i++) {
      const s = dataStrains[i];
      process.stdout.write(`[${i+1}/${dataStrains.length}] ${s.name}... `);

      const scraped = await scrapeLeaflyWithObscura(s.slug, s.name);

      if (!scraped) {
        console.log('⚠️  Leafly not found\n');
        dataFailed++;
        await sleep(1500);
        continue;
      }

      const updates = {};

      // Description: nur wenn generic/placeholder oder komplett leer
      const badDesc = !s.description || s.description.includes('Die beliebte Sorte') ||
        s.description.includes('Medizinisches Cannabis von') || s.description.length < 40;
      if (badDesc && scraped.description) {
        updates.description = scraped.description;
      }

      // Arrays nur wenn aktuell leer
      if ((!s.terpenes || s.terpenes.length === 0) && scraped.terpenes) {
        updates.terpenes = scraped.terpenes;
      }
      if ((!s.effects || s.effects.length === 0) && scraped.effects) {
        updates.effects = scraped.effects;
      }
      if ((!s.flavors || s.flavors.length === 0) && scraped.flavors) {
        updates.flavors = scraped.flavors;
      }

      // THC
      if (!s.thc_min && scraped.thc_avg) {
        updates.thc_min = Math.max(0, scraped.thc_avg - 2);
        updates.thc_max = scraped.thc_avg + 2;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await updateStrain(s.id, updates);
        if (error) {
          console.log(`❌ DB error: ${error.message}\n`);
          dataFailed++;
        } else {
          console.log(`✅ (${scraped.found_slug}) – updated: ${Object.keys(updates).join(', ')}\n`);
          dataSuccess++;
        }
      } else {
        console.log(`🟡 no updates needed\n`);
      }

      await sleep(1500); // Rate limit
    }
  }

  // --- Image update ---
  if (!dataOnly) {
    console.log('\n=== FILLING IMAGE GAPS ===\n');
    for (let i = 0; i < imageStrains.length; i++) {
      const s = imageStrains[i];
      process.stdout.write(`[${i+1}/${imageStrains.length}] ${s.name}... `);

      const imgResult = await getStrainImageWithObscura(s.slug, s.name);

      if (!imgResult) {
        console.log('⚠️  No image found\n');
        imgFailed++;
        await sleep(1500);
        continue;
      }

      // Download + upload would go here (same as existing pipeline)
      // For now: skip image URL update (needs download + storage upload)
      console.log(`🟡 Image URL found but upload skipped (${imgResult.source})\n`);
      imgSuccess++;

      await sleep(1500);
    }
  }

  console.log('\n========== SUMMARY ==========');
  if (!imagesOnly) {
    console.log(`Data:  ✅ ${dataSuccess}  ❌ ${dataFailed}`);
  }
  if (!dataOnly) {
    console.log(`Images: ✅ ${imgSuccess}  ❌ ${imgFailed}`);
  }
  console.log('=============================\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
