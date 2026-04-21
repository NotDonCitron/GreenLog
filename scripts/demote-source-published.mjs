#!/usr/bin/env node
/**
 * demote-source-published.mjs
 *
 * Setzt published Strains einer bestimmten Source auf 'draft' zurück.
 * Ideal, um fehlerhafte Import-Wellen (z.B. kushy-csv) aus der
 * öffentlichen Sichtbarkeit zu entfernen.
 *
 * Usage:
 *   node scripts/demote-source-published.mjs --dry --source=kushy-csv
 *   node scripts/demote-source-published.mjs --execute --source=kushy-csv
 *   node scripts/demote-source-published.mjs --dry --no-image              # alle ohne Bild
 *   node scripts/demote-source-published.mjs --execute --source=pharmacy --no-image
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local'), override: false });

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');
const SOURCE = args.find(a => a.startsWith('--source='))?.split('=')[1] || null;
const NO_IMAGE = args.includes('--no-image');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isPlaceholderImage(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return lower.includes('placeholder') || lower.includes('picsum') || lower.includes('dummy');
}

async function main() {
  console.log('');
  console.log('🔙 Demote Published Strains');
  console.log('='.repeat(60));
  console.log(`Mode:    ${DRY_RUN ? '🔍 DRY RUN' : '⚠️  EXECUTE'}`);
  if (SOURCE) console.log(`Source:  ${SOURCE}`);
  if (NO_IMAGE) console.log(`Filter:  ❌ Kein Bild`);
  console.log('');

  let offset = 0;
  const pageSize = 1000;
  let all = [];

  while (true) {
    let query = supabase
      .from('strains')
      .select('id, name, slug, primary_source, image_url, description, thc_min, thc_max, created_at')
      .eq('publication_status', 'published');

    if (SOURCE) query = query.eq('primary_source', SOURCE);

    const { data, error } = await query.range(offset, offset + pageSize - 1);

    if (error) { console.error('❌ DB Error:', error.message); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    offset += pageSize;
  }

  let toDemote = all;
  if (NO_IMAGE) {
    toDemote = toDemote.filter(s => isPlaceholderImage(s.image_url));
  }

  console.log(`📊 Gefunden: ${all.length} published Strains${SOURCE ? ` (source=${SOURCE})` : ''}`);
  console.log(`🎯 Zu demoten: ${toDemote.length}${NO_IMAGE ? ' (kein Bild)' : ''}`);
  console.log('');

  if (toDemote.length === 0) {
    console.log('✅ Nichts zu demoten.');
    return;
  }

  console.log('📋 Erste 10:');
  toDemote.slice(0, 10).forEach(s => {
    const hasImg = isPlaceholderImage(s.image_url) ? '❌ Kein Bild' : '✅ Bild';
    const hasDesc = s.description && s.description.length >= 20 ? '✅ Desc' : '❌ Keine Desc';
    const hasThc = s.thc_min != null || s.thc_max != null ? '✅ THC' : '❌ Kein THC';
    console.log(`   ${s.name.padEnd(30)} | ${hasImg} | ${hasDesc} | ${hasThc} | ${s.created_at?.slice(0, 10) || '?'}`);
  });
  if (toDemote.length > 10) {
    console.log(`   ... und ${toDemote.length - 10} weitere`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — keine Änderungen.');
    console.log('');
    console.log(`💡 Führe aus mit --execute:`);
    console.log(`   node scripts/demote-source-published.mjs --execute ${SOURCE ? `--source=${SOURCE}` : ''}${NO_IMAGE ? ' --no-image' : ''}`);
    console.log('');
    return;
  }

  // EXECUTE
  console.log(`⚠️  Setze ${toDemote.length} Strains auf 'draft'...`);
  let demoted = 0;
  let failed = 0;

  for (const strain of toDemote) {
    const { error } = await supabase
      .from('strains')
      .update({ publication_status: 'draft' })
      .eq('id', strain.id);

    if (error) {
      console.error(`   ❌ ${strain.name}: ${error.message}`);
      failed++;
    } else {
      demoted++;
      if (demoted % 100 === 0) console.log(`   ✅ ${demoted} demoted...`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ DEMOTE ABGESCHLOSSEN');
  console.log(`   Demoted: ${demoted}`);
  console.log(`   Failed:  ${failed}`);
  console.log(`   Verbleibend published: ${all.length - demoted}`);
  console.log('');
}

main().catch(err => {
  console.error('💀 Fatal:', err);
  process.exit(1);
});
