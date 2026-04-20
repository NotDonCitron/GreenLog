/**
 * kushy-direct-import.mjs
 *
 * Importiert Strains direkt aus der kushy-strains.csv — KEIN scraping nötig!
 * Sofort 9524 Strains in der DB.
 *
 * Was importiert wird:
 *   name, slug, type, effects, flavors, genetics_cross, breeder
 *
 * Was später von Leafly kommt:
 *   thc, description, terpenes, terpenes_percent, image_url
 *
 * Quality filter: Nur strains mit min. type + effects ODER breeder ODER genetics
 * (verhindert leere Einträge)
 *
 * Usage:
 *   node scripts/kushy-direct-import.mjs --dry              # Test (kein DB-Write)
 *   node scripts/kushy-direct-import.mjs --limit 500       # Test mit 500
 *   node scripts/kushy-direct-import.mjs                    # Vollständiger Import
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.join(process.cwd());
const CSV_PATH = path.join(PROJECT_ROOT, 'kushy-strains.csv');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry');
const LIMIT = parseNumberArg('--limit', 0);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing env vars:');
    console.error('   export NEXT_PUBLIC_SUPABASE_URL=https://uwjyvvvykyueuxtdkscs.supabase.co');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY=...');
    process.exit(1);
}

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

function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current.trim());
    return fields;
}

function parseKushyCSV() {
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ kushy-strains.csv not found at ${CSV_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = content.split('\n');
    const header = parseCSVLine(lines[0]);

    const col = {};
    header.forEach((name, i) => { col[name] = i; });

    const strains = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const fields = parseCSVLine(lines[i]);
        const get = (name) => {
            const idx = col[name];
            return idx !== undefined ? (fields[idx] || '') : '';
        };

        const name = get('name');
        if (!name || name === 'NULL' || name.length < 2) continue;
        if (/^\d+$/.test(name)) continue;  // pure numeric = skip

        // Type: only accept real cannabis types
        const rawType = (get('type') || '').toLowerCase().trim();
        const typeMap = {
            'hybrid': 'hybrid',
            'sativa': 'sativa',
            'indica': 'indica',
            'hybrid,indica': 'hybrid',
            'indica,hybrid': 'hybrid',
            'sativa,hybrid': 'sativa',
        };
        const type = typeMap[rawType] || null;

        // Effects: comma-separated string → array
        const rawEffects = get('effects') || '';
        const effects = rawEffects && rawEffects !== 'NULL'
            ? rawEffects.split(',').map(e => e.trim()).filter(e => e.length > 1 && e.length < 30).slice(0, 8)
            : [];

        // Flavors: comma-separated
        const rawFlavors = get('flavor') || '';
        const flavors = rawFlavors && rawFlavors !== 'NULL'
            ? rawFlavors.split(',').map(e => e.trim()).filter(e => e.length > 1 && e.length < 30).slice(0, 6)
            : [];

        // Genetics crosses
        const crosses = get('crosses') || '';
        const genetics_cross = crosses && crosses !== 'NULL' && crosses.length < 500 ? crosses : null;

        // Breeder
        const breeder = get('breeder') || '';
        const breeder_clean = (breeder && breeder !== 'NULL' && breeder.length < 100) ? breeder : null;

        // Slug: from kushy slug column if valid, else from name
        const kushySlug = get('slug') || '';
        const slugBase = (kushySlug && kushySlug !== 'NULL' && kushySlug.length < 100 && /^[a-z0-9-]+$/.test(kushySlug.toLowerCase()))
            ? kushySlug
            : name;

        const slug = slugBase.toLowerCase()
            .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (!slug || slug.length < 2) continue;

        // Quality gate: strain braucht min. type ODER effects ODER genetics ODER breeder
        const hasData = (type !== null) || (effects.length > 0) || (genetics_cross !== null) || (breeder_clean !== null);
        if (!hasData) continue;

        strains.push({
            name: name.trim(),
            slug,
            type,
            effects,
            flavors,
            genetics_cross,
            breeder: breeder_clean,
            seed_type: breeder_clean ? 'seed' : null,
            // THC/description/terpenes/image_url = null (kommt von Leafly)
            // thc_min/thc_max werden von Leafly Scraping gefüllt
            thc_min: null,
            thc_max: null,
            cbd_min: null,
            cbd_max: null,
            description: '',
            terpenes: [],
            image_url: null,
        });
    }

    return strains;
}

async function main() {
    console.log('\n🌿 Kushy Direct Import');
    console.log('='.repeat(50));
    if (DRY_RUN) console.log('⚠️  DRY RUN\n');

    // Load CSV
    console.log('📂 Lade kushy-strains.csv...');
    const allStrains = parseKushyCSV();
    console.log(`   ${allStrains.length} qualifizierte Strains\n`);

    // Stats
    let byType = { hybrid: 0, sativa: 0, indica: 0, null_type: 0 };
    let withEffects = 0, withFlavors = 0, withGenetics = 0, withBreeder = 0;
    for (const s of allStrains) {
        byType[s.type || 'null_type']++;
        if (s.effects.length > 0) withEffects++;
        if (s.flavors.length > 0) withFlavors++;
        if (s.genetics_cross) withGenetics++;
        if (s.breeder) withBreeder++;
    }

    console.log('📊 Kushy CSV Qualität:');
    console.log(`   Strains gesamt:     ${allStrains.length}`);
    console.log(`   Typ vorhanden:     ${allStrains.length - byType.null_type} (Hybrid/Sativa/Indica)`);
    console.log(`   Effects vorhanden: ${withEffects} (${(withEffects/allStrains.length*100).toFixed(1)}%)`);
    console.log(`   Flavors vorhanden: ${withFlavors} (${(withFlavors/allStrains.length*100).toFixed(1)}%)`);
    console.log(`   Genetics vorhanden:${withGenetics}`);
    console.log(`   Breeder vorhanden: ${withBreeder} (${(withBreeder/allStrains.length*100).toFixed(1)}%)`);
    console.log('');
    console.log('📊 Type-Verteilung:');
    console.log(`   Hybrid: ${byType.hybrid}`);
    console.log(`   Indica: ${byType.indica}`);
    console.log(`   Sativa: ${byType.sativa}`);
    console.log(`   Unknown: ${byType.null_type}`);

    // Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('\n📊 Lade vorhandene Strains aus DB...');
    const { data: existing } = await supabase.from('strains').select('name, slug');
    const existingNames = new Set((existing || []).map(s => s.name.toLowerCase()));
    const existingSlugs = new Set((existing || []).map(s => s.slug.toLowerCase()));
    const newStrains = allStrains.filter(s =>
        !existingNames.has(s.name.toLowerCase()) &&
        !existingSlugs.has(s.slug.toLowerCase())
    );
    console.log(`   ${existingNames.size} bereits in DB`);
    console.log(`   ${newStrains.length} neue Strains\n`);

    if (LIMIT > 0) {
        newStrains.splice(LIMIT);
        console.log(`🔢 Limit: ${LIMIT} Strains\n`);
    }

    if (DRY_RUN) {
        console.log('📋 Dry Run — erste 10 Strains:');
        newStrains.slice(0, 10).forEach(s => {
            const type = s.type || '?';
            const eff = s.effects.slice(0, 3).join(', ') || 'no effects';
            const br = s.breeder || '';
            console.log(`   ${s.name.padEnd(28)} | ${type.padEnd(8)} | ${eff.padEnd(30)} | ${br}`);
        });
        console.log(`\n   ...und ${newStrains.length - 10} weitere`);
        return;
    }

    // Batch insert
    console.log(`🚀 Importiere ${newStrains.length} Strains in Batches von 100...`);
    const BATCH = 100;
    let imported = 0, skipped = 0, errors = 0;
    const start = Date.now();

    for (let i = 0; i < newStrains.length; i += BATCH) {
        const batch = newStrains.slice(i, i + BATCH);
        const { data, error } = await supabase.from('strains').insert(batch).select('id');

        if (error) {
            console.error(`   ❌ Batch ${i}-${i+batch.length}: ${error.message}`);
            // Fallback: one by one
            for (const strain of batch) {
                const { error: e } = await supabase.from('strains').insert(strain);
                if (e) {
                    if (e.code === '23505') skipped++;
                    else { errors++; }
                } else {
                    imported++;
                    if (imported % 200 === 0) console.log(`   ✅ ${imported} imported...`);
                }
            }
        } else {
            imported += (data || []).length;
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.log(`   ✅ Batch ${Math.floor(i/BATCH)+1}: ${(data||[]).length} imported (${elapsed}s elapsed)`);
        }
    }

    const totalSecs = ((Date.now() - start) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT REPORT');
    console.log('='.repeat(50));
    console.log(`✅ Importiert:  ${imported}`);
    console.log(`🔄 Übersprungen: ${skipped} (bereits vorhanden)`);
    console.log(`❌ Fehler:      ${errors}`);
    console.log(`⏱  Zeit:        ${totalSecs}s`);
    console.log(`📊 Rate:        ${(imported / parseFloat(totalSecs)).toFixed(1)} strains/sec`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
