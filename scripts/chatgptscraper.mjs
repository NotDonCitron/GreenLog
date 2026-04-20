/**
 * greenlog-strain-scrape.mjs
 *
 * Improved Leafly scraper for Greenlog.
 *
 * Improvements:
 * - Supabase credentials via env vars
 * - supports --limit 50 and --limit=50
 * - slug normalization + alias fallbacks
 * - stores canonical Leafly slug from final URL
 * - better image filtering
 * - stores all terpene scores found
 * - deduplicates requested strains before scraping
 * - optional concurrency
 * - not-found cache + structured failure log
 *
 * Usage:
 *   node scripts/greenlog-strain-scrape.mjs
 *   node scripts/greenlog-strain-scrape.mjs --limit 50
 *   node scripts/greenlog-strain-scrape.mjs --limit=50 --dry
 *   node scripts/greenlog-strain-scrape.mjs --concurrency 3
 *   node scripts/greenlog-strain-scrape.mjs --retry-not-found
 */

import { createClient } from '@supabase/supabase-js';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const exec = promisify(execCb);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PROJECT_ROOT = '/home/phhttps/Dokumente/Greenlog/GreenLog';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
        'Missing env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Put them in your shell or .env before running.'
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

    // A few lightweight heuristic variants
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
// Browser harness
// ---------------------------------------------------------------------------
async function bh(code) {
    const cmd = `browser-harness <<'PY'\n${code}\nPY`;
    const { stdout } = await exec(cmd, {
        cwd: PROJECT_ROOT,
        shell: '/bin/bash',
        timeout: BROWSER_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf8',
    });
    return stdout.trim();
}

