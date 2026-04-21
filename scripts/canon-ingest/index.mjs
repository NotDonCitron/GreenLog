#!/usr/bin/env node

/**
 * GreenLog Canon Ingest — Main Orchestrator
 * 
 * Multi-source data ingestion engine for the Curated Strain Canon.
 * 
 * Usage:
 *   node scripts/canon-ingest/index.mjs               # Full run
 *   node scripts/canon-ingest/index.mjs --dry-run      # Validate only, no DB writes
 *   node scripts/canon-ingest/index.mjs --source=leefii  # Single source only
 * 
 * Environment:
 *   .env.local must contain NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   Each source adapter needs its own API key (see adapter files)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validatePublishGate } from './publish-gate.mjs';
import { transformRawStrain } from './transform.mjs';
import { upsertStrain } from './db.mjs';
import { IngestReport } from './report.mjs';

// Source adapters
import * as strainCompass from './sources/strain-compass.mjs';
import * as leefii from './sources/leefii.mjs';

// ── Config ──────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = 3;

// CLI flags
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SOURCE_FILTER = args.find(a => a.startsWith('--source='))?.split('=')[1] || null;

// ── Load Environment ────────────────────────────────────────────────────
function loadEnv() {
    try {
        const envPath = resolve(__dirname, '../../.env.local');
        const envFile = readFileSync(envPath, 'utf-8');
        for (const line of envFile.split('\n')) {
            if (!line || line.startsWith('#')) continue;
            const eqIdx = line.indexOf('=');
            if (eqIdx === -1) continue;
            const key = line.slice(0, eqIdx).trim();
            const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (key && !process.env[key]) process.env[key] = val;
        }
    } catch (err) {
        console.error('❌ Could not read .env.local:', err.message);
        process.exit(1);
    }
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
    loadEnv();

    // Dynamically import p-limit (ESM-only package)
    const pLimit = (await import('p-limit')).default;
    const limiter = pLimit(CONCURRENCY);

    console.log('');
    console.log('🌿 GreenLog Canon Ingest Engine v1.0');
    console.log('═'.repeat(50));
    if (DRY_RUN) console.log('🔍 DRY RUN mode — no database writes');
    console.log('');

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
    });

    // Register all source adapters
    const allSources = [strainCompass, leefii];
    const activeSources = SOURCE_FILTER
        ? allSources.filter(s => s.name === SOURCE_FILTER)
        : allSources;

    if (activeSources.length === 0) {
        console.error(`❌ Unknown source: "${SOURCE_FILTER}". Available: ${allSources.map(s => s.name).join(', ')}`);
        process.exit(1);
    }

    const report = new IngestReport();

    // Process each source
    for (const source of activeSources) {
        report.registerSource(source.name);
        console.log(`\n📡 Source: ${source.name}`);
        console.log('─'.repeat(40));

        try {
            for await (const batch of source.fetchAll(limiter)) {
                report.recordFetched(source.name, batch.length);

                // Process batch with concurrency control
                const tasks = batch.map(rawStrain =>
                    limiter(async () => {
                        try {
                            // Transform
                            const canonical = transformRawStrain(rawStrain, source.name);

                            // Validate through Publish Gate
                            const gate = validatePublishGate(canonical);

                            if (!gate.passed) {
                                report.recordRejected(source.name, gate.reasons);
                                return;
                            }

                            report.recordPassed(source.name);

                            // Upsert to DB (skip in dry-run)
                            if (!DRY_RUN) {
                                const result = await upsertStrain(supabase, canonical);

                                if (result.action === 'inserted') {
                                    report.recordInserted(source.name);
                                } else if (result.action === 'updated') {
                                    report.recordUpdated(source.name);
                                } else if (result.action === 'error') {
                                    report.recordError(source.name, result.error, canonical.name);
                                }
                            } else {
                                // In dry-run, count as would-be-inserted
                                report.recordInserted(source.name);
                            }
                        } catch (err) {
                            const strainName = rawStrain?.name || 'unknown';
                            report.recordError(source.name, err.message, strainName);
                        }
                    })
                );

                await Promise.all(tasks);
            }
        } catch (err) {
            console.error(`  ❌ [${source.name}] Fatal error: ${err.message}`);
            report.recordError(source.name, `Fatal: ${err.message}`, '(source-level)');
        }
    }

    // Print report
    report.printReport();

    // Export JSON report
    if (!DRY_RUN) {
        report.exportJSON();
    }

    // Exit with error code if there were failures
    if (report.totalErrors > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('💀 Unhandled error:', err);
    process.exit(1);
});
