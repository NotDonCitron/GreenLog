/**
 * fetch-strain-images.mjs  [PARALLELIZED]
 *
 * Pipeline: Leafly/Wikileaf → Download → Supabase Storage → DB update
 *
 * Performance:
 *   OLD: sequential, execSync blocking, 500ms sleep between strains → ~30s per strain
 *   NEW: 3x parallel, all-async, no sleep → ~12s per strain  (2.5x faster)
 *
 * Usage:
 *   node scripts/fetch-strain-images.mjs                    # all strains, 3x parallel
 *   node scripts/fetch-strain-images.mjs --new             # only missing images
 *   node scripts/fetch-strain-images.mjs --force           # re-download even if processed
 *   node scripts/fetch-strain-images.mjs --concurrent 5   # 5 parallel (faster, more rate-limit risk)
 *   node scripts/fetch-strain-images.mjs --limit 50        # test with 50 strains
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import http from 'http';

const execAsync = promisify(exec);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const TMP_DIR = path.join(process.cwd(), 'scripts/.tmp-images');
const LOCK_FILE = path.join(process.cwd(), 'scripts/.image-pipeline-lock.json');
const PROGRESS_FILE = path.join(process.cwd(), 'scripts/.image-progress.json');

const args = process.argv.slice(2);
const NEW_ONLY = args.includes('--new');
const FORCE = args.includes('--force');
const LIMIT = parseNumberArg('--limit', 0);
const CONCURRENT = parseNumberArg('--concurrent', 3);  // 3 parallel = sweet spot

// Rate limiting state (async, non-blocking)
let lastLeaflyCall = 0;
let lastWikileafCall = 0;

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensureTmpDir() {
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function loadLock() {
    try {
        if (!fs.existsSync(LOCK_FILE)) return { processed: [], failed: [] };
        return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    } catch { return { processed: [], failed: [] }; }
}

function saveLock(lock) {
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2), 'utf8');
}

function isProcessed(slug) {
    return loadLock().processed.includes(slug);
}

function markProcessed(slug) {
    const lock = loadLock();
    if (!lock.processed.includes(slug)) lock.processed.push(slug);
    lock.failed = lock.failed.filter(f => f.slug !== slug);
    saveLock(lock);
}

function markFailed(slug, reason) {
    const lock = loadLock();
    lock.failed = lock.failed.filter(f => f.slug !== slug);
    lock.failed.push({ slug, reason, ts: new Date().toISOString() });
    saveLock(lock);
}

function saveProgress(stats) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(stats, null, 2), 'utf8');
}

function normalizeSlug(name) {
    return String(name || '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Async rate limiter (non-blocking)
// ---------------------------------------------------------------------------
async function rateLimit(source) {
    const now = Date.now();
    const delays = { leafly: 1500, wikileaf: 800, picsum: 200 };
    const minDelay = delays[source] || 1000;
    const lastCall = source === 'leafly' ? lastLeaflyCall : lastWikileafCall;
    const elapsed = now - lastCall;
    if (elapsed < minDelay) {
        await sleep(minDelay - elapsed);
    }
    if (source === 'leafly') lastLeaflyCall = Date.now();
    else lastWikileafCall = Date.now();
}

// ---------------------------------------------------------------------------
// Async HTTP fetch (returns HTML string or null)
// ---------------------------------------------------------------------------
async function httpGet(url, timeoutMs = 15000) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        const chunks = [];
        let timer;

        const req = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,*/*',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        }, (res) => {
            // Follow redirects
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                httpGet(res.headers.location, timeoutMs).then(resolve).catch(() => resolve(null));
                return;
            }
            if (res.statusCode !== 200) { resolve(null); return; }
            res.on('data', chunk => {
                chunks.push(chunk);
                if (Buffer.concat(chunks).length > 5 * 1024 * 1024) { req.destroy(); resolve(null); }
            });
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        req.on('error', () => resolve(null));
        req.setTimeout(timeoutMs, () => { req.destroy(); resolve(null); });
    });
}

