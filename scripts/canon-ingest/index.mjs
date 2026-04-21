#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { transformRawStrain } from './transform.mjs';
import { mergeStrainRecords } from './merge.mjs';
import { calculateRecordScore } from './quality.mjs';
import { processImagePipeline } from './image-pipeline.mjs';
import { validatePublishGate } from './publish-gate.mjs';
import { upsertStrain, preloadExistingRows } from './db.mjs';
import { IngestReport } from './report.mjs';

import * as strainCompass from './sources/strain-compass.mjs';
import * as leefii from './sources/leefii.mjs';
import * as cannlytics from './sources/cannlytics.mjs';
import * as huggingface from './sources/huggingface.mjs';
import * as wikimedia from './sources/wikimedia.mjs';
import * as seedbank from './sources/seedbank.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = 3;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_IMAGES = args.includes('--no-images');
const SOURCE_FILTER = args.find(a => a.startsWith('--source='))?.split('=')[1] || null;
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');

function loadEnvFile(envPath) {
  try {
    const envFile = readFileSync(envPath, 'utf-8');
    for (const line of envFile.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }
    return true;
  } catch {
    return false;
  }
}

function loadEnv() {
  const baseDir = resolve(__dirname, '../..');
  loadEnvFile(resolve(baseDir, '.env'));
  loadEnvFile(resolve(baseDir, '.env.local'));
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env / .env.local');
    process.exit(1);
  }
}

