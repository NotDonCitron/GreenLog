#!/usr/bin/env node
/**
 * StrainDB Mass Discovery + Import
 * Fetches ALL strain slugs from strain-database.com API and imports missing ones.
 *
 * Usage: node scripts/straindb-mass-import.mjs [--apply] [--limit=N] [--delay=ms]
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes('--apply');
const LIMIT = parseInt(ARGS.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);
const DELAY_MS = parseInt(ARGS.find(a => a.startsWith('--delay='))?.split('=')[1] || '2000', 10);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchStrainDbSlugs() {
  const allSlugs = [];
  let offset = 0;
  const pageSize = 100;
  let emptyCount = 0;

  console.log('📥 Fetching all strain slugs from strain-database.com...');

  while (emptyCount < 3) {
    try {
      const res = await fetch(`https://strain-database.com/api/strains?limit=${pageSize}&offset=${offset}`, {
        headers: { 'User-Agent': 'GreenLogImporter/1.0', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        console.warn(`  Offset ${offset}: HTTP ${res.status}`);
        emptyCount++;
        offset += pageSize;
        await sleep(1000);
        continue;
      }

      const data = await res.json();
      const strains = Array.isArray(data) ? data : data.strains || [];

      if (strains.length === 0) {
        emptyCount++;
        console.log(`  Offset ${offset}: empty (${emptyCount}/3)`);
      } else {
        emptyCount = 0;
        const slugs = strains.map(s => s.slug || s.name).filter(Boolean);
        allSlugs.push(...slugs);
        process.stdout.write(`\r  Fetched: ${allSlugs.length} slugs (offset ${offset})`);
      }
    } catch (err) {
      console.warn(`\n  Offset ${offset}: error - ${err.message}`);
      emptyCount++;
    }

    offset += pageSize;
    await sleep(DELAY_MS);
  }

  console.log(`\n✅ Total unique slugs: ${[...new Set(allSlugs)].length}`);
  return [...new Set(allSlugs)];
}

async function getExistingSlugs() {
  console.log('\n📊 Loading existing slugs from database...');
  const { data, error } = await sb.from('strains').select('slug');
  if (error) {
    console.error('Error:', error.message);
    return new Set();
  }
  const slugs = new Set(data.map(s => s.slug));
  console.log(`   ${slugs.size} strains already in DB`);
  return slugs;
}

async function main() {
  console.log('=== StrainDB Mass Discovery ===\n');
  console.log(`Mode: ${APPLY ? 'APPLY (will import)' : 'DRY-RUN (no DB changes)'}`);
  console.log(`Delay: ${DELAY_MS}ms`);
  console.log(`Limit: ${LIMIT || 'unlimited'}\n`);

  const [strainDbSlugs, existingSlugs] = await Promise.all([
    fetchStrainDbSlugs(),
    getExistingSlugs()
  ]);

  const missing = strainDbSlugs.filter(s => !existingSlugs.has(s));
  console.log(`\n🎯 Missing strains: ${missing.length} / ${strainDbSlugs.length}`);

  if (LIMIT > 0 && missing.length > LIMIT) {
    console.log(`   Limiting to first ${LIMIT}`);
  }

  const targetSlugs = LIMIT > 0 ? missing.slice(0, LIMIT) : missing;

  if (targetSlugs.length === 0) {
    console.log('\n✨ All StrainDB strains are already imported!');
    return;
  }

  console.log(`\n📋 Ready to import: ${targetSlugs.length} strains`);

  // Save missing slugs to file for batch import
  const fs = await import('fs');
  const missingFile = '/tmp/straindb-missing-slugs.txt';
  fs.writeFileSync(missingFile, targetSlugs.join('\n'));
  console.log(`💾 Saved to: ${missingFile}`);

  if (APPLY) {
    console.log('\n🚀 Starting batch import via import-straindb-review.mjs...');
    const { execSync } = await import('child_process');

    // Split into batches of 25
    const batchSize = 25;
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < targetSlugs.length; i += batchSize) {
      const batch = targetSlugs.slice(i, i + batchSize);
      const slugsArg = batch.join(',');

      console.log(`\n[${i+1}/${targetSlugs.length}] Importing batch of ${batch.length}...`);

      try {
        const output = execSync(
          `node scripts/import-straindb-review.mjs --apply --slugs="${slugsArg}" --delay=2000`,
          { encoding: 'utf8', timeout: 300000, cwd: process.cwd() }
        );
        const importedMatch = output.match(/Imported:\s+(\d+)/);
        const failedMatch = output.match(/Failed:\s+(\d+)/);
        imported += parseInt(importedMatch?.[1] || '0', 10);
        failed += parseInt(failedMatch?.[1] || '0', 10);
      } catch (err) {
        console.error(`   Batch failed: ${err.message}`);
        failed += batch.length;
      }

      if (i + batchSize < targetSlugs.length) {
        await sleep(DELAY_MS);
      }
    }

    console.log(`\n✅ DONE: ${imported} imported, ${failed} failed`);
  } else {
    console.log('\n💡 Run with --apply to import these strains.');
    console.log(`   Or: node scripts/import-straindb-review.mjs --apply --slugs=$(cat ${missingFile} | paste -sd "," -)`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