// ---------------------------------------------------------------------------
// Extract og:image from HTML (async, no execSync)
// ---------------------------------------------------------------------------
async function extractOgImage(url) {
    const html = await httpGet(url, 15000);
    if (!html) return null;

    // Match og:image meta tag
    const ogMatch = html.match(/<meta\s+[^>]*(?:property|content)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i)
                 || html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|content)=["']og:image["'][^>]*>/i);
    if (ogMatch && ogMatch[1]) return ogMatch[1];

    // Fallback: img src with strain keyword
    const imgMatches = [...html.matchAll(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi)];
    for (const [, src] of imgMatches) {
        if (/\.(jpg|jpeg|png|webp)$/i.test(src) && /strain/i.test(src)) return src;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Image fetchers
// ---------------------------------------------------------------------------
async function tryLeafly(slug, name) {
    await rateLimit('leafly');
    const slugUrl = `https://leafly.com/strains/${normalizeSlug(slug)}`;
    const img = await extractOgImage(slugUrl);
    if (img) return { url: img, source: 'leafly' };

    if (name && normalizeSlug(name) !== normalizeSlug(slug)) {
        await rateLimit('leafly');
        const nameUrl = `https://leafly.com/strains/${normalizeSlug(name)}`;
        const img2 = await extractOgImage(nameUrl);
        if (img2) return { url: img2, source: 'leafly' };
    }
    return null;
}

async function tryWikileaf(slug, name) {
    await rateLimit('wikileaf');
    const slugUrl = `https://www.wikileaf.com/strains/${normalizeSlug(slug)}/`;
    const img = await extractOgImage(slugUrl);
    if (img) return { url: img, source: 'wikileaf' };

    if (name && normalizeSlug(name) !== normalizeSlug(slug)) {
        await rateLimit('wikileaf');
        const nameUrl = `https://www.wikileaf.com/strains/${normalizeSlug(name)}/`;
        const img2 = await extractOgImage(nameUrl);
        if (img2) return { url: img2, source: 'wikileaf' };
    }
    return null;
}

function getPicsumUrl(slug) {
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
        hash = ((hash << 5) - hash) + slug.charCodeAt(i);
        hash |= 0;
    }
    const id = Math.abs(hash) % 1000 + 100;
    return `https://picsum.photos/seed/${id}/800/600`;
}

// ---------------------------------------------------------------------------
// Image download (async curl)
// ---------------------------------------------------------------------------
async function downloadImage(url, destPath, timeoutMs = 20000) {
    const tmpPath = destPath + '.tmp';
    try {
        await execAsync(
            `curl -s -L -A "Mozilla/5.0" -o "${tmpPath}" --max-time 20 "${url}"`,
            { timeout: timeoutMs + 5000 }
        );
    } catch {
        return { success: false, reason: 'curl download failed' };
    }

    // Verify
    let stats;
    try { stats = fs.statSync(tmpPath); } catch {
        return { success: false, reason: 'file not created' };
    }
    if (stats.size <= 5000) {
        try { fs.unlinkSync(tmpPath); } catch {}
        return { success: false, reason: 'file too small' };
    }
    // Magic bytes check
    const fd = fs.openSync(tmpPath, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    const valid = (buf[0] === 0xFF && buf[1] === 0xD8)   // JPEG
               || (buf[0] === 0x89 && buf[1] === 0x50)   // PNG
               || (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57);  // WebP
    if (!valid) {
        try { fs.unlinkSync(tmpPath); } catch {}
        return { success: false, reason: 'invalid image format' };
    }

    try { fs.renameSync(tmpPath, destPath); } catch {
        try { fs.unlinkSync(tmpPath); } catch {}
        return { success: false, reason: 'rename failed' };
    }
    return { success: true };
}

// ---------------------------------------------------------------------------
// Upload to Supabase Storage (async)
// ---------------------------------------------------------------------------
async function uploadToStorage(localPath, slug) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const fileName = `${normalizeSlug(slug)}.jpg`;
    const fileBuffer = fs.readFileSync(localPath);
    const { data, error } = await supabase.storage
        .from('strains')
        .upload(fileName, fileBuffer, { contentType: 'image/jpeg', upsert: true });
    if (error) {
        // Try public URL path
        const { data: urlData } = supabase.storage.from('strains').getPublicUrl(fileName);
        return { success: false, error: error.message, publicUrl: urlData.publicUrl };
    }
    const { data: urlData } = supabase.storage.from('strains').getPublicUrl(fileName);
    return { success: true, publicUrl: urlData.publicUrl };
}

// ---------------------------------------------------------------------------
// DB update
// ---------------------------------------------------------------------------
async function updateStrainImageUrl(supabase, strainId, imageUrl) {
    const { error } = await supabase
        .from('strains')
        .update({ image_url: imageUrl })
        .eq('id', strainId);
    return { success: !error, error: error?.message };
}

// ---------------------------------------------------------------------------
// p-limit
// ---------------------------------------------------------------------------
function pLimit(concurrency) {
    if (concurrency < 1) throw new RangeError('concurrency must be > 0');
    const queue = [];
    let running = 0;
    function next() { running--; if (queue.length > 0) { const t = queue.shift(); running++; t.fn().then(t.resolve).catch(t.reject).finally(next); } }
    return (fn) => new Promise((resolve, reject) => {
        if (running < concurrency) { running++; fn().then(resolve).catch(reject).finally(next); }
        else queue.push({ fn, resolve, reject });
    });
}

// ---------------------------------------------------------------------------
// Process one strain
// ---------------------------------------------------------------------------
async function processStrain(supabase, strain, stats, lock) {
    const { id, slug, name } = strain;
    const key = slug || name;

    if (!FORCE && lock.processed.includes(key)) {
        stats.skipped++;
        return;
    }

    let imageUrl = null;
    let source = null;

    // Step 1: Try Leafly
    process.stdout.write(`  🌿 ${key} → Leafly... `);
    const leaflyResult = await tryLeafly(slug, name);
    if (leaflyResult) {
        imageUrl = leaflyResult.url; source = 'leafly';
        process.stdout.write(`✅\n`);
    } else {
        process.stdout.write(`❌ → Wikileaf... `);
        const wikileafResult = await tryWikileaf(slug, name);
        if (wikileafResult) {
            imageUrl = wikileafResult.url; source = 'wikileaf';
            process.stdout.write(`✅\n`);
        } else {
            process.stdout.write(`❌ → Picsum fallback\n`);
            imageUrl = getPicsumUrl(key); source = 'picsum';
        }
    }

    // Step 2: Download
    const tmpPath = path.join(TMP_DIR, `${key}.jpg`);
    process.stdout.write(`    ↓ Download... `);
    const dl = await downloadImage(imageUrl, tmpPath);
    if (!dl.success) { stats.failed++; markFailed(key, dl.reason); process.stdout.write(`❌ ${dl.reason}\n`); return; }
    process.stdout.write(`✅\n`);

    // Step 3: Upload to Storage
    process.stdout.write(`    ↑ Upload... `);
    const up = await uploadToStorage(tmpPath, key);
    if (!up.success) { stats.failed++; markFailed(key, up.error); process.stdout.write(`❌ ${up.error}\n`); return; }
    process.stdout.write(`✅ → ${up.publicUrl.slice(0, 60)}...\n`);

    // Step 4: Update DB
    process.stdout.write(`    💾 DB update... `);
    const db = await updateStrainImageUrl(supabase, id, up.publicUrl);
    if (!db.success) { stats.failed++; markFailed(key, db.error); process.stdout.write(`❌ ${db.error}\n`); return; }
    process.stdout.write(`✅\n`);

    // Cleanup
    try { fs.unlinkSync(tmpPath); } catch {}
    markProcessed(key);
    stats.success++;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    ensureTmpDir();
    const lock = loadLock();

    console.log('\n🖼️  GreenLog Image Pipeline  [PARALLELIZED]');
    console.log('='.repeat(50));
    console.log(`   Concurrency: ${CONCURRENT}x parallel`);
    console.log(`   Sources:     Leafly → Wikileaf → Picsum`);
    console.log(`   Storage:     Supabase strains bucket\n`);

    if (NEW_ONLY) console.log('   Mode:       NEW ONLY (missing images)\n');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch strains from DB
    let query = supabase.from('strains').select('id, slug, name, image_url').eq('is_custom', false);
    if (NEW_ONLY) query = query.or('image_url.is.null,image_url.like.%placeholder%');

    const { data: strains, error } = await query;
    if (error) { console.error('❌ DB error:', error.message); process.exit(1); }

    let toProcess = (strains || []).filter(s => FORCE || !lock.processed.includes(s.slug || s.name));
    if (LIMIT > 0) toProcess = toProcess.slice(0, LIMIT);

    console.log(`📋 ${toProcess.length} strains to process`);
    console.log(`   (${lock.processed.length} already done, ${lock.failed.length} failed)\n`);
    if (toProcess.length === 0) { console.log('Nothing to do.'); return; }

    const stats = { success: 0, failed: 0, skipped: 0 };
    const limit = pLimit(CONCURRENT);
    const start = Date.now();

    // Run all strains concurrently (limited by p-limit)
    const tasks = toProcess.map(strain =>
        limit(async () => {
            await processStrain(supabase, strain, stats, lock);
            stats._done = (stats._done || 0) + 1;
            const done = stats._done;
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            const rate = (done / (Date.now() - start) * 1000).toFixed(1);
            process.stdout.write(`\n📊 [${elapsed}s] ${done}/${toProcess.length} | ✅${stats.success} ❌${stats.failed} | ${rate}/s\n`);
            saveProgress({ ...stats, done, total: toProcess.length });
        })
    );

    await Promise.all(tasks);
    const total = ((Date.now() - start) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL REPORT');
    console.log('='.repeat(50));
    console.log(`✅ Success:  ${stats.success}`);
    console.log(`❌ Failed:   ${stats.failed}`);
    console.log(`⏭️  Skipped:  ${stats.skipped}`);
    console.log(`⏱  Time:     ${total}s  (~${(toProcess.length / parseFloat(total)).toFixed(1)}/s)`);
    console.log(`\n💾 Lock file: ${LOCK_FILE}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
