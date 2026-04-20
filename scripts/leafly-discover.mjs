/**
 * leafly-discover.mjs
 *
 * Finds new strains on Leafly via search/browse and imports complete ones.
 *
 * Usage:
 *   node scripts/leafly-discover.mjs --dry --limit 50
 *   node scripts/leafly-discover.mjs --dry --prefix wedding --limit 20
 */

import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PROJECT_ROOT = '/home/phhttps/Dokumente/Greenlog/GreenLog';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

const DRY_RUN = process.argv.includes('--dry');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || process.argv[process.argv.indexOf('--limit') + 1]) || 0;
const PREFIX_IDX = process.argv.indexOf('--prefix');
const PREFIX = PREFIX_IDX !== -1 ? (process.argv[PREFIX_IDX + 1]?.startsWith('--') ? null : process.argv[PREFIX_IDX + 1]) : null;
const BROWSER_TIMEOUT_MS = 45000;
const DELAY_MS = 1500;

const TMP_DIR = path.join(PROJECT_ROOT, 'tmp');
const DISCOVER_CACHE = path.join(TMP_DIR, 'leafly-discover-slugs.json');
const NOT_FOUND_CACHE = path.join(TMP_DIR, 'leafly-not-found-cache.json');

function ensureTmpDir() { fs.mkdirSync(TMP_DIR, { recursive: true }); }
function loadJson(fp, fb) {
    try { return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf8')) : fb; }
    catch { return fb; }
}
function saveJson(fp, d) {
    ensureTmpDir();
    fs.writeFileSync(fp, JSON.stringify(d, null, 2));
}

function parseNumberArg(name, fallback) {
    const eq = process.argv.find(a => a.startsWith(`${name}=`));
    if (eq) { const v = Number(eq.split('=').slice(1).join('=')); return Number.isFinite(v) ? v : fallback; }
    const idx = process.argv.indexOf(name);
    if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
        const v = Number(process.argv[idx + 1]); return Number.isFinite(v) ? v : fallback;
    }
    return fallback;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Slug normalization (shared with scraper)
// ---------------------------------------------------------------------------
const SLUG_MAPPING = {
    'gg4': 'gorilla-glue-4', 'gsc': 'girl-scout-cookies', 'gdp': 'granddaddy-purple',
    'og': 'og-kush', 'og kush': 'og-kush', 'sour diesel': 'sour-diesel',
    'ak47': 'ak-47', 'white widow': 'white-widow', 'northern lights': 'northern-lights',
    'purple haze': 'purple-haze', 'jack herer': 'jack-herer',
    'la confidential': 'la-confidential', 'pineapple express': 'pineapple-express',
    'sunset sherbert': 'sunset-sherbert', 'gmo': 'gmo-cookies', 'gmo cookies': 'gmo-cookies',
};

function normalizeSlug(input) {
    if (!input) return '';
    return String(input).trim().toLowerCase().normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ')
        .replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function canonicalSeed(input) {
    const base = normalizeSlug(input);
    return base ? normalizeSlug(SLUG_MAPPING[base] || base) : '';
}

// ---------------------------------------------------------------------------
// Obscura CLI
// ---------------------------------------------------------------------------
async function obscuraFetch(url, evalCode) {
    const cmd = `obscura fetch "${url}" --dump text --wait-until networkidle --wait 10 --eval ${JSON.stringify(evalCode)}`;
    const { stdout } = await execAsync(cmd, {
        cwd: PROJECT_ROOT, shell: '/bin/bash', timeout: BROWSER_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
}

// ---------------------------------------------------------------------------
// Scrape one strain (reused from chatgptscraper)
// ---------------------------------------------------------------------------
async function scrapeStrain(slug) {
    const url = `https://leafly.com/strains/${slug}`;
    try {
        const raw = await obscuraFetch(url, `JSON.stringify({nextData:document.getElementById('__NEXT_DATA__')?.textContent||'',path:location.pathname})`);
        let parsed;
        try { parsed = JSON.parse(raw); } catch { return { status: 'BAD_NEXT_DATA', slug, error: 'parse failed' }; }
        const { nextData, path: pagePath } = parsed;
        let data;
        try { data = JSON.parse(nextData); } catch { return { status: 'BAD_NEXT_DATA', slug, error: 'nextData parse failed' }; }
        const strain = data?.props?.pageProps?.strain;
        if (!strain?.name) return { status: 'NO_STRAIN', slug };
        const terpsRaw = strain?.terps || {};
        const terps = [];
        for (const [k, v] of Object.entries(terpsRaw)) {
            if (v && typeof v === 'object' && v.name) {
                terps.push({ name: v.name, score: typeof v.score === 'number' ? Number(v.score.toFixed(4)) : null });
            }
        }
        terps.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
        const toSorted = (obj, lim) => {
            if (!obj || typeof obj !== 'object') return [];
            return Object.entries(obj).sort((a, b) => ((b[1]?.score ?? 0) - (a[1]?.score ?? 0))).map(([k]) => k).filter(Boolean).slice(0, lim);
        };
        const effects = toSorted(strain.effects, 5);
        const flavors = toSorted(strain.flavors, 3);
        let description = strain.descriptionPlain || '';
        if (!description && strain.description) description = String(strain.description).replace(/<[^>]+>/g, '').trim();
        let category = String(strain.category || 'hybrid').toLowerCase();
        if (!['indica', 'sativa', 'hybrid', 'ruderalis'].includes(category)) category = 'hybrid';
        const thcP50 = strain?.cannabinoids?.thc?.percentile50 ?? null;
        const imageCandidates = [];
        if (Array.isArray(strain.highlightedPhotos)) for (const p of strain.highlightedPhotos) if (p?.imageUrl) imageCandidates.push(p.imageUrl);
        if (strain.nugImage) imageCandidates.push(strain.nugImage);
        if (strain.flowerImagePng) imageCandidates.push(strain.flowerImagePng);
        let imageUrl = '';
        for (const img of imageCandidates) {
            if (img && !/(?:default\.png|placeholder|fallback|no[-_]?image|blank|coming[-_]?soon)/i.test(img)) { imageUrl = img; break; }
        }
        const slugMatch = pagePath?.match(/\/strains\/([^/?#]+)/);
        const canonicalSlug = slugMatch ? slugMatch[1] : slug;
        return {
            status: 'OK', slug, canonicalSlug,
            name: strain.name, type: category,
            thc_p50: thcP50, thc_min: thcP50 ? Number((thcP50 - 2).toFixed(1)) : null,
            thc_max: thcP50 ? Number((thcP50 + 2).toFixed(1)) : null,
            terpenes: terps, effects, flavors,
            description: description || null,
            image_url: imageUrl || null,
            has_real_image: Boolean(imageUrl),
        };
    } catch (e) {
        return { status: 'ERROR', slug, error: e.message };
    }
}

function isComplete(s) {
    if (!s?.name) return { complete: false, reason: 'no name' };
    if (!s?.thc_p50 || s.thc_p50 <= 0) return { complete: false, reason: 'no valid THC' };
    if (!s?.has_real_image) return { complete: false, reason: 'no real image' };
    if (!s?.terpenes || s.terpenes.length < 1) return { complete: false, reason: 'terpenes incomplete' };
    if (!s?.effects || s.effects.length < 1) return { complete: false, reason: 'no effects' };
    if (!s?.flavors || s.flavors.length < 1) return { complete: false, reason: 'no flavors' };
    return { complete: true };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------
async function loadExistingSlugs() {
    const { data } = await supabase.from('strains').select('slug');
    return new Set((data || []).map(r => normalizeSlug(r.slug)));
}

async function insertStrain(s) {
    if (DRY_RUN) { console.log(`    [DRY] Would insert: ${s.name}`); return { ok: true }; }
    const { error } = await supabase.from('strains').insert({
        name: s.name, slug: s.canonicalSlug, type: s.type,
        thc_min: s.thc_min, thc_max: s.thc_max,
        terpenes: s.terpenes, effects: s.effects, flavors: s.flavors,
        description: s.description, image_url: s.image_url, source: 'leafly',
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

// ---------------------------------------------------------------------------
// Step 1: Discover slugs via Leafly search
// ---------------------------------------------------------------------------
async function discoverSlugs(prefix) {
    const searchUrl = prefix
        ? `https://leafly.com/strains?search=${encodeURIComponent(prefix)}`
        : `https://leafly.com/strains`;
    const raw = await obscuraFetch(searchUrl, `Array.from(document.querySelectorAll('a[href*="/strains/"]')).map(a=>a.getAttribute('href')).filter((h,i,s)=>s.indexOf(h)===i&&h.match(/^\\/strains\\/[a-z0-9-]+$/)).map(h=>h.replace('/strains/','')).join(',')`);
    const slugs = raw.split(',').map(s => s.trim()).filter(s => s && s !== 'lists');
    return [...new Set(slugs)];
}

// ---------------------------------------------------------------------------
// Step 2: Scrape + import
// ---------------------------------------------------------------------------
async function main() {
    console.log('🔍 LEAFLY DISCOVER');
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Prefix: ${PREFIX || '(all strains)'}`);
    console.log(`   Limit: ${LIMIT || 'unlimited'}\n`);

    const existingSlugs = await loadExistingSlugs();
    console.log(`   ${existingSlugs.size} strains already in DB\n`);

    const prefixList = PREFIX ? [PREFIX] : [
        'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'
    ];

    const allDiscovered = [];
    const cache = loadJson(DISCOVER_CACHE, {});

    for (const prefix of prefixList) {
        if (cache[prefix]) {
            console.log(`  [${prefix}] cached (${cache[prefix].length} slugs)`);
            allDiscovered.push(...cache[prefix]);
            continue;
        }
        process.stdout.write(`  Searching "${prefix}"... `);
        try {
            const slugs = await discoverSlugs(prefix);
            cache[prefix] = slugs;
            saveJson(DISCOVER_CACHE, cache);
            console.log(`found ${slugs.length}`);
            allDiscovered.push(...slugs);
            await sleep(DELAY_MS);
        } catch (e) {
            console.log(`error: ${e.message.slice(0, 50)}`);
        }
    }

    // Dedupe
    const allUnique = [...new Set(allDiscovered.map(canonicalSeed).filter(Boolean))];
    console.log(`\n   Total discovered: ${allUnique.length}`);

    // Filter: not in DB, not already cached as failed
    const notFoundCache = loadJson(NOT_FOUND_CACHE, {});
    const newSlugs = allUnique.filter(s => {
        if (existingSlugs.has(s)) return false;
        const cached = notFoundCache[s];
        if (cached?.lastTriedAt) {
            const age = Date.now() - new Date(cached.lastTriedAt).getTime();
            if (age < 7 * 24 * 60 * 60 * 1000) return false; // 7-day cache
        }
        return true;
    });
    console.log(`   New to try: ${newSlugs.length}\n`);

    if (!newSlugs.length) { console.log('Nothing new. Exiting.'); return; }

    const toProcess = LIMIT ? newSlugs.slice(0, LIMIT) : newSlugs;
    let imported = 0, skipped = 0, incomplete = 0, failed = 0;

    for (let i = 0; i < toProcess.length; i++) {
        const slug = toProcess[i];
        const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        process.stdout.write(`[${i + 1}/${toProcess.length}] ${displayName}... `);

        const scraped = await scrapeStrain(slug);
        await sleep(DELAY_MS);

        if (scraped.status !== 'OK') {
            console.log(`⚠️  ${scraped.status}`);
            notFoundCache[canonicalSeed(slug)] = { lastTriedAt: new Date().toISOString(), reason: scraped.status };
            failed++;
            continue;
        }

        const { complete, reason } = isComplete(scraped);
        if (!complete) {
            console.log(`⏭  incomplete (${reason})`);
            notFoundCache[canonicalSeed(slug)] = { lastTriedAt: new Date().toISOString(), reason };
            incomplete++;
            continue;
        }

        const result = await insertStrain(scraped);
        if (result.ok) {
            console.log(`✅  ${scraped.name}`);
            existingSlugs.add(canonicalSeed(slug));
            imported++;
        } else {
            console.log(`❌  DB: ${result.error}`);
            failed++;
        }
    }

    saveJson(NOT_FOUND_CACHE, notFoundCache);
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭  Skipped: ${skipped}`);
    console.log(`   ⏭  Incomplete: ${incomplete}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('='.repeat(50));
}

main().catch(e => { console.error('\nFatal:', e); process.exit(1); });
