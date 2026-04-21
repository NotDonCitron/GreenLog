#!/usr/bin/env node
/**
 * audit-published-strains.mjs
 *
 * Analysiert alle 'published' Strains und zeigt Qualitätsprobleme.
 *
 * Usage:
 *   node scripts/audit-published-strains.mjs              # Alle analysieren
 *   node scripts/audit-published-strains.mjs --demote      # Falscher auf 'draft' zurücksetzen
 *   node scripts/audit-published-strains.mjs --delete       # Falscher löschen
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
const DRY_RUN = !args.includes('--demote') && !args.includes('--delete');
const MODE = args.includes('--delete') ? 'delete' : args.includes('--demote') ? 'demote' : 'dry';
const MIN_SCORE = parseInt(args.find(a => a.startsWith('--min-score='))?.split('=')[1] || '5', 10);

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

function isEmptyArray(val) {
  return !val || (Array.isArray(val) && val.length === 0);
}

function calculateScore(strain) {
  let score = 0;
  if (strain.name?.trim()) score += 1;
  if (strain.type?.trim()) score += 1;
  if (!isPlaceholderImage(strain.image_url)) score += 3;
  if (strain.description && strain.description.trim().length >= 20) score += 3;
  if (!isEmptyArray(strain.terpenes)) score += 2;
  if (!isEmptyArray(strain.effects)) score += 2;
  if (!isEmptyArray(strain.flavors)) score += 2;
  if (strain.thc_min != null || strain.thc_max != null) score += 2;
  if (strain.cbd_min != null || strain.cbd_max != null) score += 1;
  return score;
}

async function main() {
  console.log('');
  console.log('🔍 Published Strains Audit');
  console.log('='.repeat(60));
  console.log(`Mode: ${MODE === 'dry' ? '🔍 DRY RUN' : MODE === 'demote' ? '⚠️  DEMOTE to draft' : '💀 DELETE'}`);
  console.log(`Min Quality Score: ${MIN_SCORE}`);
  console.log('');

  // Fetch all published strains
  const pageSize = 1000;
  let offset = 0;
  let allStrains = [];

  while (true) {
    const { data, error } = await supabase
      .from('strains')
      .select('id, name, slug, type, description, image_url, terpenes, effects, flavors, thc_min, thc_max, cbd_min, cbd_max, publication_status, is_custom, primary_source, quality_score, created_at')
      .eq('publication_status', 'published')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('❌ DB Error:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allStrains.push(...data);
    offset += pageSize;
  }

  console.log(`📊 Gefundene published Strains: ${allStrains.length}`);
  console.log('');

  const scored = allStrains.map(s => ({
    ...s,
    score: calculateScore(s),
  }));

  const lowQuality = scored.filter(s => s.score < MIN_SCORE);
  const okQuality = scored.filter(s => s.score >= MIN_SCORE);

  // Show distribution
  const scoreDist = {};
  for (let i = 0; i <= 15; i++) scoreDist[i] = 0;
  scored.forEach(s => {
    const bucket = Math.min(s.score, 15);
    scoreDist[bucket] = (scoreDist[bucket] || 0) + 1;
  });

  console.log('📈 Score-Verteilung (published):');
  Object.entries(scoreDist)
    .filter(([, v]) => v > 0)
    .forEach(([score, count]) => {
      const bar = '█'.repeat(Math.min(count, 50));
      console.log(`   Score ${score.toString().padStart(2)}: ${count.toString().padStart(4)} ${bar}`);
    });
  console.log('');

  console.log(`⚠️  Low Quality (< ${MIN_SCORE}): ${lowQuality.length}`);
  console.log(`✅ OK Quality (>= ${MIN_SCORE}): ${okQuality.length}`);
  console.log('');

  // Show sample of low quality
  if (lowQuality.length > 0) {
    console.log(`🗑️  Low Quality Beispiele (erste 15):`);
    lowQuality.slice(0, 15).forEach(s => {
      const hasImg = !isPlaceholderImage(s.image_url) ? '✅ Bild' : '❌ Kein Bild';
      const hasDesc = s.description && s.description.length >= 20 ? '✅ Desc' : '❌ Keine Desc';
      const hasThc = s.thc_min != null || s.thc_max != null ? '✅ THC' : '❌ Kein THC';
      console.log(`   ${s.name.padEnd(30)} | score=${s.score} | ${hasImg} | ${hasDesc} | ${hasThc} | slug=${s.slug}`);
    });
    if (lowQuality.length > 15) {
      console.log(`   ... und ${lowQuality.length - 15} weitere`);
    }
    console.log('');
  }

  // Specific gap analysis
  const noImage = scored.filter(s => isPlaceholderImage(s.image_url));
  const noDesc = scored.filter(s => !s.description || s.description.length < 20);
  const noThc = scored.filter(s => s.thc_min == null && s.thc_max == null);
  const noEffects = scored.filter(s => isEmptyArray(s.effects));
  const noTerp = scored.filter(s => isEmptyArray(s.terpenes));

  console.log('📊 Lücken-Analyse (published):');
  console.log(`   ❌ Kein Bild:      ${noImage.length}`);
  console.log(`   ❌ Keine Beschr.:  ${noDesc.length}`);
  console.log(`   ❌ Kein THC:       ${noThc.length}`);
  console.log(`   ❌ Keine Effects:  ${noEffects.length}`);
  console.log(`   ❌ Keine Terpene:  ${noTerp.length}`);
  console.log('');

  if (MODE === 'dry') {
    console.log('🔍 DRY RUN — keine Änderungen.');
    console.log('');
    console.log(`💡 Mit --demote zurück auf 'draft' setzen:`);
    console.log(`   node scripts/audit-published-strains.mjs --demote`);
    console.log(`💡 Mit --delete löschen:`);
    console.log(`   node scripts/audit-published-strains.mjs --delete`);
    console.log(`💡 Min-Score anpassen:`);
    console.log(`   node scripts/audit-published-strains.mjs --demote --min-score=6`);
    console.log('');
    console.log(`📝 ${lowQuality.length} published Strains haben Score < ${MIN_SCORE} und würden demoted/gelöscht.`);
    return;
  }

  if (lowQuality.length === 0) {
    console.log('✅ Keine low-quality Strains gefunden.');
    return;
  }

  if (MODE === 'demote') {
    console.log(`⚠️  Setze ${lowQuality.length} Strains auf 'draft'...`);
    let demoted = 0;
    let failed = 0;

    for (const strain of lowQuality) {
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
    console.log(`   Übrig published: ${allStrains.length - demoted}`);
    console.log('');
  }

  if (MODE === 'delete') {
    console.log(`💀 Lösche ${lowQuality.length} low-quality Strains...`);
    let deleted = 0;
    let failed = 0;
    const batchSize = 100;
    const idsToDelete = lowQuality.map(s => s.id);

    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const { error } = await supabase.from('strains').delete().in('id', batch);

      if (error) {
        console.error(`   ❌ Batch fehlgeschlagen: ${error.message}`);
        failed += batch.length;
      } else {
        deleted += batch.length;
        if (deleted % 100 === 0) console.log(`   ✅ ${deleted} gelöscht...`);
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('💀 DELETE ABGESCHLOSSEN');
    console.log(`   Gelöscht: ${deleted}`);
    console.log(`   Failed:   ${failed}`);
    console.log(`   Übrig published: ${allStrains.length - deleted}`);
    console.log('');
  }
}

main().catch(err => {
  console.error('💀 Fatal:', err);
  process.exit(1);
});
