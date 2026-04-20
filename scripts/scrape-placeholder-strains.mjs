/**
 * scrape-placeholder-strains.mjs
 * Retries scraping for 20 strains that still have "Die beliebte Sorte" placeholder.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });
import { createClient } from '@supabase/supabase-js';
import { scrapeLeaflyWithObscura } from './lib/obscura-fetch.mjs';

const supabase = createClient(
  'https://uwjyvvvykyueuxtdkscs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Get all placeholder strains
const { data: strains } = await supabase
  .from('strains')
  .select('id, name, slug')
  .eq('is_custom', false)
  .like('description', '%Die beliebte Sorte%');

console.log(`\n🔄 Retrying ${strains?.length} placeholder strains...\n`);

let success = 0, failed = 0, alreadyOk = 0;

for (let i = 0; i < strains?.length; i++) {
  const s = strains[i];
  process.stdout.write(`[${i+1}/${strains.length}] ${s.name}... `);

  const scraped = await scrapeLeaflyWithObscura(s.slug, s.name);

  if (!scraped) {
    console.log('⚠️  Leafly not found\n');
    failed++;
    await sleep(2000);
    continue;
  }

  const updates = {};
  if (scraped.description && !scraped.description.includes('Die beliebte Sorte')) {
    updates.description = scraped.description;
  }
  if (scraped.terpenes) updates.terpenes = scraped.terpenes;
  if (scraped.effects) updates.effects = scraped.effects;
  if (scraped.flavors) updates.flavors = scraped.flavors;
  if (scraped.thc_avg && scraped.thc_avg > 0) {
    updates.thc_min = Math.max(0, scraped.thc_avg - 2);
    updates.thc_max = scraped.thc_avg + 2;
  }

  if (Object.keys(updates).length === 0) {
    console.log('🟡 no data from Leafly\n');
    failed++;
    await sleep(2000);
    continue;
  }

  const { error } = await supabase
    .from('strains')
    .update(updates)
    .eq('id', s.id);

  if (error) {
    console.log(`❌ DB error: ${error.message}\n`);
    failed++;
  } else {
    console.log(`✅ (${scraped.found_slug}) – ${Object.keys(updates).join(', ')}\n`);
    success++;
  }

  await sleep(2000);
}

console.log(`\n========== SUMMARY ==========`);
console.log(`Success: ${success}  |  Failed: ${failed}  |  Total: ${strains?.length}`);
console.log('=============================\n');