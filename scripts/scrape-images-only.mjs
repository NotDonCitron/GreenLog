/**
 * scrape-images-only.mjs
 * Scraper der NUR image_url updated — keine anderen Daten.
 * Fokus: Strains ohne Bild (image_url = null)
 * 
 * Usage:
 *   node scripts/scrape-images-only.mjs                  # full run
 *   node scripts/scrape-images-only.mjs --limit 50       # test with 50
 *   node scripts/scrape-images-only.mjs --concurrent 3   # parallel workers
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const args = process.argv.slice(2);
const SHOW_HELP = args.includes('--help') || args.includes('-h');

if (SHOW_HELP) {
    console.log(`Usage:
  node scripts/scrape-images-only.mjs
  node scripts/scrape-images-only.mjs --limit=50
  node scripts/scrape-images-only.mjs --concurrent=3
`);
    process.exit(0);
}

// ------------------------------------------------------------------
// Config
// ------------------------------------------------------------------
const PROJECT_ROOT = '/home/phhttps/Dokumente/Greenlog/GreenLog';
const SUPABASE_URL = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');
const CONCURRENT = parseInt(args.find(a => a.startsWith('--concurrent='))?.split('=')[1] || '3');
const CURL_TIMEOUT = 15;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function parseIntArg(name, fallback) {
    const arg = process.argv.find(a => a.startsWith(`${name}=`));
    return arg ? parseInt(arg.split('=')[1]) || fallback : fallback;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function curl(url, timeout = CURL_TIMEOUT) {
    try {
        const { stdout } = await execAsync(
            `curl -sL --max-time ${timeout} -A "Mozilla/5.0" "${url.replace(/"/g, '\\"')}"`,
            { timeout: (timeout + 5) * 1000 }
        );
        return stdout;
    } catch {
        return null;
    }
}

function isPlaceholderImage(url) {
    if (!url) return true;
    return /\/defaults\//.test(url.toLowerCase());
}

// ------------------------------------------------------------------
// Image extraction from Leafly __NEXT_DATA__
// ------------------------------------------------------------------
function extractBestImage(strain) {
    // Priority 1: Real user photos
    const highlighted = strain.highlightedPhotos || [];
    for (const photo of highlighted) {
        if (photo?.imageUrl && !isPlaceholderImage(photo.imageUrl)) {
            return { url: photo.imageUrl, source: 'leafly_user', quality: 'real' };
        }
    }
    // Priority 2: Nug image (product shot)
    if (strain.nugImage && !isPlaceholderImage(strain.nugImage)) {
        return { url: strain.nugImage, source: 'leafly_nug', quality: 'real' };
    }
    // Priority 3: Stock/similar image
    if (strain.stockNugImage) {
        return { url: strain.stockNugImage, source: 'leafly_similar', quality: isPlaceholderImage(strain.stockNugImage) ? 'generic' : 'real' };
    }
    // Priority 4: Any available image (even generic)
    if (strain.nugImage) {
        return { url: strain.nugImage, source: 'leafly_generic', quality: 'generic' };
    }
    return null;
}

// ------------------------------------------------------------------
// Scrape Leafly for one strain name
// ------------------------------------------------------------------
async function scrapeStrain(name, brand = null) {
    // Build slug variants
    let baseName = name.toLowerCase().trim();
    if (brand) {
        baseName = baseName.replace(brand.toLowerCase(), '').trim();
    }
    // Remove common suffixes
    baseName = baseName
        .replace(/\s+\d+\/\d+$/, '')
        .replace(/\s+thc\d+.*$/i, '')
        .replace(/\s+typ\s*\d+$/i, '')
        .replace(/\s+pn$/, '')
        .replace(/\s+cm$/, '')
        .replace(/\s+remexian$/, '')
        .replace(/\s+vayamed$/, '')
        .replace(/\s+amici$/, '')
        .replace(/\s+medex$/, '')
        .trim();

    const slugBase = baseName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const variants = new Set();
    variants.add(slugBase);
    variants.add(slugBase + 's');
    if (slugBase.endsWith('s')) variants.add(slugBase.slice(0, -1));
    variants.add(slugBase.replace(/-/g, ''));
    if (slugBase.includes('-')) variants.add(slugBase.split('-')[0]);
    // Remove common brand words that got merged
    for (const v of [slugBase, slugBase + 's']) {
        const parts = v.split('-');
        if (parts.length > 2) variants.add(parts.slice(0, 2).join('-'));
    }

    const uniqueVariants = [...variants].filter(v => v.length > 1);

    for (const slug of uniqueVariants) {
        const url = `https://www.leafly.com/strains/${slug}`;
        const html = await curl(url);
        if (!html) continue;

        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        if (!match) continue;

        try {
            const nextData = JSON.parse(match[1]);
            const strain = nextData?.props?.pageProps?.strain;
            if (!strain?.name) continue;

            const imageData = extractBestImage(strain);
            if (!imageData) continue;

            return {
                found_slug: slug,
                real_slug: strain.slug,
                image_url: imageData.url,
                image_source: imageData.source,
                image_quality: imageData.quality,
                thc: strain.cannabinoids?.thc?.percentile50 || null,
                found: true
            };
        } catch {
            continue;
        }
    }
    return { found: false };
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
    console.log('📸 Leafly Image Scraper — ONLY image_url\n');

    // Get all strains with null image_url — use range to bypass default 1000 limit
    console.log('Lade Strains ohne Bild aus DB...');
    let targets = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
        const { data, error } = await supabase
            .from('strains')
            .select('id, name, slug, brand, image_url')
            .is('image_url', null)
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error) {
            console.error('DB Error:', error);
            return;
        }
        if (!data || data.length === 0) break;
        targets.push(...data);
        console.log(`  Seite ${page + 1}: ${data.length} geladen (total: ${targets.length})`);
        if (data.length < PAGE_SIZE) break;
        page++;
    }

    console.log(`\n${targets.length} Strains ohne Bild — starte Scraping...\n`);
    if (LIMIT > 0) {
        targets = targets.slice(0, LIMIT);
        console.log(`Limit: ${LIMIT} (von ${targets.length} total)\n`);
    }

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const startTime = Date.now();

    // Process in batches
    const BATCH_SIZE = CONCURRENT;
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);

        const results = await Promise.all(
            batch.map(async (s) => {
                process.stdout.write(`[${i + processed + 1}/${targets.length}] ${s.name}... `);
                const result = await scrapeStrain(s.name, s.brand);
                processed++;
                return { strain: s, result };
            })
        );

        // Update DB
        for (const { strain, result } of results) {
            if (result.found && result.image_url) {
                const { error: updateError } = await supabase
                    .from('strains')
                    .update({
                        image_url: result.image_url,
                        image_attribution: {
                            source: 'leafly',
                            subtype: result.image_source,
                            url: `https://leafly.com/strains/${result.real_slug || result.found_slug}`
                        }
                    })
                    .eq('id', strain.id);

                if (updateError) {
                    console.log(`❌ DB Error`);
                    failed++;
                } else {
                    const quality = result.image_quality === 'generic' ? '🟡' : '✅';
                    console.log(`${quality} ${result.image_source} (${result.image_quality})`);
                    updated++;
                }
            } else {
                console.log(`⚠️ Nicht gefunden`);
                skipped++;
            }
        }

        // Progress
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const rate = Math.round(processed / (elapsed / 60));
        const remaining = targets.length - processed;
        const eta = rate > 0 ? Math.round(remaining / rate) : '?';
        console.log(`  📊 ${processed}/${targets.length} | Rate: ~${rate}/min | ETA: ~${eta}min\n`);
    }

    const total = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n🏁 FERTIG in ${total}s`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️  Nicht gefunden: ${skipped}`);
    console.log(`   ❌ Fehler: ${failed}`);
}

main().catch(console.error);