async function main() {
  loadEnv();

  const pLimit = (await import('p-limit')).default;
  const limiter = pLimit(CONCURRENCY);

  console.log('');
  console.log('🌿 GreenLog Canon Ingest Engine v2.0 — Unified Pipeline');
  console.log('═'.repeat(60));
  if (DRY_RUN) console.log('🔍 DRY RUN mode — no database writes');
  if (NO_IMAGES) console.log('🖼️  Images SKIPPED');
  if (SOURCE_FILTER) console.log(`📡 Source filter: ${SOURCE_FILTER}`);
  if (LIMIT) console.log(`📄 Limit: ${LIMIT} records per source`);
  console.log('');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const storageConfig = {
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'strain-images',
  };

  const existingCache = await preloadExistingRows(supabase);

  const metadataSources = [strainCompass, leefii, cannlytics, huggingface]
    .filter(s => !SOURCE_FILTER || s.name === SOURCE_FILTER);

  const allTransformed = [];
  const report = new IngestReport();

  for (const source of metadataSources) {
    report.registerSource(source.name);
    console.log(`\n📡 Source: ${source.name} (reliability: ${source.reliability})`);
    console.log('─'.repeat(40));

    try {
      let count = 0;
      for await (const batch of source.fetchAll(limiter)) {
        const trimmed = LIMIT > 0 ? batch.slice(0, LIMIT - count) : batch;
        report.recordFetched(source.name, trimmed.length);

        for (const raw of trimmed) {
          const transformed = transformRawStrain(raw, source.name, source.reliability);
          allTransformed.push(transformed);
          count++;
        }

        if (LIMIT > 0 && count >= LIMIT) break;
      }
      console.log(`  ✓ Fetched ${count} records from ${source.name}`);
    } catch (err) {
      console.error(`  ❌ [${source.name}] Fatal: ${err.message}`);
      report.recordError(source.name, `Fatal: ${err.message}`, '(source-level)');
    }
  }

  const strainsMissingImages = allTransformed
    .filter(r => !r.image_url?.value || r.image_url.confidence === 0)
    .map(r => r.name)
    .filter(Boolean);

  const uniqueNamesMissingImages = [...new Set(strainsMissingImages)];

  if (uniqueNamesMissingImages.length > 0 && (!SOURCE_FILTER || SOURCE_FILTER === 'wikimedia')) {
    report.registerSource('wikimedia');
    console.log(`\n🖼️  Wikimedia: searching images for ${uniqueNamesMissingImages.length} strains`);
    try {
      let wikiCount = 0;
      for await (const batch of wikimedia.fetchAll(limiter, uniqueNamesMissingImages)) {
        report.recordFetched('wikimedia', batch.length);
        for (const raw of batch) {
          const transformed = transformRawStrain(raw, 'wikimedia', wikimedia.reliability);
          allTransformed.push(transformed);
          wikiCount++;
        }
      }
      console.log(`  ✓ Found ${wikiCount} Wikimedia images`);
    } catch (err) {
      console.error(`  ❌ [wikimedia] Error: ${err.message}`);
    }
  }

  if (uniqueNamesMissingImages.length > 0 && (!SOURCE_FILTER || SOURCE_FILTER === 'seedbank')) {
    report.registerSource('seedbank');
    console.log(`\n🌱 Seedbank: searching images for ${uniqueNamesMissingImages.length} strains`);
    try {
      let sbCount = 0;
      for await (const batch of seedbank.fetchAll(limiter, uniqueNamesMissingImages)) {
        report.recordFetched('seedbank', batch.length);
        for (const raw of batch) {
          const transformed = transformRawStrain(raw, 'seedbank', seedbank.reliability);
          allTransformed.push(transformed);
          sbCount++;
        }
      }
      console.log(`  ✓ Found ${sbCount} Seedbank images`);
    } catch (err) {
      console.error(`  ❌ [seedbank] Error: ${err.message}`);
    }
  }

  console.log(`\n🔀 Merging ${allTransformed.length} records...`);
  const merged = mergeStrainRecords(allTransformed);

  const totalConflicts = merged.reduce((sum, m) => sum + (m.conflicts?.length || 0), 0);
  const totalFieldsMerged = merged.reduce((sum, m) => sum + Object.keys(m.sourceProvenance || {}).length, 0);

  report.recordMergeStats({
    groupsProcessed: merged.length,
    conflictsDetected: totalConflicts,
    conflictsResolved: totalConflicts,
    fieldsMerged: totalFieldsMerged,
  });

  console.log(`  ✓ Merged into ${merged.length} unique strains (${totalConflicts} conflicts resolved)`);

  if (!NO_IMAGES && !DRY_RUN) {
    console.log(`\n🖼️  Processing images for ${merged.length} strains...`);
    for (const strain of merged) {
      const needsImage = !strain.image_url ||
        strain.image_url.includes('placeholder') ||
        strain.image_url.includes('picsum');

      const existingEntry = existingCache.slugs.get(strain.slug?.toLowerCase());
      const hasExistingLocal = existingEntry?.image_url &&
        !existingEntry.image_url?.includes('placeholder') &&
        (existingEntry.image_url?.includes('supabase') ||
         existingEntry.image_url?.includes('minio'));

      if (!needsImage || hasExistingLocal) continue;

      const imageResult = await processImagePipeline(strain, supabase, storageConfig);
      report.recordImageResult(
        imageResult.ok ? (strain.sourceProvenance?.image_url?.source || 'unknown') : 'failed',
        imageResult.ok
      );

      if (imageResult.ok) {
        strain.image_url = imageResult.publicUrl;
        strain.canonical_image_path = imageResult.storagePath;
        strain.image_attribution = imageResult.attribution;
      }
    }
  }

  console.log(`\n🚪 Running publish gate + DB upsert...`);

  for (const strain of merged) {
    const existingRow = existingCache.slugs.get(strain.slug?.toLowerCase()) ||
      existingCache.names.get(strain.normalizedName) || null;

    strain.qualityScore = calculateRecordScore(strain);

    const gate = validatePublishGate(strain, existingRow);

    if (!gate.passed) {
      report.recordRejected(strain.sourceProvenance?.type?.source || 'merged', gate.reasons);
      continue;
    }

    report.recordPassed('merged');

    if (DRY_RUN) {
      report.recordInserted('merged');
      continue;
    }

    const imageResult = strain.canonical_image_path ? {
      ok: true,
      storagePath: strain.canonical_image_path,
      publicUrl: strain.image_url,
      attribution: strain.image_attribution,
    } : null;

    const result = await upsertStrain(supabase, strain, gate, imageResult);

    if (result.action === 'inserted') {
      report.recordInserted('merged');
    } else if (result.action === 'updated') {
      report.recordUpdated('merged');
      if (gate.mode === 'partial_update') report.recordPartialUpdate();
      if (gate.mode === 'enrichment_only') report.recordEnrichment();
    } else if (result.action === 'error') {
      report.recordError('merged', result.error, strain.name);
    }
  }

  report.printReport();
  if (!DRY_RUN) report.exportJSON();

  if (report.totalErrors > 0) process.exit(1);
}

main().catch(err => {
  console.error('💀 Unhandled error:', err);
  process.exit(1);
});
