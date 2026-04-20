/**
 * leafly-quality-scraper.mjs  [PARALLELIZED + HTTP-ONLY]
 *
 * Quality-First Leafly Scraper für GreenLog
 *
 * Strategy:
 * 1. HTTP/curl — Leafly liefert __NEXT_DATA__ direkt im SSR HTML (kein JS nötig)
 * 2. Kein Browser/Obscura — curl ist 60x schneller und ressourcenschonender
 * 3. Process bis zu CONCURRENT requests parallel via p-limit
 * 4. Nur vollständige Strains importieren (thc, description, image, effects, flavors, terpenes)
 *
 * Performance (15 strains test @ 3x concurrency, 20s timeout):
 *   OLD: sequentiell, Obscura 60s timeout, 1.5s sleep → ~90+ Sekunden
 *   NEW: curl HTTP-only, 3x parallel, kein sleep         → ~32 Sekunden (15/15 OK)
 *
 * Setup:
 *   node scripts/leafly-quality-scraper.mjs                    # full run
 *   node scripts/leafly-quality-scraper.mjs --dry            # dry run (no DB write)
 *   node scripts/leafly-quality-scraper.mjs --limit 50       # limit for testing
 *   node scripts/leafly-quality-scraper.mjs --concurrent 3   # 3 parallel workers
 *   node scripts/leafly-quality-scraper.mjs --wishlist kushy # use kushy-strains.csv
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PROJECT_ROOT = '/home/phhttps/Dokumente/Greenlog/GreenLog';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
    console.error('   export SUPABASE_URL=https://uwjyvvvykyueuxtdkscs.supabase.co');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY=...');
    process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry');
const LIMIT = parseNumberArg('--limit', 0);
const USE_WISHLIST = process.argv.includes('--wishlist');
const CONCURRENT = parseNumberArg('--concurrent', 3);  // 3 parallel — Leafly wird bei mehr parallel langsamer
const CURL_TIMEOUT = 20;   // seconds per strain (max observed: ~16s bei manchen strains)

// Quality gates - ONLY import strains that meet ALL these criteria
const QUALITY_GATES = {
    minThc: 1,
    minDescriptionLength: 100,
    requireImage: true,
    minEffects: 2,
    minFlavors: 1,
    minTerpenes: 1,
};

// Cached data paths
const TMP_DIR = path.join(PROJECT_ROOT, 'tmp');
const NOT_FOUND_CACHE = path.join(TMP_DIR, 'leafly-not-found-cache.json');
const FAILURE_LOG = path.join(TMP_DIR, 'leafly-failures.jsonl');
const QUALITY_REPORT = path.join(TMP_DIR, 'leafly-quality-report.json');
const PROGRESS_FILE = path.join(TMP_DIR, 'leafly-progress.json');

// Slug mapping for known strain name variants
const SLUG_MAPPING = {
    "gorilla-glue-4": "original-glue",
    "gg4": "original-glue",
    "gmo-cookies": "gmo-cookies",
    "gelato-33": "gelato-33",
    "wedding-cake": "wedding-cake",
    "sour-diesel": "sour-diesel",
    "og-kush": "og-kush",
    "girl-scout-cookies": "girl-scout-cookies",
    "gsc": "girl-scout-cookies",
    "sunset-sherbert": "sunset-sherbert",
    "pinea": "pineapple-express",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseNumberArg(name, fallback) {
    const eqArg = process.argv.find(a => a.startsWith(`${name}=`));
    if (eqArg) {
        const val = Number(eqArg.split('=').slice(1).join('='));
        return Number.isFinite(val) ? val : fallback;
    }
    const idx = process.argv.indexOf(name);
    if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
        const val = Number(process.argv[idx + 1]);
        return Number.isFinite(val) ? val : fallback;
    }
    return fallback;
}

function ensureTmpDir() {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

function loadJson(filePath, fallback = {}) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return fallback;
    }
}

function saveJson(filePath, data) {
    ensureTmpDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function appendJsonl(filePath, row) {
    ensureTmpDir();
    fs.appendFileSync(filePath, JSON.stringify(row) + '\n', 'utf8');
}

function normalizeSlug(name) {
    if (!name) return '';
    let base = String(name).toLowerCase().trim();
    if (SLUG_MAPPING[base]) return SLUG_MAPPING[base];
    return base
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
}

function slugVariants(name) {
    const raw = String(name || '').trim();
    const base = normalizeSlug(raw);
    if (!base) return [];
    const variants = new Set();
    variants.add(base);
    if (base.endsWith('s')) variants.add(base.slice(0, -1));
    if (!base.endsWith('s')) variants.add(base + 's');
    variants.add(base.replace(/[^a-z0-9]/g, ''));
    const first = base.split('-')[0];
    if (first && first.length > 2 && first !== base) variants.add(first);
    variants.add(base.replace(/-/g, ''));
    return [...variants].filter(v => v.length > 1);
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getExistingStrainNames() {
    const { data, error } = await supabase
        .from('strains')
        .select('name');
    if (error) {
        console.error('Error fetching existing strains:', error);
        return new Set();
    }
    return new Set((data || []).map(s => s.name.toLowerCase()));
}

function getKushyWishlist() {
    const csvPath = path.join(PROJECT_ROOT, 'kushy-strains.csv');
    if (!fs.existsSync(csvPath)) {
        console.warn('⚠️  kushy-strains.csv not found');
        return [];
    }
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').slice(1);
    const strains = [];
    for (const line of lines) {
        if (!line.trim()) continue;
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
        const name = fields[3];
        if (name && name.length > 1 && name !== 'NULL' && !/^\d+$/.test(name)) {
            strains.push(name);
        }
    }
    return strains;
}

// ---------------------------------------------------------------------------
// HTTP fetch (Leafly SSR liefert __NEXT_DATA__ direkt — kein Browser nötig)
// ---------------------------------------------------------------------------
async function httpFetchHtml(url) {
    try {
        // --compressed: Leafly sendet gzip/br, ohne decompress timed curl aus
        // --max-time: harte Grenze, execAsync timeout darüber
        const { stdout } = await execAsync(
            `curl -s --compressed --max-time ${CURL_TIMEOUT} --max-redirs 5 \
             -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" \
             -H "Accept-Language: en-US,en;q=0.9" \
             -L "${url.replace(/"/g, '\\"')}"`,
            { timeout: CURL_TIMEOUT * 1000 + 5000 }
        );
        return stdout || null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Smart fetch: HTTP only (Leafly SSR ist vollständig)
// ---------------------------------------------------------------------------
async function smartFetchHtml(url) {
    const html = await httpFetchHtml(url);
    if (html && /__NEXT_DATA__|__NEXT_QUERY_DATA__/.test(html)) {
        return html;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Parse __NEXT_DATA__ from HTML
// ---------------------------------------------------------------------------
function parseNextData(html) {
    if (!html) return null;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (!match) return null;
    try {
        return JSON.parse(match[1]);
    } catch {
        return null;
    }
}

function isPlaceholderImage(url) {
    if (!url) return true;
    return /\/defaults\//.test(url.toLowerCase());
}

function extractBestImage(strain) {
    const highlighted = strain.highlightedPhotos || [];
    for (const photo of highlighted) {
        if (photo?.imageUrl && !isPlaceholderImage(photo.imageUrl)) {
            return { url: photo.imageUrl, source: 'leafly_user' };
        }
    }
    if (strain.nugImage && !isPlaceholderImage(strain.nugImage)) {
        return { url: strain.nugImage, source: 'leafly_nug' };
    }
    if (strain.stockNugImage && !isPlaceholderImage(strain.stockNugImage)) {
        return { url: strain.stockNugImage, source: 'leafly_similar' };
    }
    return null;
}

function extractStrainData(nextData, originalSlug) {
    if (!nextData?.props?.pageProps?.strain) return null;
    const strain = nextData.props.pageProps.strain;
    const thcPercent = strain.cannabinoids?.thc?.percentile50;
    const cbdPercent = strain.cannabinoids?.cbd?.percentile50;
    const typeMap = { 'Hybrid': 'hybrid', 'Sativa': 'sativa', 'Indica': 'indica' };
    const type = typeMap[strain.category] || null;

    const effectsObj = strain.effects || {};
    const effects = Object.entries(effectsObj)
        .filter(([_, data]) => data?.score > 0.5)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 6)
        .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1));

    const flavorsObj = strain.flavors || {};
    const flavors = Object.entries(flavorsObj)
        .filter(([_, data]) => data?.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([name]) => name.replace(/([A-Z])/g, ' $1').trim());

    const terpenesObj = strain.terps || {};
    const terpenes = Object.entries(terpenesObj)
        .filter(([_, data]) => data?.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([name, data]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            percent: parseFloat((data.score * 2).toFixed(1))
        }));

    const imageData = extractBestImage(strain);
    const description = strain.descriptionPlain || strain.description?.replace(/<[^>]+>/g, '') || '';
    const slug = nextData.query?.strainSlug || originalSlug;

    return {
        name: strain.name || '',
        slug,
        type,
        thc_min: thcPercent ? parseFloat(thcPercent.toFixed(1)) : null,
        thc_max: thcPercent ? parseFloat((thcPercent + 2).toFixed(1)) : null,
        cbd_min: cbdPercent ? parseFloat(cbdPercent.toFixed(1)) : null,
        cbd_max: cbdPercent ? parseFloat((cbdPercent + 1).toFixed(1)) : null,
        description: description.slice(0, 2000),
        effects,
        flavors,
        terpenes,
        image_url: imageData?.url || '',
        image_source: imageData?.source || 'none',
        leafly_url: `https://leafly.com/strains/${slug}`,
    };
}

function checkQuality(data) {
    const issues = [];
    if (!data.thc_min || data.thc_min < QUALITY_GATES.minThc) {
        issues.push(`THC too low: ${data.thc_min}`);
    }
    if (!data.description || data.description.length < QUALITY_GATES.minDescriptionLength) {
        issues.push(`Description too short: ${data.description?.length || 0} chars`);
    }
    const acceptableSources = ['leafly_user', 'leafly_nug', 'leafly_similar'];
    if (!data.image_url || !acceptableSources.includes(data.image_source)) {
        issues.push(`No real image (source: ${data.image_source || 'none'})`);
    }
    if (!data.effects || data.effects.length < QUALITY_GATES.minEffects) {
        issues.push(`Too few effects: ${data.effects?.length || 0}`);
    }
    if (!data.flavors || data.flavors.length < QUALITY_GATES.minFlavors) {
        issues.push(`Too few flavors: ${data.flavors?.length || 0}`);
    }
    if (!data.terpenes || data.terpenes.length < QUALITY_GATES.minTerpenes) {
        issues.push(`Too few terpenes: ${data.terpenes?.length || 0}`);
    }
    return { passed: issues.length === 0, issues };
}

async function importStrain(data) {
    if (DRY_RUN) {
        return { success: true, dry_run: true };
    }
    const slug = normalizeSlug(data.name);
    const { data: result, error } = await supabase
        .from('strains')
        .insert({
            name: data.name,
            slug,
            type: data.type,
            thc_min: data.thc_min,
            thc_max: data.thc_max,
            cbd_min: data.cbd_min,
            cbd_max: data.cbd_max,
            description: data.description,
            effects: data.effects,
            flavors: data.flavors,
            terpenes: data.terpenes,
            image_url: data.image_url,
            image_attribution: { source: 'leafly', subtype: data.image_source, url: data.leafly_url },
        })
        .select()
        .single();
    if (error) {
        if (error.code === '23505') return { success: false, reason: 'duplicate' };
        return { success: false, reason: error.message };
    }
    return { success: true, id: result.id };
}

// ---------------------------------------------------------------------------
// Process a single strain
// ---------------------------------------------------------------------------
async function processStrain(strainName, existingNames, notFoundCache, stats) {
    const normalizedName = strainName.toLowerCase().trim();

    if (existingNames.has(normalizedName)) {
        stats.skipped_duplicate++;
        return null;
    }

    if (notFoundCache[normalizedName] &&
        Date.now() - notFoundCache[normalizedName] < 7 * 24 * 60 * 60 * 1000) {
        stats.skipped_not_found_cache++;
        return null;
    }

    const variants = slugVariants(strainName);
    let foundData = null;
    let foundSlug = null;
    let lastError = null;

    for (const variant of variants) {
        const url = `https://leafly.com/strains/${variant}`;
        const html = await smartFetchHtml(url);
        const nextData = parseNextData(html);

        if (!nextData || !nextData.props?.pageProps?.strain) {
            lastError = 'NO_DATA';
            continue;
        }

        const strainData = extractStrainData(nextData, variant);
        if (!strainData || !strainData.name) {
            lastError = 'PARSE_ERROR';
            continue;
        }

        foundData = strainData;
        foundSlug = variant;
        lastError = null;
        break;
    }

    if (!foundData) {
        notFoundCache[normalizedName] = Date.now();
        saveJson(NOT_FOUND_CACHE, notFoundCache);
        appendJsonl(FAILURE_LOG, {
            ts: new Date().toISOString(),
            type: 'NOT_FOUND',
            rawInput: strainName,
            candidates: variants,
            reason: lastError,
        });
        stats.not_found++;
        return null;
    }

    const quality = checkQuality(foundData);
    if (!quality.passed) {
        appendJsonl(FAILURE_LOG, {
            ts: new Date().toISOString(),
            type: 'INCOMPLETE',
            strainName: foundData.name,
            slug: foundSlug,
            issues: quality.issues,
        });
        stats.incomplete++;
        return null;
    }

    const result = await importStrain(foundData);
    if (result.success) {
        stats.imported++;
    } else if (result.reason === 'duplicate') {
        stats.skipped_duplicate++;
        existingNames.add(normalizedName);
    } else {
        appendJsonl(FAILURE_LOG, {
            ts: new Date().toISOString(),
            type: 'IMPORT_ERROR',
            strainName: foundData.name,
            slug: foundSlug,
            reason: result.reason,
        });
        stats.import_error++;
    }

    return foundData;
}

// ---------------------------------------------------------------------------
// p-limit: run N tasks concurrently
// ---------------------------------------------------------------------------
function pLimit(concurrency) {
    if (concurrency < 1) throw new RangeError('Expected concurrency to be > 0');
    const queue = [];
    let running = 0;

    function next() {
        running--;
        if (queue.length > 0) {
            const { fn, resolve, reject } = queue.shift();
            running++;
            fn().then(resolve).catch(reject).finally(next);
        }
    }

    const run = async (fn, resolve, reject) => {
        running++;
        try { resolve(await fn()); }
        catch (e) { reject(e); }
        finally { next(); }
    };

    return (fn) => new Promise((resolve, reject) => {
        if (running < concurrency) {
            run(fn, resolve, reject);
        } else {
            queue.push({ fn, resolve, reject });
        }
    });
}

// ---------------------------------------------------------------------------
// Parallel processor
// ---------------------------------------------------------------------------
async function processBatch(strains, existingNames, notFoundCache, stats) {
    const limit = pLimit(CONCURRENT);
    const start = Date.now();

    const tasks = strains.map((strainName) =>
        limit(async () => {
            const processed = stats._processed || 0;
            const result = await processStrain(strainName, existingNames, notFoundCache, stats);
            stats._processed = processed + 1;

            if (stats._processed % 10 === 0) {
                saveProgress(stats);
                const elapsed = ((Date.now() - start) / 1000).toFixed(1);
                const rate = (stats._processed / (Date.now() - start) * 1000).toFixed(1);
                process.stdout.write(
                    `\n📊 [${elapsed}s] rate: ${rate}/s | imported: ${stats.imported} | ` +
                    `not_found: ${stats.not_found} | incomplete: ${stats.incomplete}\n`
                );
            }

            if (result) {
                const imgSrc = result.image_source || 'none';
                process.stdout.write(
                    `  ✅ ${result.name} (${result.type}, THC ${result.thc_min}%, img:${imgSrc})\n`
                );
            }

            return result;
        })
    );

    return Promise.all(tasks);
}

function saveProgress(stats) {
    saveJson(PROGRESS_FILE, {
        imported: stats.imported,
        not_found: stats.not_found,
        incomplete: stats.incomplete,
        skipped_duplicate: stats.skipped_duplicate,
        skipped_not_found_cache: stats.skipped_not_found_cache,
        import_error: stats.import_error,
        processed: stats._processed || 0,
    });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    console.log('\n🌿 GreenLog Quality-First Leafly Scraper  [PARALLELIZED + HTTP-ONLY]');
    console.log('='.repeat(50));
    console.log(`   Concurrency:  ${CONCURRENT}x parallel workers`);
    console.log(`   HTTP method:  curl --compressed (Leafly liefert __NEXT_DATA__ im SSR HTML)`);
    console.log(`   Timeout:      ${CURL_TIMEOUT}s per strain\n`);

    if (DRY_RUN) {
        console.log('⚠️  DRY RUN MODE - No data will be written to database\n');
    }

    const notFoundCache = loadJson(NOT_FOUND_CACHE, {});

    console.log('📊 Checking existing strains in database...');
    const existingNames = await getExistingStrainNames();
    console.log(`   Found ${existingNames.size} existing strains\n`);

    let wishlist = [];
    if (USE_WISHLIST) {
        console.log('📋 Loading wishlist from kushy-strains.csv...');
        wishlist = getKushyWishlist();
        console.log(`   Found ${wishlist.length} strains in CSV\n`);
    } else {
        wishlist = [
            'gelato-33', 'wedding-cake', 'gorilla-glue-4', 'gmo-cookies',
            'sour-diesel', 'og-kush', 'girl-scout-cookies', 'sunset-sherbert',
            'pineapple-express', 'blue-dream', 'granddaddy-purple', 'white-widow',
            'northern-lights', 'ak-47', 'jack-herer', 'durban-poison',
            'chemdawg', 'purple-haze', 'silver-haze', 'super-lemon-haze',
            'critical-kush', 'critical-mass', 'master-kush',
        ];
        console.log(`📋 Using default popular strains list (${wishlist.length} strains)\n`);
    }

    if (LIMIT > 0) {
        wishlist = wishlist.slice(0, LIMIT);
        console.log(`🔢 Limit applied: ${LIMIT} strains\n`);
    }

    const stats = {
        total: wishlist.length,
        imported: 0,
        not_found: 0,
        incomplete: 0,
        skipped_duplicate: 0,
        skipped_not_found_cache: 0,
        import_error: 0,
        _processed: 0,
    };

    console.log(`🚀 Starting: ${stats.total} strains @ ${CONCURRENT}x concurrency\n`);

    const batchStart = Date.now();
    await processBatch(wishlist, existingNames, notFoundCache, stats);

    const elapsed = ((Date.now() - batchStart) / 1000).toFixed(1);
    const rate = (stats.total / parseFloat(elapsed)).toFixed(1);

    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL REPORT');
    console.log('='.repeat(50));
    console.log(`Total processed: ${stats.total}`);
    console.log(`✅ Imported: ${stats.imported}`);
    console.log(`❌ Not found on Leafly: ${stats.not_found}`);
    console.log(`⚠️  Incomplete data (skipped): ${stats.incomplete}`);
    console.log(`🔄 Already in DB: ${stats.skipped_duplicate}`);
    console.log(`⏭️  Skipped (cached not found): ${stats.skipped_not_found_cache}`);
    console.log(`❌ Import error: ${stats.import_error}`);
    console.log(`⏱  Total time: ${elapsed}s  (~${rate} strains/sec)`);

    const successRate = stats.total > 0 ? ((stats.imported / stats.total) * 100).toFixed(1) : 0;
    console.log(`Success rate: ${successRate}%`);

    saveJson(QUALITY_REPORT, {
        timestamp: new Date().toISOString(),
        stats,
        wishlist_size: wishlist.length,
        concurrency: CONCURRENT,
        curl_timeout: CURL_TIMEOUT,
        dry_run: DRY_RUN,
    });
    console.log(`\n💾 Report saved to: ${QUALITY_REPORT}`);
}

main().catch(console.error);
