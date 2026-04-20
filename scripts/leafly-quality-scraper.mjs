/**
 * leafly-quality-scraper.mjs
 * 
 * Quality-First Leafly Scraper für GreenLog
 * 
 * Strategy:
 * 1. Use --dump html to get full page with __NEXT_DATA__
 * 2. Parse JSON from __NEXT_DATA__ script tag
 * 3. Only import strains with COMPLETE data (thc, description, image, effects, flavors, terpenes)
 * 4. On 404, try Leafly search to find similar strains
 * 5. Skip strains with incomplete data
 * 
 * Setup:
 *   1) Start Obscura separately:
 *      obscura serve --port 9222 --stealth
 * 
 *   2) Run scraper:
 *      node scripts/leafly-quality-scraper.mjs                    # full run
 *      node scripts/leafly-quality-scraper.mjs --dry              # dry run (no DB write)
 *      node scripts/leafly-quality-scraper.mjs --limit 50         # limit for testing
 *      node scripts/leafly-quality-scraper.mjs --wishlist kushy  # use kushy-strains.csv as wishlist
 * 
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
    console.error('   Export them before running:');
    console.error('   export SUPABASE_URL=https://uwjyvvvykyueuxtdkscs.supabase.co');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY=...');
    process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry');
const LIMIT = parseNumberArg('--limit', 0);
const USE_WISHLIST = process.argv.includes('--wishlist');
const BROWSER_TIMEOUT_MS = 60000;

// Quality gates - ONLY import strains that meet ALL these criteria
const QUALITY_GATES = {
    minThc: 1,                    // THC must be > 0
    minDescriptionLength: 100,    // Description must be at least 100 chars
    requireImage: true,           // Must have a real image (not default/placeholder)
    minEffects: 2,                // At least 2 effects
    minFlavors: 1,                // At least 1 flavor
    minTerpenes: 1,               // At least 1 terpene
};

// Cached data paths
const TMP_DIR = path.join(PROJECT_ROOT, 'tmp');
const NOT_FOUND_CACHE = path.join(TMP_DIR, 'leafly-not-found-cache.json');
const FAILURE_LOG = path.join(TMP_DIR, 'leafly-failures.jsonl');
const QUALITY_REPORT = path.join(TMP_DIR, 'leafly-quality-report.json');

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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    
    // Check known mappings first
    if (SLUG_MAPPING[base]) return SLUG_MAPPING[base];
    
    // Standard transformations
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
    
    // Common variations
    if (base.endsWith('s')) variants.add(base.slice(0, -1));
    if (!base.endsWith('s')) variants.add(base + 's');
    
    // Remove special chars
    variants.add(base.replace(/[^a-z0-9]/g, ''));
    
    // First word
    const first = base.split('-')[0];
    if (first && first.length > 2 && first !== base) variants.add(first);
    
    // Remove - after removing spaces
    variants.add(base.replace(/-/g, ''));
    
    return [...variants].filter(v => v.length > 1);
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Get existing strain names from DB (to avoid duplicates)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Get wishlist from Kushy CSV
// ---------------------------------------------------------------------------
function getKushyWishlist() {
    const csvPath = path.join(PROJECT_ROOT, 'kushy-strains.csv');
    if (!fs.existsSync(csvPath)) {
        console.warn('⚠️  kushy-strains.csv not found, using empty wishlist');
        return [];
    }
    
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').slice(1); // Skip header
    
    const strains = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        
        // Parse CSV properly - fields are comma separated with double quotes
        // Format: "id","status","sort","name","slug","image","description",...
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
        fields.push(current.trim()); // Last field
        
        // Name is at index 3 (0-indexed: id=0, status=1, sort=2, name=3)
        const name = fields[3];
        if (name && name.length > 1 && name !== 'NULL' && !/^\d+$/.test(name)) {
            strains.push(name);
        }
    }
    
    return strains;
}

// ---------------------------------------------------------------------------
// Browser fetch via obscura CLI
// ---------------------------------------------------------------------------
async function obscuraFetchHtml(url) {
    const cmd = `obscura fetch "${url}" --dump html --wait 8 --wait-until networkidle0 --stealth -q`;
    try {
        const { stdout } = await execAsync(cmd, {
            cwd: PROJECT_ROOT,
            shell: '/bin/bash',
            timeout: BROWSER_TIMEOUT_MS,
            maxBuffer: 5 * 1024 * 1024,
        });
        return stdout;
    } catch (err) {
        return null;
    }
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

// ---------------------------------------------------------------------------
// Check if image is a placeholder (generic default, not a real strain photo)
// ---------------------------------------------------------------------------
function isPlaceholderImage(url) {
    if (!url) return true;
    const lower = url.toLowerCase();
    // Generic Leafly defaults like /defaults/purple/strain-13.png
    return /\/defaults\//.test(lower);
}

// ---------------------------------------------------------------------------
// Extract best available image from strain data
// ---------------------------------------------------------------------------
function extractBestImage(strain) {
    // Priority 1: highlightedPhotos (user-submitted real strain photos)
    const highlighted = strain.highlightedPhotos || [];
    for (const photo of highlighted) {
        if (photo?.imageUrl && !isPlaceholderImage(photo.imageUrl)) {
            return { url: photo.imageUrl, source: 'leafly_user' };
        }
    }
    
    // Priority 2: nugImage (strain's own photo)
    if (strain.nugImage && !isPlaceholderImage(strain.nugImage)) {
        return { url: strain.nugImage, source: 'leafly_nug' };
    }
    
    // Priority 3: stockNugImage (Leafly "Similar to" stock photo)
    // Only accept if it's NOT a generic placeholder
    if (strain.stockNugImage && !isPlaceholderImage(strain.stockNugImage)) {
        return { url: strain.stockNugImage, source: 'leafly_similar' };
    }
    
    // No good image found
    return null;
}

// ---------------------------------------------------------------------------
// Extract strain data from __NEXT_DATA__ JSON
// ---------------------------------------------------------------------------
function extractStrainData(nextData, originalSlug) {
    if (!nextData?.props?.pageProps?.strain) return null;
    
    const strain = nextData.props.pageProps.strain;
    
    // Get THC and CBD
    const thcPercent = strain.cannabinoids?.thc?.percentile50;
    const cbdPercent = strain.cannabinoids?.cbd?.percentile50;
    
    // Get type (category in Leafly)
    const typeMap = { 'Hybrid': 'hybrid', 'Sativa': 'sativa', 'Indica': 'indica' };
    const type = typeMap[strain.category] || null;
    
    // Get top effects (by score)
    const effectsObj = strain.effects || {};
    const effects = Object.entries(effectsObj)
        .filter(([_, data]) => data?.score > 0.5)  // Only positive effects
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 6)
        .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1));
    
    // Get top flavors
    const flavorsObj = strain.flavors || {};
    const flavors = Object.entries(flavorsObj)
        .filter(([_, data]) => data?.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([name]) => {
            // Convert camelCase to readable
            return name.replace(/([A-Z])/g, ' $1').trim();
        });
    
    // Get terpenes with percentages
    const terpenesObj = strain.terps || {};
    const terpenes = Object.entries(terpenesObj)
        .filter(([_, data]) => data?.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([name, data]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            percent: parseFloat((data.score * 2).toFixed(1)) // Scale score to approximate percent
        }));
    
    // Get best available image
    const imageData = extractBestImage(strain);
    const imageUrl = imageData?.url || '';
    const imageSource = imageData?.source || 'none';
    
    // Get description
    const description = strain.descriptionPlain || strain.description?.replace(/<[^>]+>/g, '') || '';
    
    // Get canonical slug from page path
    const slug = nextData.query?.strainSlug || originalSlug;
    
    // Get name
    const name = strain.name || '';
    
    return {
        name,
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
        image_url: imageUrl,
        image_source: imageSource,
        leafly_url: `https://leafly.com/strains/${slug}`,
    };
}

// ---------------------------------------------------------------------------
// Check quality gates
// ---------------------------------------------------------------------------
function checkQuality(data) {
    const issues = [];
    
    if (!data.thc_min || data.thc_min < QUALITY_GATES.minThc) {
        issues.push(`THC too low: ${data.thc_min}`);
    }
    
    if (!data.description || data.description.length < QUALITY_GATES.minDescriptionLength) {
        issues.push(`Description too short: ${data.description?.length || 0} chars`);
    }
    
    // Accept images from: leafly_user (user photos), leafly_nug (strain photo), leafly_similar (stock photo)
    // Reject: none (no image), defaults/* (generic placeholder)
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
    
    return {
        passed: issues.length === 0,
        issues,
    };
}

// ---------------------------------------------------------------------------
// Try to find alternative strain via Leafly search
// ---------------------------------------------------------------------------
async function searchLeaflyForStrain(query) {
    const searchUrl = `https://www.leafly.com/strains?search=${encodeURIComponent(query)}`;
    
    const html = await obscuraFetchHtml(searchUrl);
    if (!html) return [];
    
    // Look for strain slugs in search results
    const nextData = parseNextData(html);
    if (!nextData) return [];
    
    // Try to extract strain list from search results
    const searchState = nextData.props?.pageProps?.searchStrains || [];
    return searchState.map(s => ({
        slug: s.slug || s.uri?.replace('/strains/', ''),
        name: s.name,
    })).filter(s => s.slug);
}

// ---------------------------------------------------------------------------
// Import strain to Supabase
// ---------------------------------------------------------------------------
async function importStrain(data) {
    if (DRY_RUN) {
        console.log(`  [DRY] Would import: ${data.name} (${data.type})`);
        return { success: true, dry_run: true };
    }
    
    // Create slug from name
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
        if (error.code === '23505') { // Unique violation
            return { success: false, reason: 'duplicate' };
        }
        return { success: false, reason: error.message };
    }
    
    return { success: true, id: result.id };
}

// ---------------------------------------------------------------------------
// Process a single strain
// ---------------------------------------------------------------------------
async function processStrain(strainName, existingNames, notFoundCache, stats) {
    const normalizedName = strainName.toLowerCase().trim();
    
    // Skip if already in DB
    if (existingNames.has(normalizedName)) {
        stats.skipped_duplicate++;
        return null;
    }
    
    // Skip if recently not found
    if (notFoundCache[normalizedName] && 
        Date.now() - notFoundCache[normalizedName] < 7 * 24 * 60 * 60 * 1000) {
        stats.skipped_not_found_cache++;
        return null;
    }
    
    const variants = slugVariants(strainName);
    let foundData = null;
    let foundSlug = null;
    let lastError = null;
    
    // Try each slug variant
    for (const variant of variants) {
        const url = `https://leafly.com/strains/${variant}`;
        
        const html = await obscuraFetchHtml(url);
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
        
        // Success!
        foundData = strainData;
        foundSlug = variant;
        lastError = null;
        break;
    }
    
    if (!foundData) {
        // Not found - cache it
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
    
    // Check quality gates
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
    
    // Import
    const result = await importStrain(foundData);
    if (result.success) {
        stats.imported++;
        console.log(`  ✅ ${foundData.name} (${foundData.type}, THC ${foundData.thc_min}%)`);
    } else if (result.reason === 'duplicate') {
        stats.skipped_duplicate++;
        // Add to existing names so we don't try again
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
// Main
// ---------------------------------------------------------------------------
async function main() {
    console.log('\n🌿 GreenLog Quality-First Leafly Scraper');
    console.log('='.repeat(50));
    
    if (DRY_RUN) {
        console.log('⚠️  DRY RUN MODE - No data will be written to database\n');
    }
    
    // Load caches
    const notFoundCache = loadJson(NOT_FOUND_CACHE, {});
    
    // Get existing strains
    console.log('📊 Checking existing strains in database...');
    const existingNames = await getExistingStrainNames();
    console.log(`   Found ${existingNames.size} existing strains\n`);
    
    // Get wishlist
    let wishlist = [];
    if (USE_WISHLIST) {
        console.log('📋 Loading wishlist from kushy-strains.csv...');
        wishlist = getKushyWishlist();
        console.log(`   Found ${wishlist.length} strains in CSV\n`);
    } else {
        // Use a default list of popular strains
        wishlist = [
            'gelato-33', 'wedding-cake', 'gorilla-glue-4', 'gmo-cookies',
            'sour-diesel', 'og-kush', 'girl-scout-cookies', 'sunset-sherbert',
            'pineapple-express', 'blue-dream', 'granddaddy-purple', 'white-widow',
            'northern-lights', 'ak-47', 'jack-herer', ' Durban-poison',
            'chemdawg', 'purple-haze', 'silver-haze', 'super-lemon-haze',
            'critical-kush', 'critical-mass', '拗', 'master-kush',
        ];
        console.log(`📋 Using default popular strains list (${wishlist.length} strains)\n`);
    }
    
    // Apply limit if specified
    if (LIMIT > 0) {
        wishlist = wishlist.slice(0, LIMIT);
        console.log(`🔢 Limit applied: ${LIMIT} strains\n`);
    }
    
    // Stats
    const stats = {
        total: wishlist.length,
        imported: 0,
        not_found: 0,
        incomplete: 0,
        skipped_duplicate: 0,
        skipped_not_found_cache: 0,
        import_error: 0,
    };
    
    console.log(`🚀 Starting to process ${stats.total} strains...\n`);
    
    // Process each strain
    for (let i = 0; i < wishlist.length; i++) {
        const strainName = wishlist[i];
        process.stdout.write(`[${i + 1}/${stats.total}] ${strainName}...`);
        
        await processStrain(strainName, existingNames, notFoundCache, stats);
        
        process.stdout.write('\n');
        
        // Rate limiting - be nice to Leafly
        await sleep(1500);
        
        // Progress update every 10
        if ((i + 1) % 10 === 0) {
            console.log(`\n📊 Progress: ${i + 1}/${stats.total}`);
            console.log(`   Imported: ${stats.imported} | Not found: ${stats.not_found} | Incomplete: ${stats.incomplete}\n`);
        }
    }
    
    // Final report
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
    
    const successRate = stats.total > 0 ? ((stats.imported / stats.total) * 100).toFixed(1) : 0;
    console.log(`\nSuccess rate: ${successRate}%`);
    
    // Save quality report
    saveJson(QUALITY_REPORT, {
        timestamp: new Date().toISOString(),
        stats,
        wishlist_size: wishlist.length,
        dry_run: DRY_RUN,
    });
    console.log(`\n💾 Report saved to: ${QUALITY_REPORT}`);
}

main().catch(console.error);
