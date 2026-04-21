#!/usr/bin/env node
/**
 * purge-empty-strains.mjs
 *
 * Analysiert die strains-Tabelle und entfernt wertlose Einträge
 * (nur Name + Typ, keine substanziellen Daten).
 *
 * Usage:
 *   node scripts/purge-empty-strains.mjs --dry          # Analyse ohne Löschen
 *   node scripts/purge-empty-strains.mjs --execute     # Wirklich löschen
 *   node scripts/purge-empty-strains.mjs --dry --limit 500
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local'), override: false });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry') || (!args.includes('--execute'));
const LIMIT = parseNumberArg('--limit', 0);

// ── PROTECTION ──
// NEVER delete legacy/base strains (the ~670 original ones).
// Only consider strains from known automatic imports for deletion.
const AUTO_IMPORT_SOURCES = new Set([
  'kushy-csv',
  'strain-compass',
  'leafly',
  'leefii',
  'cannlytics',
  'huggingface',
  'wikimedia',
  'seedbank',
  'import-new-strains',
  'import-medical-strains',
]);
const SAFE_SOURCES = new Set(['manual', 'legacy', 'seed', 'user-created', 'admin', null]);

function parseNumberArg(name, fallback) {
  const eqArg = args.find(a => a.startsWith(`${name}=`));
  if (eqArg) {
    const val = Number(eqArg.split('=').slice(1).join('='));
    return Number.isFinite(val) ? val : fallback;
  }
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    const val = Number(args[idx + 1]);
    return Number.isFinite(val) ? val : fallback;
  }
  return fallback;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
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

function classifyStrain(strain) {
  const score = calculateScore(strain);
  const isPublished = strain.publication_status === 'published' || strain.publication_status === 'locked';
  const isCustom = strain.is_custom === true;
  const source = strain.primary_source || null;

  // Protect legacy/base strains (~670 originals). Only auto-imported strains may be purged.
  const isAutoImport = AUTO_IMPORT_SOURCES.has(source);
  const isProtected = !isAutoImport || isPublished || isCustom;

  return {
    score,
    isPublished,
    isCustom,
    isAutoImport,
    isProtected,
    source,
    // Only delete auto-imported strains that are truly empty
    isWorthless: isAutoImport && score <= 2 && !isPublished && !isCustom,
    isPoor: isAutoImport && score <= 4 && !isPublished && !isCustom,
  };
}

async function main() {
  console.log('');
  console.log('🧹 GreenLog Strain Purge Tool');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (analysieren only)' : '⚠️  EXECUTE (wirklich löschen)'}`);
  console.log('');

  // Fetch strains in batches
  const pageSize = 1000;
  let offset = 0;
  let allStrains = [];

  while (true) {
    const { data, error } = await supabase
      .from('strains')
      .select('id, name, slug, type, description, image_url, terpenes, effects, flavors, thc_min, thc_max, cbd_min, cbd_max, publication_status, is_custom, primary_source, quality_score')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('❌ DB Error:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allStrains.push(...data);
    offset += pageSize;
    if (LIMIT > 0 && allStrains.length >= LIMIT) {
      allStrains = allStrains.slice(0, LIMIT);
      break;
    }
  }

  console.log(`📊 Gefundene Strains: ${allStrains.length}`);
  console.log('');

  const classified = allStrains.map(s => ({ ...s, ...classifyStrain(s) }));

  const worthless = classified.filter(s => s.isWorthless);
  const poor = classified.filter(s => s.isPoor && !s.isWorthless);
  const good = classified.filter(s => !s.isWorthless && !s.isPoor);
  const protectedStrains = classified.filter(s => s.isProtected);
  const protectedLegacy = protectedStrains.filter(s => !s.isAutoImport);

  console.log('📈 Verteilung:');
  console.log(`   🛡️  Geschützt (Legacy / Basis-Strains):        ${protectedLegacy.length}`);
  console.log(`   🔒 Geschützt (Published / Custom):           ${protectedStrains.filter(s => s.isPublished || s.isCustom).length}`);
  console.log(`   🗑️  Wertlos (Score 0-2, Auto-Import):         ${worthless.length}`);
  console.log(`   ⚠️  Arm (Score 3-4, Auto-Import):             ${poor.length}`);
  console.log(`   ✅ Gut (Score 5+):                            ${good.filter(s => !s.isProtected).length}`);
  console.log('');

  if (protectedLegacy.length > 0) {
    console.log('✅ Legacy-Strains sind geschützt und werden NICHT gelöscht.');
    console.log(`   (Primary source NICHT in: ${[...AUTO_IMPORT_SOURCES].join(', ')})`);
    console.log('');
  }

  if (worthless.length > 0) {
    console.log('🗑️  Wertlose Strains (erste 10):');
    worthless.slice(0, 10).forEach(s => {
      console.log(`   - ${s.name.padEnd(30)} | ${s.type?.padEnd(8) || '???'} | score=${s.score} | slug=${s.slug}`);
    });
    if (worthless.length > 10) {
      console.log(`   ... und ${worthless.length - 10} weitere`);
    }
    console.log('');
  }

  if (poor.length > 0) {
    console.log('⚠️  Arme Strains (Score 3-4, erste 10):');
    poor.slice(0, 10).forEach(s => {
      console.log(`   - ${s.name.padEnd(30)} | ${s.type?.padEnd(8) || '???'} | score=${s.score} | slug=${s.slug}`);
    });
    if (poor.length > 10) {
      console.log(`   ... und ${poor.length - 10} weitere`);
    }
    console.log('');
  }

  // Show score distribution
  const scoreDist = {};
  for (let i = 0; i <= 15; i++) scoreDist[i] = 0;
  classified.forEach(s => {
    const bucket = Math.min(s.score, 15);
    scoreDist[bucket] = (scoreDist[bucket] || 0) + 1;
  });

  console.log('📊 Score-Verteilung:');
  Object.entries(scoreDist)
    .filter(([, v]) => v > 0)
    .forEach(([score, count]) => {
      const bar = '█'.repeat(Math.min(count, 50));
      console.log(`   Score ${score.toString().padStart(2)}: ${count.toString().padStart(4)} ${bar}`);
    });
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — keine Daten gelöscht.');
    console.log('');
    console.log('💡 Tip: Führe mit --execute aus, um die wertlosen Strains zu löschen:');
    console.log(`   node scripts/purge-empty-strains.mjs --execute`);
    console.log('');
    console.log(`📝 Zusammenfassung: ${worthless.length} wertlose Strains würden gelöscht werden.`);
    return;
  }

  // EXECUTE MODE
  if (worthless.length === 0) {
    console.log('✅ Keine wertlosen Strains gefunden. Nichts zu löschen.');
    return;
  }

  console.log(`⚠️  Lösche ${worthless.length} wertlose Strains...`);

  let deleted = 0;
  let failed = 0;
  const batchSize = 100;
  const idsToDelete = worthless.map(s => s.id);

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const { error } = await supabase.from('strains').delete().in('id', batch);

    if (error) {
      console.error(`   ❌ Batch ${i / batchSize + 1} fehlgeschlagen: ${error.message}`);
      failed += batch.length;
    } else {
      deleted += batch.length;
      if (deleted % 500 === 0) {
        console.log(`   ✅ ${deleted} gelöscht...`);
      }
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('🧹 BEREINIGUNG ABGESCHLOSSEN');
  console.log('='.repeat(60));
  console.log(`✅ Gelöscht:     ${deleted}`);
  console.log(`❌ Fehler:       ${failed}`);
  console.log(`📊 Übrig:        ${allStrains.length - deleted}`);
  console.log('');
}

main().catch(err => {
  console.error('💀 Fatal error:', err);
  process.exit(1);
});
