/**
 * chatgptscraper.mjs
 *
 * Improved Leafly scraper for Greenlog using Obscura + Playwright over CDP.
 *
 * Setup:
 *   1) Start Obscura separately:
 *      obscura serve --port 9222 --stealth
 *
 *   2) Export env vars:
 *      export SUPABASE_URL=...
 *      export SUPABASE_SERVICE_ROLE_KEY=...
 *      export OBSCURA_CDP_URL=ws://127.0.0.1:9222
 *
 * Usage:
 *   node scripts/chatgptscraper.mjs
 *   node scripts/chatgptscraper.mjs --limit 50
 *   node scripts/chatgptscraper.mjs --limit=50 --dry
 *   node scripts/chatgptscraper.mjs --concurrency 3
 *   node scripts/chatgptscraper.mjs --retry-not-found
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
    throw new Error(
        'Missing env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Export them before running.'
    );
}

const DRY_RUN = process.argv.includes('--dry');
const RETRY_NOT_FOUND = process.argv.includes('--retry-not-found');

const LIMIT = parseNumberArg('--limit', 0);
const CONCURRENCY = Math.max(1, parseNumberArg('--concurrency', 3));
const DELAY_MS = Math.max(0, parseNumberArg('--delay', 1200));
const BROWSER_TIMEOUT_MS = Math.max(10000, parseNumberArg('--timeout', 60000));

const MIN_TERPENES = 1;
const MIN_EFFECTS = 1;
const MIN_FLAVORS = 1;
const REQUIRE_DESCRIPTION = false;
const MIN_DESCRIPTION_LENGTH = 100;

const TMP_DIR = path.join(PROJECT_ROOT, 'tmp');
const NOT_FOUND_CACHE_PATH = path.join(TMP_DIR, 'leafly-not-found-cache.json');
const FAILURE_LOG_PATH = path.join(TMP_DIR, 'leafly-failures.jsonl');
const NOT_FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const VALID_TYPES = new Set(['indica', 'sativa', 'hybrid', 'ruderalis']);
const PLACEHOLDER_PATTERNS = [
    /default\.png/i,
    /placeholder/i,
    /fallback/i,
    /no[-_]?image/i,
    /blank/i,
    /coming[-_]?soon/i,
];

// ---------------------------------------------------------------------------
// Helpers: args
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Helpers: file IO
// ---------------------------------------------------------------------------
function ensureTmpDir() {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

function loadJson(filePath, fallback) {
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

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Slug normalization / alias mapping
// ---------------------------------------------------------------------------
const SLUG_MAPPING = {
    'gg4': 'gorilla-glue-4',
    'gorilla-glue': 'gorilla-glue-4',
    'gsc': 'girl-scout-cookies',
    'girl-scout': 'girl-scout-cookies',
    'gdp': 'granddaddy-purple',
    'granddaddy': 'granddaddy-purple',
    'og': 'og-kush',
    'og kush': 'og-kush',
    'ogkush': 'og-kush',
    'sour diesel': 'sour-diesel',
    'sourdiesel': 'sour-diesel',
    'ak47': 'ak-47',
    'white widow': 'white-widow',
    'northern lights': 'northern-lights',
    'purple haze': 'purple-haze',
    'jack herer': 'jack-herer',
    'la confidential': 'la-confidential',
    'pineapple express': 'pineapple-express',
    'sunset sherbert': 'sunset-sherbert',
    'gmo': 'gmo-cookies',
    'gmo cookies': 'gmo-cookies',
    'do si dos': 'do-si-dos',
    'ice cream cake': 'ice-cream-cake',
    'mendo t breath': 'mendo-breath',
    'critical bilbo': 'critical-bilbo',
};

function normalizeSlug(input) {
    if (!input) return '';

    return String(input)
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/&/g, ' and ')
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function canonicalSeed(input) {
    const base = normalizeSlug(input);
    if (!base) return '';
    return normalizeSlug(SLUG_MAPPING[base] || base);
}

function getCandidateSlugs(input) {
    const raw = String(input || '').trim();
    const base = normalizeSlug(raw);
    const candidates = new Set();

    const add = value => {
        const n = normalizeSlug(value);
        if (n) candidates.add(n);
    };

    add(raw);
    add(base);

    if (SLUG_MAPPING[raw.toLowerCase().trim()]) {
        add(SLUG_MAPPING[raw.toLowerCase().trim()]);
    }
    if (SLUG_MAPPING[base]) {
        add(SLUG_MAPPING[base]);
    }

    if (base.endsWith('-strain')) add(base.replace(/-strain$/, ''));
    if (base.includes('-and-')) add(base.replace(/-and-/g, '-'));
    if (base.includes('-x-')) add(base.replace(/-x-/g, '-'));

    return [...candidates];
}

function dedupeRequestedStrains(list) {
    const seen = new Set();
    const out = [];

    for (const raw of list) {
        const key = canonicalSeed(raw);
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(raw);
    }

    return out;
}

// ---------------------------------------------------------------------------
// Obscura CLI (subprocess) — replaces playwright-core CDP for Obscura
// ---------------------------------------------------------------------------
async function obscuraFetch(url, evalCode) {
    const cmd = `obscura fetch "${url}" --dump text --wait-until networkidle --wait 10 --eval ${JSON.stringify(evalCode)}`;
    const { stdout } = await execAsync(cmd, {
        cwd: PROJECT_ROOT,
        shell: '/bin/bash',
        timeout: BROWSER_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
}

// ---------------------------------------------------------------------------
// Scrape one candidate slug from Leafly
// ---------------------------------------------------------------------------
async function scrapeCandidate(candidateSlug) {
    const url = `https://leafly.com/strains/${candidateSlug}`;

    try {
        const raw = await obscuraFetch(url, `JSON.stringify({nextData:document.getElementById('__NEXT_DATA__')?.textContent||'',path:location.pathname})`);

        if (!raw) {
            return {
                status: 'NO_NEXT_DATA',
                candidate_slug: candidateSlug,
                error: 'Empty response from obscura',
            };
        }

        const parsed = JSON.parse(raw);
        const { nextData, path: pagePath } = parsed;
        const finalPath = pagePath || '';

        let data;
        try {
            data = JSON.parse(nextData);
        } catch (e) {
            return {
                status: 'BAD_NEXT_DATA',
                candidate_slug: candidateSlug,
                error: e.message,
                raw: nextData?.slice(0, 200) || raw.slice(0, 200),
            };
        }

        const props = data?.props?.pageProps || {};
        const strain = props?.strain || null;

        if (!strain || !strain.name) {
            return {
                status: 'NO_STRAIN',
                candidate_slug: candidateSlug,
                final_path: finalPath,
            };
        }

        // Canonical slug from Leafly's page routing
        const slugMatch = finalPath.match(/\/strains\/([^/?#]+)/);
        const canonicalSlug = slugMatch ? slugMatch[1] : candidateSlug;

        // Image extraction
        const imageCandidates = [];
        const highlighted = Array.isArray(strain.highlightedPhotos) ? strain.highlightedPhotos : [];
        for (const p of highlighted) {
            if (p?.imageUrl) imageCandidates.push(p.imageUrl);
        }
        if (strain.nugImage) imageCandidates.push(strain.nugImage);
        if (strain.flowerImagePng) imageCandidates.push(strain.flowerImagePng);

        let imageUrl = '';
        for (const img of imageCandidates) {
            if (img && !/(?:default\.png|placeholder|fallback|no[-_]?image|blank|coming[-_]?soon)/i.test(img)) {
                imageUrl = img;
                break;
            }
        }

        const thcP50 = strain?.cannabinoids?.thc?.percentile50 ?? null;

        // Terpenes
        const terpsRaw = strain?.terps || {};
        const terps = [];
        for (const [key, val] of Object.entries(terpsRaw)) {
            if (val && typeof val === 'object' && val.name) {
                terps.push({
                    name: val.name,
                    score: typeof val.score === 'number' ? Number(val.score.toFixed(4)) : null,
                });
            }
        }
        terps.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

        // Effects + Flavors
        const toSortedList = (obj, limit) => {
            if (!obj || typeof obj !== 'object') return [];
            return Object.entries(obj)
                .sort((a, b) => ((b[1]?.score ?? 0) - (a[1]?.score ?? 0)))
                .map(([k]) => k)
                .filter(Boolean)
                .slice(0, limit);
        };

        const effects = toSortedList(strain.effects, 5);
        const flavors = toSortedList(strain.flavors, 3);

        // Description
        let description = strain.descriptionPlain || '';
        if (!description && strain.description) {
            description = String(strain.description).replace(/<[^>]+>/g, '').trim();
        }

        let category = String(strain.category || 'hybrid').toLowerCase();
        if (!['indica', 'sativa', 'hybrid', 'ruderalis'].includes(category)) {
            category = 'hybrid';
        }

        return {
            status: 'OK',
            candidate_slug: candidateSlug,
            canonical_slug: canonicalSlug,
            leafly_url: `https://leafly.com/strains/${canonicalSlug}`,
            name: strain.name,
            type: category,
            thc_p50: thcP50,
            terpenes: terps,
            effects,
            flavors,
            description,
            image_url: imageUrl,
            has_real_image: Boolean(imageUrl),
        };
    } catch (error) {
        return {
            status: 'OBSCURA_ERROR',
            candidate_slug: candidateSlug,
            error: error.message,
        };
    }
}

// ---------------------------------------------------------------------------
// Quality checks
// ---------------------------------------------------------------------------
function isPlaceholderImage(url) {
    if (!url) return true;
    return PLACEHOLDER_PATTERNS.some(re => re.test(url));
}

function prepareStrainForDb(scraped, inputSlug) {
    const thcP50 = Number(scraped.thc_p50);
    const hasTHC = Number.isFinite(thcP50) && thcP50 > 0;

    return {
        input_slug: normalizeSlug(inputSlug),
        candidate_slug: normalizeSlug(scraped.candidate_slug),
        slug: normalizeSlug(scraped.canonical_slug || scraped.candidate_slug),
        leafly_url: scraped.leafly_url || null,
        name: scraped.name?.trim() || null,
        type: VALID_TYPES.has(scraped.type) ? scraped.type : 'hybrid',
        thc_p50: hasTHC ? Number(thcP50.toFixed(1)) : null,
        thc_min: hasTHC ? Number((thcP50 - 2).toFixed(1)) : null,
        thc_max: hasTHC ? Number((thcP50 + 2).toFixed(1)) : null,
        terpenes: Array.isArray(scraped.terpenes) ? scraped.terpenes : [],
        effects: Array.isArray(scraped.effects) ? scraped.effects.slice(0, 5) : [],
        flavors: Array.isArray(scraped.flavors) ? scraped.flavors.slice(0, 3) : [],
        description: scraped.description?.trim() || null,
        image_url: scraped.image_url || null,
        has_real_image: !!scraped.has_real_image && !isPlaceholderImage(scraped.image_url || ''),
        source: 'leafly',
    };
}

function isComplete(strain) {
    if (!strain?.name) return { complete: false, reason: 'no name' };
    if (!strain?.slug) return { complete: false, reason: 'no canonical slug' };
    if (!strain?.thc_p50 || strain.thc_p50 <= 0) return { complete: false, reason: 'no valid THC' };
    if (!strain?.has_real_image) return { complete: false, reason: 'no real image' };
    if (!strain?.terpenes || strain.terpenes.length < MIN_TERPENES) {
        return { complete: false, reason: `terpenes incomplete (${strain?.terpenes?.length || 0})` };
    }
    if (!strain?.effects || strain.effects.length < MIN_EFFECTS) {
        return { complete: false, reason: `effects incomplete (${strain?.effects?.length || 0})` };
    }
    if (!strain?.flavors || strain.flavors.length < MIN_FLAVORS) {
        return { complete: false, reason: `flavors incomplete (${strain?.flavors?.length || 0})` };
    }
    if (
        REQUIRE_DESCRIPTION &&
        (!strain?.description || strain.description.length < MIN_DESCRIPTION_LENGTH)
    ) {
        return { complete: false, reason: 'description too short' };
    }
    return { complete: true, reason: 'ok' };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------
async function loadExistingSlugs() {
    const { data, error } = await supabase.from('strains').select('slug');
    if (error) throw error;

    return new Set(
        (data || [])
            .map(row => normalizeSlug(row.slug))
            .filter(Boolean)
    );
}

async function insertStrain(strain) {
    if (DRY_RUN) {
        console.log(`    [DRY] Would insert: ${strain.name} (${strain.slug})`);
        return { ok: true, id: null };
    }

    const { data, error } = await supabase
        .from('strains')
        .insert({
            name: strain.name,
            slug: strain.slug,
            type: strain.type,
            thc_min: strain.thc_min,
            thc_max: strain.thc_max,
            terpenes: strain.terpenes,
            effects: strain.effects,
            flavors: strain.flavors,
            description: strain.description,
            image_url: strain.image_url,
            source: strain.source,
        })
        .select('id')
        .maybeSingle();

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id || null };
}

// ---------------------------------------------------------------------------
// Work queue
// ---------------------------------------------------------------------------
async function runPool(items, limit, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function runner() {
        while (true) {
            const current = nextIndex++;
            if (current >= items.length) return;
            results[current] = await worker(items[current], current);
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, () => runner())
    );

    return results;
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------
async function processRequestedStrain(rawInput, index, total, ctx) {
    const displayName = String(rawInput)
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    console.log(`[${index + 1}/${total}] ${displayName}...`);

    const candidates = getCandidateSlugs(rawInput);
    if (!candidates.length) {
        return {
            status: 'INVALID_INPUT',
            rawInput,
            reason: 'no candidate slugs after normalization',
        };
    }

    const cacheKey = canonicalSeed(rawInput);
    const cachedNotFound = ctx.notFoundCache[cacheKey];

    if (!RETRY_NOT_FOUND && cachedNotFound?.lastTriedAt) {
        const age = Date.now() - new Date(cachedNotFound.lastTriedAt).getTime();
        if (age < NOT_FOUND_TTL_MS) {
            return {
                status: 'SKIP_NOT_FOUND_CACHE',
                rawInput,
                reason: cachedNotFound.reason || 'cached recently as not found',
            };
        }
    }

    let lastFailure = null;

    for (const candidate of candidates) {
        if (ctx.existingSlugs.has(candidate) || ctx.claimedSlugs.has(candidate)) {
            return {
                status: 'SKIP_EXISTS',
                rawInput,
                reason: `candidate already exists/claimed: ${candidate}`,
            };
        }

        const scraped = await scrapeCandidate(candidate);

        if (scraped.status !== 'OK') {
            lastFailure = scraped;
            if (scraped.status === 'CONSENT_OR_BLOCK') break;
            continue;
        }

        const prepared = prepareStrainForDb(scraped, rawInput);
        const { complete, reason } = isComplete(prepared);

        if (!complete) {
            return {
                status: 'INCOMPLETE',
                rawInput,
                candidate,
                reason,
                detail: prepared,
            };
        }

        if (ctx.existingSlugs.has(prepared.slug) || ctx.claimedSlugs.has(prepared.slug)) {
            return {
                status: 'SKIP_EXISTS',
                rawInput,
                reason: `canonical slug already exists/claimed: ${prepared.slug}`,
                detail: prepared,
            };
        }

        ctx.claimedSlugs.add(prepared.slug);
        const inserted = await insertStrain(prepared);
        ctx.claimedSlugs.delete(prepared.slug);

        if (!inserted.ok) {
            return {
                status: 'DB_ERROR',
                rawInput,
                candidate,
                reason: inserted.error || 'unknown DB error',
                detail: prepared,
            };
        }

        ctx.existingSlugs.add(prepared.slug);
        delete ctx.notFoundCache[cacheKey];

        return {
            status: 'IMPORTED',
            rawInput,
            candidate,
            detail: prepared,
            insertedId: inserted.id,
        };
    }

    ctx.notFoundCache[cacheKey] = {
        rawInput,
        candidates,
        reason: lastFailure?.status || 'NOT_FOUND',
        lastTriedAt: new Date().toISOString(),
        detail: lastFailure || null,
    };

    return {
        status: 'NOT_FOUND',
        rawInput,
        candidates,
        reason: lastFailure?.status || 'NOT_FOUND',
        detail: lastFailure || null,
    };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    console.log('🌿 GREENLOG LEAFLY SCRAPER');
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Limit: ${LIMIT || 'unlimited'}`);
    console.log(`   Concurrency: ${CONCURRENCY}`);
    console.log(`   Delay: ${DELAY_MS}ms`);
    console.log(`   Retry cached not-found: ${RETRY_NOT_FOUND ? 'yes' : 'no'}\n`);

    const notFoundCache = loadJson(NOT_FOUND_CACHE_PATH, {});
    const existingSlugs = await loadExistingSlugs();
    const claimedSlugs = new Set();

    console.log('Loading existing strains from DB...');
    console.log(`   ${existingSlugs.size} canonical slugs already in DB\n`);

    const RAW_POPULAR_STRAINS = [
        // Top shelf / modern hits
        'gorilla-glue-4', 'gg4', 'gelato', 'gelato-33', 'gelato-41', 'gelato-43', 'gelato-45',
        'wedding-cake', 'gsc', 'girl-scout-cookies', 'biscotti', 'gmo-cookies', 'garlic-breath',
        'dosi', 'dosi-face', 'dosi-face-off', 'mandarin-cookies', 'garlic-gushers',
        'runtz', 'pink-runtz', 'white-runtz', 'blue-runtz', 'purple-runtz', 'black-runtz',
        'apple-fritter', 'apple-tartz', 'grape-cream-cake', 'lbv-honeylime-gushers',
        'wonder-mintz', 'animal-face', 'animal-face-off', 'marionberry', 'ice-cream-cake',
        'jealousy', 'mile-high-club', 'cascadia', 'butterscotch', 'flurricane',
        // Wedding Cake family
        'wedding-cake', 'wedding-punch', 'wedding-crasher', 'modified-melons',
        'melon-calyx', 'melona', 'melon-soda', 'melon-sherbet',
        // GSC / cookie family
        'gsc', 'cookie-breath', 'peanut-butter-jelly', 'peanut-butter-breath',
        'cereal-milk', 'cereal-milk-x-ice-cream-cake', 'kush-mints', 'kush-mint',
        'platinum-gsc', 'galactic-cookies', 'crazy-party',
        // Gelato family
        'gelato-33', 'gelato-25', 'gelato-41', 'gelato-43', 'sherb-gelato',
        'do-si-dos', 'dosi-face', 'dosi-face-off', 'mendo-breath', 'mendo-t breath',
        // Runtz family
        'runtz', 'white-runtz', 'pink-runtz', 'blue-runtz', 'purple-runtz',
        'runtz-sherbet', 'grunted', 'gushers', 'gushers-sherbet',
        'blackberry-gelato', 'purple-gelato', 'sundae-hound',
        // GMO / Garlic family
        'gmo-cookies', 'garlic-breath', 'garlic-mush', 'meat-breath',
        'meat-wave', 'laser-sherb', 'chemer', 'chemz',
        // Popular US strains
        'cherry-pie', 'cherry-gas', 'cherry-bomb', 'cherry-cookie',
        'biscotti', 'papaya', 'papaya-sunset', 'sunset-cake',
        'sunset-sherbert', 'sherbert', 'sherb-quake',
        'zookies', 'triple-cookies', 'cookiestrips', 'jenny-kush',
        // Sativas
        'super-lemon-haze', 'sour-diesel', 'sour-breath', 'sour-g',
        'jack-herer', 'tangie', 'tangie-dream', 'cali-tangie',
        'strawberry-ak', 'strawberry-diesel', 'strawberry-runtz',
        'moby-dick', 'durban-poison', 'malaise', 'malaisa',
        'amnesia-haze', 'super-silver-haze', 'chocolate-haze',
        'lemon-haze', 'lemon-tree', 'lemon-cheese', 'lemon-skunk',
        'silver-haze', 'neville-haze', 'kmd', 'kmint',
        'ghost-train-haze', 'della-sfera', 'power-diesel',
        // Indicas
        'purple-punch', 'purple-punch-2', 'grape-og', 'grape-stomper',
        'kush-mints', 'kush-mint-fresh', 'motorbreath', 'motorbreath-f14',
        'triangle-kush', 'tkg', 'og-kush', 'og', 'pre-98-og',
        'face-off-og', 'triangle-kush-og', 'fj-kush',
        'northern-lights', 'white-widow', 'white-og', 'white-runtz',
        'granddaddy-purple', 'gdp', 'purple-haze', 'purple-urkle',
        'mendo-purps', 'papaya-sunset-indica',
        'master-kush', 'warlock', 'critical-bilbo', 'critical-kush',
        'critical-47', 'critical-plus', 'critical-cheese',
        'purple-kush', 'purple-kush-cookies', 'kosher-kush',
        // Hybrids
        'blue-dream', 'pineapple-express', 'ak-47', 'ak-48',
        'lavender', 'lavender-haze', 'lavender-kush',
        'la-confidential', 'la-agent', 'la-moonrocks',
        'chemdawg', 'chemdawg-4', 'chem-jack', 'chem-haze',
        'death-star', 'death-star-s', 'death-trap',
        'skunk', 'skunk-1', 'skunk-ultra', 'skunk-gold',
        'forum-cookies', 'forum-gsc', 'fortune-cookies',
        'cactus', 'cactus-cool', 'cactus-mandarin',
        'tropic-thunder', 'tropic-thunder-haze', 'tropic-frost',
        'zombie-kush', 'zombie-kush-og', 'zombie-brain',
        'godfather-og', 'godfather', 'godfather-g',
        'mimosa', 'mimosa-x-orange-crush', 'mimosa-evolution',
        'sunset-sherbert', 'sherb-stomper', 'sherb-breath',
        'hollywood-tajin', 'tajin-haze', 'hollywood-og',
        'korean', 'korean-grape', 'korean-air',
        'pink-ghost', 'ghost-og', 'ghost-kush', 'ghost-mint',
        'mandarin-tang', 'mandarin-sunset', 'mandarin-dream',
        'purple-gummy', 'gummy-bears', 'purple-gummy-sherbet',
        'lemonade-haze', 'lemonade', 'lemonade-soda',
        'peach-chementine', 'peach-sherbert', 'peach-gushers',
        'balanced-sweet-skunk', 'sweet-skunk', 'sweet-diesel',
        'plum-driver', 'plum-crazy', 'plum-punch',
        'scooby-super-silver-skunk', 'scooby-snax', 'silver-skunk',
        'cannatonic', 'cannatonic-haze', 'cannatonic-og',
        'cocoa-bomba', 'cocoa-kush', 'chocolate-kush',
        'alpine-og', 'alpine-gelato', 'alpine-cookies',
        'alien-mints', 'alien-cookies', 'alien-breath',
        'alien-og', 'alien-runtz', 'alien-ghost',
        'obama-runtz', 'obama-kush', 'obama-gas',
        'dantes-inferno', 'dante-skunk', 'inferno-haze',
        'fotmer-t3h', 'fotmer', 'fotmer-haze',
        'bedrocan-alternative', 'bedrocan', 'bedrocan-purple',
        'together-pharma-glueberry', 'glueberry', 'glue-berry',
        'love-potion', 'love-potion-og', 'potion-haze',
        'cap-junky', 'cap-junk', 'junky-cap',
        'creamy-kee', 'creamy-kush', 'creamy-gelato',
        'tiger-cake', 'tiger-og', 'tiger-blood',
        'strawberry-cherry-gas', 'strawberry-cherry', 'cherry-strawberry',
        'glitter-bomb', 'glitter-kush', 'bomb-strawberry',
        'plum-crazy', 'plum-gelato', 'crazy-plum',
        'fruity-tutti', 'fruity-sherbert', 'tutti-frutti',
        'big-buddha-cheese', 'bbc', 'big-buddha',
        'chiquid', 'chiquid-haze', 'chiquid',
        'sweet-berried', 'sweet-berry', 'berry-sweet',
        'banana-kush', 'banana', 'banana-og',
        'candy-queen', 'candy', 'queen-gelato',
        'laser', 'laser-haze', 'laser-og',
        'chemer', 'chemer-haze', 'chemz',
        'papie', 'papaya-stomper', 'papaya-punch',
        // Extra popular for variety
        'wifi-og', 'wifi', 'wifi-cookies',
        'tmi', 'tangerine-man', 'tangerine-haze',
        'headband', 'headband-og', 'power-headband',
        'chilliangelic', 'chill-pill', 'chill-gelato',
        'gumby', 'gumby-og', 'gumby-breath',
        'jet-fuel', 'jet-fuel-gelp', 'fuel-g',
        'tange', 'tangie-haze', 'tangie-g',
        'dream-nectar', 'dream', 'nectar',
        'cherry-widow', 'cherry-pie-haze', 'cherry-widow-x',
        'alpine-star', 'star-dawg', 'star-cookies',
        'diamond-gum', 'diamond', 'diamond-dawg',
        'papi', 'papo', 'papi-smoke',
        'foggy-haze', 'foggy-cookies',
        'pancakes', 'pancake-haze', 'pancake-kush',
        'strawberry-banana', 'straw-nana', 'banana-strawberry',
        'donkey-butter', 'donkey', 'butter',
        'goddard', 'god-doc', 'doctor-g',
        'jet-a', 'jet', 'jet-fuel-haze',
        'galactic', 'galactic-og', 'galactic-runtz',
        'crazy-cherry', 'cherry-crazy', 'crazy-fruit',
        'golden-goat', 'goat', 'golden-haze',
        'grapefruit-haze', 'grapefruit', 'grapefruit-skunk',
    ];

    const dedupedRequested = dedupeRequestedStrains(RAW_POPULAR_STRAINS);

    const filteredRequested = dedupedRequested.filter(raw => {
        const key = canonicalSeed(raw);
        return key && !existingSlugs.has(key);
    });

    const toScrape = LIMIT ? filteredRequested.slice(0, LIMIT) : filteredRequested;

    console.log(`   Requested raw entries: ${RAW_POPULAR_STRAINS.length}`);
    console.log(`   After dedupe/normalization: ${dedupedRequested.length}`);
    console.log(`   New strains to try: ${toScrape.length}\n`);

    if (!toScrape.length) {
        console.log('Nothing to scrape. Exiting.');
        return;
    }

    const ctx = {
        existingSlugs,
        claimedSlugs,
        notFoundCache,
    };

    const stats = {
        imported: 0,
        skippedExists: 0,
        skippedNotFoundCache: 0,
        incomplete: 0,
        notFound: 0,
        dbErrors: 0,
        invalidInput: 0,
    };

    const results = await runPool(toScrape, CONCURRENCY, async (raw, idx) => {
        const result = await processRequestedStrain(raw, idx, toScrape.length, ctx);

        switch (result.status) {
            case 'IMPORTED':
                stats.imported++;
                console.log(`    ✅ Imported: ${result.detail.name} (${result.detail.slug})`);
                break;
            case 'SKIP_EXISTS':
                stats.skippedExists++;
                console.log(`    ⏭ Exists: ${result.reason}`);
                break;
            case 'SKIP_NOT_FOUND_CACHE':
                stats.skippedNotFoundCache++;
                console.log(`    ⏭ Cached not found: ${result.reason}`);
                break;
            case 'INCOMPLETE':
                stats.incomplete++;
                console.log(`    ⏭ Incomplete: ${result.reason}`);
                break;
            case 'NOT_FOUND':
                stats.notFound++;
                console.log(`    ⚠️ Not found: ${result.reason}`);
                appendJsonl(FAILURE_LOG_PATH, {
                    ts: new Date().toISOString(),
                    type: 'NOT_FOUND',
                    rawInput: result.rawInput,
                    candidates: result.candidates,
                    reason: result.reason,
                    detail: result.detail,
                });
                break;
            case 'DB_ERROR':
                stats.dbErrors++;
                console.log(`    ❌ DB error: ${result.reason}`);
                appendJsonl(FAILURE_LOG_PATH, {
                    ts: new Date().toISOString(),
                    type: 'DB_ERROR',
                    rawInput: result.rawInput,
                    candidate: result.candidate,
                    reason: result.reason,
                    detail: result.detail,
                });
                break;
            case 'INVALID_INPUT':
                stats.invalidInput++;
                console.log(`    ⚠️ Invalid input: ${result.reason}`);
                appendJsonl(FAILURE_LOG_PATH, {
                    ts: new Date().toISOString(),
                    type: 'INVALID_INPUT',
                    rawInput: result.rawInput,
                    reason: result.reason,
                });
                break;
            default:
                console.log(`    ⚠️ Unhandled status: ${result.status}`);
                break;
        }

        if (DELAY_MS > 0) {
            await sleep(DELAY_MS);
        }

        return result;
    });

    saveJson(NOT_FOUND_CACHE_PATH, notFoundCache);

    const reasonCounts = {};
    for (const r of results) {
        const reason = r?.reason || r?.status || 'UNKNOWN';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log(`   ✅ Imported: ${stats.imported}`);
    console.log(`   ⏭ Skipped (exists): ${stats.skippedExists}`);
    console.log(`   ⏭ Skipped (cached not found): ${stats.skippedNotFoundCache}`);
    console.log(`   ⏭ Incomplete: ${stats.incomplete}`);
    console.log(`   ❌ Not found: ${stats.notFound}`);
    console.log(`   ❌ DB errors: ${stats.dbErrors}`);
    console.log(`   ⚠️ Invalid input: ${stats.invalidInput}`);
    console.log('-'.repeat(60));
    console.log('Reason breakdown:');
    for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`   ${reason}: ${count}`);
    }
    console.log('='.repeat(60) + '\n');

    console.log(`Failure log: ${FAILURE_LOG_PATH}`);
    console.log(`Not-found cache: ${NOT_FOUND_CACHE_PATH}`);
}

main()
    .catch(error => {
        console.error('\nFatal error:', error);
        process.exitCode = 1;
    });