// ---------------------------------------------------------------------------
// Scrape one candidate slug from Leafly
// ---------------------------------------------------------------------------
async function scrapeCandidate(candidateSlug) {
    const url = `https://leafly.com/strains/${candidateSlug}`;

    try {
        const script = `
import json, re

def safe_js(expr):
    try:
        return js(expr)
    except Exception:
        return ""

def strip_html(text):
    return re.sub(r'<[^>]+>', '', text or '').strip()

def is_real_image(url):
    if not url:
        return False
    patterns = [
        r'default\\.png',
        r'placeholder',
        r'fallback',
        r'no[-_]?image',
        r'blank',
        r'coming[-_]?soon',
    ]
    for p in patterns:
        if re.search(p, url, re.I):
            return False
    return True

new_tab(${JSON.stringify(url)})
wait_for_load()

raw = safe_js("document.getElementById('__NEXT_DATA__')?.textContent || ''")
final_url = safe_js("location.href")
final_path = safe_js("location.pathname")
title = safe_js("document.title")
body_text = safe_js("(document.body?.innerText || '').slice(0, 4000)")

if not raw:
    status = "NO_NEXT_DATA"
    lower_body = (body_text or "").lower()

    if "/strains/" not in (final_path or ""):
        status = "REDIRECTED"
    elif "cookie" in lower_body and ("accept" in lower_body or "consent" in lower_body):
        status = "CONSENT_OR_BLOCK"

    print(json.dumps({
        "status": status,
        "candidate_slug": ${JSON.stringify(candidateSlug)},
        "final_url": final_url,
        "final_path": final_path,
        "title": title,
        "body_preview": body_text[:500],
    }, ensure_ascii=False))
else:
    try:
        data = json.loads(raw)
    except Exception as e:
        print(json.dumps({
            "status": "BAD_NEXT_DATA",
            "candidate_slug": ${JSON.stringify(candidateSlug)},
            "final_url": final_url,
            "final_path": final_path,
            "title": title,
            "error": str(e),
        }, ensure_ascii=False))
    else:
        props = ((data or {}).get("props") or {}).get("pageProps") or {}
        strain = props.get("strain") or {}

        if not strain or not strain.get("name"):
            status = "NO_STRAIN"
            if "/strains/" not in (final_path or ""):
                status = "REDIRECTED"

            print(json.dumps({
                "status": status,
                "candidate_slug": ${JSON.stringify(candidateSlug)},
                "final_url": final_url,
                "final_path": final_path,
                "title": title,
            }, ensure_ascii=False))
        else:
            canonical_slug = ""
            m = re.search(r"/strains/([^/?#]+)", final_path or "")
            if m:
                canonical_slug = m.group(1)

            image_candidates = []

            highlighted = strain.get("highlightedPhotos") or []
            for p in highlighted:
                if isinstance(p, dict):
                    image_candidates.append(p.get("imageUrl") or "")

            image_candidates.append(strain.get("nugImage") or "")
            image_candidates.append(strain.get("flowerImagePng") or "")
            image_candidates = [x for x in image_candidates if x]

            image_url = ""
            for img in image_candidates:
                if is_real_image(img):
                    image_url = img
                    break

            has_real_image = bool(image_url)

            thc_p50 = (
                ((strain.get("cannabinoids") or {}).get("thc") or {}).get("percentile50")
            )

            terps = []
            terps_raw = strain.get("terps") or {}
            if isinstance(terps_raw, dict):
                for _, v in terps_raw.items():
                    if isinstance(v, dict) and v.get("name"):
                        score = v.get("score")
                        try:
                            score = round(float(score), 4) if score is not None else None
                        except Exception:
                            score = None
                        terps.append({
                            "name": v.get("name"),
                            "score": score
                        })

            terps = sorted(
                terps,
                key=lambda x: (x.get("score") is not None, x.get("score") or 0),
                reverse=True
            )

            effects = []
            effects_raw = strain.get("effects") or {}
            if isinstance(effects_raw, dict):
                effects = [
                    k for k, v in sorted(
                        effects_raw.items(),
                        key=lambda item: ((item[1] or {}).get("score") or 0),
                        reverse=True
                    )
                    if k
                ]

            flavors = []
            flavors_raw = strain.get("flavors") or {}
            if isinstance(flavors_raw, dict):
                flavors = [
                    k for k, v in sorted(
                        flavors_raw.items(),
                        key=lambda item: ((item[1] or {}).get("score") or 0),
                        reverse=True
                    )
                    if k
                ]

            desc = strain.get("descriptionPlain") or ""
            if not desc:
                desc = strip_html(strain.get("description") or "")

            category = (strain.get("category") or "hybrid").lower()
            if category not in ["indica", "sativa", "hybrid", "ruderalis"]:
                category = "hybrid"

            print(json.dumps({
                "status": "OK",
                "candidate_slug": ${JSON.stringify(candidateSlug)},
                "canonical_slug": canonical_slug or ${JSON.stringify(candidateSlug)},
                "leafly_url": final_url,
                "name": strain.get("name"),
                "type": category,
                "thc_p50": thc_p50,
                "terpenes": terps,
                "effects": effects,
                "flavors": flavors,
                "description": desc,
                "image_url": image_url,
                "image_candidates": image_candidates,
                "has_real_image": has_real_image
            }, ensure_ascii=False))
`;

        const result = await bh(script);
        return JSON.parse(result);
    } catch (error) {
        return {
            status: 'HARNESS_ERROR',
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

    console.log(`Loading existing strains from DB...`);
    console.log(`   ${existingSlugs.size} canonical slugs already in DB\n`);

    // Keep your original long list here.
    const RAW_POPULAR_STRAINS = [
        // Paste your existing POPULAR_STRAINS list here, unchanged.
        // Example:
        'gorilla-glue-4',
        'gg4',
        'gelato',
        'gelato-33',
        'wedding-cake',
        'gsc',
        'girl-scout-cookies',
        'biscotti',
        'gmo-cookies',
        'runtz',
        'white-runtz',
        'black-runtz',
        'apple-fritter',
        'ice-cream-cake',
        'jealousy',
        'super-lemon-haze',
        'sour-diesel',
        'jack-herer',
        'durban-poison',
        'amnesia-haze',
        'og-kush',
        'northern-lights',
        'white-widow',
        'granddaddy-purple',
        'blue-dream',
        'pineapple-express',
        'ak-47',
        'chemdawg',
        'godfather-og',
        'mimosa',
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

main().catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
});