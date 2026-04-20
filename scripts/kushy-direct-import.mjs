/**
 * kushy-direct-import.mjs
 *
 * Importiert Strains direkt aus der kushy-strains.csv
 *
 * Usage:
 *   node scripts/kushy-direct-import.mjs --dry
 *   node scripts/kushy-direct-import.mjs --limit 500
 *   node scripts/kushy-direct-import.mjs
 */
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const envPath = path.join(PROJECT_ROOT, '.env');
const CSV_PATH = path.join(PROJECT_ROOT, 'kushy-strains.csv');

dotenv.config({ path: envPath });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local'), override: false });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry');
const LIMIT = parseNumberArg('--limit', 0);

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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 ENV CHECK:');
console.log('   ENV file:             ', envPath);
console.log('   SUPABASE_URL:         ', SUPABASE_URL || '❌ MISSING');
console.log(
  '   SERVICE_ROLE_KEY:     ',
  SUPABASE_SERVICE_ROLE_KEY
    ? `✅ (${SUPABASE_SERVICE_ROLE_KEY.slice(0, 12)}...)`
    : '❌ MISSING'
);
console.log('');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

// Plausibilitätscheck: echter Supabase-Key statt Platzhalter
if (
  SUPABASE_SERVICE_ROLE_KEY.includes('dein_') ||
  SUPABASE_SERVICE_ROLE_KEY.includes('your_') ||
  SUPABASE_SERVICE_ROLE_KEY.length < 20
) {
  console.error(
    '❌ SUPABASE_SERVICE_ROLE_KEY sieht nach Platzhalter oder ungültigem Wert aus'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      // escaped quote ""
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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
  const lines = content.split(/\r?\n/).filter(Boolean);

  if (lines.length === 0) {
    console.error('❌ CSV is empty');
    process.exit(1);
  }

  const header = parseCSVLine(lines[0]);
  const col = {};
  header.forEach((name, i) => {
    col[name] = i;
  });

  const strains = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = parseCSVLine(line);

    const get = (name) => {
      const idx = col[name];
      return idx !== undefined ? (fields[idx] || '').trim() : '';
    };

    const name = get('name');
    if (!name || name === 'NULL' || name.length < 2) continue;
    if (/^\d+$/.test(name)) continue;

    const rawType = get('type').toLowerCase();
    const typeMap = {
      hybrid: 'hybrid',
      sativa: 'sativa',
      indica: 'indica',
      'hybrid,indica': 'hybrid',
      'indica,hybrid': 'hybrid',
      'sativa,hybrid': 'sativa',
    };
    const type = typeMap[rawType] || null;

    const rawEffects = get('effects');
    const effects =
      rawEffects && rawEffects !== 'NULL'
        ? rawEffects
            .split(',')
            .map(e => e.trim())
            .filter(e => e.length > 1 && e.length < 30)
            .slice(0, 8)
        : [];

    const rawFlavors = get('flavor');
    const flavors =
      rawFlavors && rawFlavors !== 'NULL'
        ? rawFlavors
            .split(',')
            .map(f => f.trim())
            .filter(f => f.length > 1 && f.length < 30)
            .slice(0, 6)
        : [];

    const crosses = get('crosses');
    const genetics_cross =
      crosses && crosses !== 'NULL' && crosses.length < 500 ? crosses : null;

    const breeder = get('breeder');
    const breeder_clean =
      breeder && breeder !== 'NULL' && breeder.length < 100 ? breeder : null;

    const kushySlug = get('slug');
    const slugBase =
      kushySlug &&
      kushySlug !== 'NULL' &&
      kushySlug.length < 100 &&
      /^[a-z0-9-]+$/i.test(kushySlug)
        ? kushySlug
        : name;

    const slug = slugBase
      .toLowerCase()
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug || slug.length < 2) continue;

    const breederIsUnknown =
      breeder_clean && breeder_clean.toLowerCase() === 'unknown';

    const hasExtra =
      effects.length > 0 ||
      genetics_cross !== null ||
      (breeder_clean !== null && !breederIsUnknown);

    const hasValidType = type !== null;

    if (!hasValidType || !hasExtra) continue;

    strains.push({
      name: name.trim(),
      slug,
      type,
      effects,
      flavors,
      genetics: genetics_cross,
      brand: breeder_clean,
      thc_min: null,
      thc_max: null,
      cbd_min: null,
      cbd_max: null,
      description: '',
      terpenes: [],
      image_url: null,
      source: 'kushy-csv',
      is_custom: false,
      created_by: null,
      organization_id: null,
    });
  }

  return strains;
}

async function assertSupabaseWorks() {
  const { error } = await supabase.from('strains').select('id').limit(1);
  if (error) {
    console.error('❌ Supabase preflight failed:', error.message);
    if (error.code) console.error('   code:', error.code);
    process.exit(1);
  }
}

