#!/usr/bin/env node
/**
 * delete-kushy-csv.mjs
 *
 * Löscht alle Strains mit primary_source = 'kushy-csv'.
 *
 * Usage:
 *   node scripts/delete-kushy-csv.mjs --dry    # Zählen ohne löschen
 *   node scripts/delete-kushy-csv.mjs --execute # Wirklich löschen
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local'), override: false });

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('');
  console.log('🗑️  Kushy-CSV Strain Löschung');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (nur zählen)' : '⚠️  EXECUTE (wirklich löschen)'}`);
  console.log('');

  // Safety: verify count
  const { count, error: countError } = await supabase
    .from('strains')
    .select('*', { count: 'exact', head: true })
    .eq('primary_source', 'kushy-csv');

  if (countError) {
    console.error('❌ DB Error:', countError.message);
    process.exit(1);
  }

  console.log(`📊 Gefunden: ${count} Strains mit primary_source = 'kushy-csv'`);

  if (DRY_RUN) {
    console.log('');
    console.log('🔍 DRY RUN — nichts gelöscht.');
    console.log('');
    console.log('💡 Führe aus mit:');
    console.log('   node scripts/delete-kushy-csv.mjs --execute');
    return;
  }

  if (count === 0) {
    console.log('✅ Nichts zu löschen.');
    return;
  }

  // Double-check: show first 5 names
  const { data: preview } = await supabase
    .from('strains')
    .select('name, slug')
    .eq('primary_source', 'kushy-csv')
    .limit(5);

  console.log('');
  console.log('📋 Beispiele (erste 5):');
  preview.forEach(s => console.log(`   - ${s.name} (${s.slug})`));
  console.log('');

  // Fetch ALL IDs first, then delete in batches
  // (avoids offset shifting during deletion)
  console.log('📥 Sammle alle IDs...');
  let ids = [];
  let offset = 0;
  const fetchSize = 1000;

  while (true) {
    const { data: batch, error: fetchError } = await supabase
      .from('strains')
      .select('id')
      .eq('primary_source', 'kushy-csv')
      .range(offset, offset + fetchSize - 1);

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError.message);
      process.exit(1);
    }

    if (!batch || batch.length === 0) break;
    ids.push(...batch.map(s => s.id));
    offset += fetchSize;
  }

  console.log(`📥 ${ids.length} IDs gesammelt`);
  console.log(`⚠️  Lösche ${ids.length} Strains...`);

  const batchSize = 500;
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { error: deleteError } = await supabase
      .from('strains')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`   ❌ Batch ${i}-${i + batch.length}: ${deleteError.message}`);
      failed += batch.length;
    } else {
      deleted += batch.length;
      if (deleted % 1000 === 0) console.log(`   ✅ ${deleted} gelöscht...`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ LÖSCHUNG ABGESCHLOSSEN');
  console.log('='.repeat(60));
  console.log(`   Gelöscht: ${deleted}`);
  console.log(`   Fehler:   ${failed}`);
  console.log('');
}

main().catch(err => {
  console.error('💀 Fatal:', err);
  process.exit(1);
});
