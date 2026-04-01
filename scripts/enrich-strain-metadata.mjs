// scripts/enrich-strain-metadata.mjs
// Enriches strains with THC/CBD/CBG data from Leafly dataset (Oct 2021)
// Run: node scripts/enrich-strain-metadata.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load env from .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envFile = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  }
} catch (e) {
  // No .env.local, rely on actual env vars
}

// Supabase config from env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Load Leafly data
const leaflyData = JSON.parse(readFileSync('./leafly-strain-data.json', 'utf-8'));
const leaflyMap = new Map(leaflyData.map(s => [s.slug, s]));

// Load missing strains list
let missingSlugs;
try {
  const missingData = JSON.parse(readFileSync('./strains-without-images.json', 'utf-8'));
  missingSlugs = new Set(missingData.map(n => n.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')));
} catch {
  // If file doesn't exist, enrich all strains that match Leafly
  missingSlugs = null;
  console.log('No missing-strains list found — will enrich all matching strains');
}

async function getAllStrains() {
  const { data, error } = await supabase
    .from('strains')
    .select('id, name, slug, avg_thc, avg_cbd');

  if (error) {
    console.error('Error fetching strains:', error);
    process.exit(1);
  }
  return data;
}

async function updateStrain(id, updates) {
  const { error } = await supabase
    .from('strains')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error(`Error updating ${id}:`, error.message);
    return false;
  }
  return true;
}

async function main() {
  console.log('🚀 Starting strain metadata enrichment...\n');

  const strains = await getAllStrains();
  console.log(`📋 Total strains in DB: ${strains.length}`);

  let matched = 0, updated = 0, skipped = 0, errors = 0;
  const results = { updated: [], failed: [], skipped: [] };

  for (const strain of strains) {
    // Skip if missing-strains list exists and this strain isn't in it
    if (missingSlugs && !missingSlugs.has(strain.slug)) {
      skipped++;
      continue;
    }

    const leafly = leaflyMap.get(strain.slug);
    if (!leafly) {
      skipped++;
      continue;
    }

    matched++;

    const thc = leafly.cannabinoids?.thc?.percentile50;
    const cbd = leafly.cannabinoids?.cbd?.percentile50;
    const cbg = leafly.cannabinoids?.cbg?.percentile50;
    const genetics = leafly.crosses || leafly.breeder || null;
    const type = leafly.category?.toLowerCase();

    // Only update if we have meaningful data
    const hasCannabinoidData = (thc !== null && thc !== undefined) ||
                                (cbd !== null && cbd !== undefined) ||
                                (cbg !== null && cbg !== undefined);

    if (!hasCannabinoidData && !genetics) {
      results.skipped.push(strain.slug);
      skipped++;
      continue;
    }

    const updates = {};
    if (thc !== null && thc !== undefined && thc > 0) updates.avg_thc = thc;
    if (cbd !== null && cbd !== undefined && cbd > 0) updates.avg_cbd = cbd;
    if (genetics) updates.genetics = genetics;
    if (type && ['indica', 'sativa', 'hybrid', 'ruderalis'].includes(type)) {
      updates.type = type;
    }

    const success = await updateStrain(strain.id, updates);
    if (success) {
      updated++;
      results.updated.push({ slug: strain.slug, updates });
      console.log(`  ✅ ${strain.slug}: THC=${thc ?? '-'} CBD=${cbd ?? '-'} CBG=${cbg ?? '-'} genetics=${genetics ?? '-'}`);
    } else {
      errors++;
      results.failed.push(strain.slug);
    }
  }

  console.log(`\n📊 RESULTS:`);
  console.log(`  ✅ Matched: ${matched}`);
  console.log(`  🔄 Updated: ${updated}`);
  console.log(`  ⏭️  Skipped (no Leafly data): ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);

  if (results.updated.length > 0) {
    console.log(`\n✅ Sample updated strains:`);
    results.updated.slice(0, 5).forEach(s => console.log(`  - ${s.slug}:`, JSON.stringify(s.updates)));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed updates:`);
    results.failed.forEach(s => console.log(`  - ${s}`));
  }
}

main().catch(console.error);