async function main() {
  console.log('\n🌿 Kushy Direct Import');
  console.log('='.repeat(50));
  if (DRY_RUN) console.log('⚠️  DRY RUN\n');

  console.log('🔌 Prüfe Supabase-Verbindung...');
  await assertSupabaseWorks();
  console.log('   ✅ Verbindung ok\n');

  console.log('📂 Lade kushy-strains.csv...');
  const allStrains = parseKushyCSV();
  console.log(`   ${allStrains.length} qualifizierte Strains\n`);

  const byType = { hybrid: 0, sativa: 0, indica: 0, none: 0 };
  let withEffects = 0;
  let withFlavors = 0;
  let withGenetics = 0;
  let withBreeder = 0;

  for (const s of allStrains) {
    byType[s.type || 'none']++;
    if (s.effects.length > 0) withEffects++;
    if (s.flavors.length > 0) withFlavors++;
    if (s.genetics) withGenetics++;
    if (s.brand) withBreeder++;
  }

  console.log('📊 Kushy CSV Qualität:');
  console.log(`   Strains gesamt:      ${allStrains.length}`);
  console.log(`   Typ vorhanden:       ${allStrains.length - byType.none}`);
  console.log(
    `   Effects vorhanden:   ${withEffects} (${((withEffects / allStrains.length) * 100).toFixed(1)}%)`
  );
  console.log(
    `   Flavors vorhanden:   ${withFlavors} (${((withFlavors / allStrains.length) * 100).toFixed(1)}%)`
  );
  console.log(`   Genetics vorhanden:  ${withGenetics}`);
  console.log(
    `   Brand vorhanden:     ${withBreeder} (${((withBreeder / allStrains.length) * 100).toFixed(1)}%)`
  );
  console.log('');
  console.log('📊 Type-Verteilung:');
  console.log(`   Hybrid: ${byType.hybrid}`);
  console.log(`   Indica: ${byType.indica}`);
  console.log(`   Sativa: ${byType.sativa}`);
  console.log(`   Unknown: ${byType.none}`);
  console.log('');

  console.log('📊 Lade vorhandene Strains aus DB...');
  const { data: existing, error: existingError } = await supabase
    .from('strains')
    .select('name, slug');

  if (existingError) {
    console.error('❌ DB read failed:', existingError.message);
    if (existingError.code) console.error('   code:', existingError.code);
    process.exit(1);
  }

  const existingNames = new Set((existing || []).map(s => s.name.toLowerCase()));
  const existingSlugs = new Set((existing || []).map(s => s.slug.toLowerCase()));

  // Dedupliziere auch innerhalb des CSV (gleiche Slugs droppen)
  const seenSlugs = new Set(existingSlugs);
  let newStrains = allStrains.filter(s => {
    const slugLower = s.slug.toLowerCase();
    if (seenSlugs.has(slugLower)) return false;
    if (seenSlugs.has(s.name.toLowerCase())) return false;
    if (existingNames.has(s.name.toLowerCase())) return false;
    seenSlugs.add(slugLower);
    seenSlugs.add(s.name.toLowerCase());
    return true;
  });

  console.log(`   ${existingNames.size} bereits in DB`);
  console.log(`   ${newStrains.length} neue Strains\n`);

  if (LIMIT > 0) {
    newStrains = newStrains.slice(0, LIMIT);
    console.log(`🔢 Limit aktiv: ${LIMIT} Strains\n`);
  }

  if (newStrains.length === 0) {
    console.log('✅ Nichts zu importieren');
    return;
  }

  if (DRY_RUN) {
    console.log('📋 Dry Run — erste Strains:');
    newStrains.slice(0, 10).forEach(s => {
      const type = s.type || '?';
      const eff = s.effects.slice(0, 3).join(', ') || 'no effects';
      const br = s.brand || '';
      console.log(
        `   ${s.name.padEnd(28)} | ${type.padEnd(8)} | ${eff.padEnd(30)} | ${br}`
      );
    });
    const remaining = Math.max(0, newStrains.length - 10);
    console.log(`\n   ...und ${remaining} weitere`);
    return;
  }

  console.log(`🚀 Importiere ${newStrains.length} Strains in Batches von 100...`);

  const BATCH = 100;
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const start = Date.now();

  for (let i = 0; i < newStrains.length; i += BATCH) {
    const batch = newStrains.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('strains')
      .upsert(batch, { onConflict: 'slug', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.error(
        `   ❌ Batch ${i}-${i + batch.length}: ${error.message}${error.code ? ` (${error.code})` : ''}`
      );
      // Fallback: one by one
      for (const strain of batch) {
        const { error: singleError } = await supabase
          .from('strains')
          .upsert(strain, { onConflict: 'slug', ignoreDuplicates: true });
        if (singleError) {
          if (singleError.code === '23505') {
            skipped++;
          } else {
            errors++;
            console.error(
              `      ↳ ${strain.name}: ${singleError.message}${singleError.code ? ` (${singleError.code})` : ''}`
            );
          }
        } else {
          imported++;
          if (imported % 200 === 0) {
            console.log(`   ✅ ${imported} imported...`);
          }
        }
      }
    } else {
      imported += (data || []).length;
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `   ✅ Batch ${Math.floor(i / BATCH) + 1}: ${(data || []).length} imported (${elapsed}s elapsed)`
      );
    }
  }

  const totalSecs = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT REPORT');
  console.log('='.repeat(50));
  console.log(`✅ Importiert:   ${imported}`);
  console.log(`🔄 Übersprungen: ${skipped}`);
  console.log(`❌ Fehler:       ${errors}`);
  console.log(`⏱  Zeit:         ${totalSecs}s`);
  console.log(
    `📈 Rate:         ${totalSecs === '0.0' ? imported : (imported / Number(totalSecs)).toFixed(1)} strains/sec`
  );
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
