/**
 * leafly-sitemap-discoverer.mjs
 *
 * BFS-basiertes Leafly Strain Discovery Tool
 *   1. Startet von bekannten popular strains → scraped die Seite
 *   2. Extrahiert alle "Related Strains" Links von jeder Seite
 *   3. Queued neue Links recursiv → findet so ALLE existierenden Strain-Seiten
 *   4. Für JEDEN Link: Daten + Bild → DB upsert
 *
 * ✓ Nur garantiert existierende Seiten (BFS folgt nur Links die existieren)
 * ✓ Resume-fähig (State in .leafly-discoverer-state.json)
 * ✓ Dry-Run Modus
 *
 * Usage:
 *   node scripts/leafly-sitemap-discoverer.mjs --dry --limit 50    # Test
 *   node scripts/leafly-sitemap-discoverer.mjs --full             # Vollständig
 *   node scripts/leafly-sitemap-discoverer.mjs --resume            # Fortsetzen
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const STATE_FILE = path.join(PROJECT_ROOT, '.leafly-discoverer-state.json');
const DOTENV_PATH = path.join(PROJECT_ROOT, '.env');

// ── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FULL = args.includes('--full');
const RESUME = args.includes('--resume');
const LINKS_ONLY = args.includes('--links-only');
const LIMIT = parseArg('--limit', 0);
const CONCURRENT = parseArg('--concurrent', 3);
const POPULAR_STRAINS = [
  'https://www.leafly.com/strains/gorilla-glue',
  'https://www.leafly.com/strains/girl-scout-cookie',
  'https://www.leafly.com/strains/blue-dream',
  'https://www.leafly.com/strains/sour-diesel',
  'https://www.leafly.com/strains/og-kush',
  'https://www.leafly.com/strains/granddaddy-purple',
  'https://www.leafly.com/strains/white-widow',
  'https://www.leafly.com/strains/purple-haze',
  'https://www.leafly.com/strains/gelato',
  'https://www.leafly.com/strains/wedding-cake',
  'https://www.leafly.com/strains/gelato-33',
  'https://www.leafly.com/strains/grease-monkey',
  'https://www.leafly.com/strains/cookies-and-cream',
  'https://www.leafly.com/strains/dosi',
  'https://www.leafly.com/strains/apple-fritter',
  'https://www.leafly.com/strains/runtz',
  'https://www.leafly.com/strains/illegal-og',
  'https://www.leafly.com/strains/bubba-kush',
  'https://www.leafly.com/strains/ak-47',
  'https://www.leafly.com/strains/pineapple-express',
];

function parseArg(name, fallback) {
  const eq = args.find(a => a.startsWith(`${name}=`));
  if (eq) { const v = Number(eq.split('=').slice(1).join('=')); return Number.isFinite(v) ? v : fallback; }
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    const v = Number(args[idx + 1]); return Number.isFinite(v) ? v : fallback;
  }
  return fallback;
}

// ── Env ──────────────────────────────────────────────────────────────────────
import dotenv from 'dotenv';
dotenv.config({ path: DOTENV_PATH });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local'), override: false });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ .env fehlt: NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── State ────────────────────────────────────────────────────────────────────
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { /* ignore */ }
  }
  return {
    discovered: {},   // url → { scraped: bool, related: string[] }
    queue: [],         // URLs to scrape
    processed: [],     // URLs done
    inserted: 0, updated: 0, skipped: 0, errors: 0, duplicate_pages: 0,
    started_at: new Date().toISOString(),
  };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── HTTP Client ───────────────────────────────────────────────────────────────
const CURL_TIMEOUT = 20;

async function curl(url, timeout = CURL_TIMEOUT) {
  try {
    const { stdout } = await execAsync(
      `curl -sL --compressed --max-time ${timeout} -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" -H "Accept-Language: en-US,en;q=0.9" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" "${url.replace(/"/g, '\\"')}"`,
      { timeout: (timeout + 10) * 1000 }
    );
    return stdout || null;
  } catch { return null; }
}

// ── Extract Related Strain Links from HTML ───────────────────────────────────
function extractRelatedLinks(html, baseUrl) {
  const found = new Set();

  // Pattern 1: /strains/slug in hrefs
  const hrefMatches = [...html.matchAll(/href="(\/strains\/[^"?#]+)"/gi)];
  for (const m of hrefMatches) {
    const slug = m[1].replace(/\/$/, '').toLowerCase();
    if (slug && slug !== '/strains' && slug !== '/strains/') {
      found.add(`https://www.leafly.com${slug}`);
    }
  }

  // Pattern 2: full URLs to leafly.com/strains/
  const fullMatches = [...html.matchAll(/https:\/\/www\.leafly\.com\/strains\/[^"?#\s]+/gi)];
  for (const m of fullMatches) {
    const url = m[0].replace(/\/$/, '').toLowerCase();
    found.add(url);
  }

  return [...found];
}

// ── Leafly Page Parsing ───────────────────────────────────────────────────────
const TYPES_MAP = {
  'head': 'hybrid', 'indica': 'indica', 'sativa': 'sativa',
  'hybrid': 'hybrid', 'indica-dominant': 'indica', 'sativa-dominant': 'sativa',
  '均衡型': 'hybrid', 'indica-dominante': 'indica', 'sativa-dominante': 'sativa',
};

function isPlaceholderImage(url) {
  if (!url) return true;
  return /\/defaults\/|stock_|\.svg|leafly.*logo/i.test(url.toLowerCase());
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

function parseStrainPage(html, url) {
  const result = {
    leafly_url: url,
    slug: null, name: null, type: null,
    thc_min: null, thc_max: null, cbd_min: null, cbd_max: null,
    description: '', effects: [], flavors: [], terpenes: [],
    image_url: null, image_source: null,
    avg_thc: null, avg_cbd: null,
    found: false,
    related_links: [],
  };

  // ── 1. window.__INITIAL_STATE__ JSON ─────────────────────────────────────
  const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?})\s*;?\s*<\/script/s);
  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const detail = state?.strains?.detail?.data?.attributes;
      if (detail) {
        result.found = true;
        result.name = detail.name || null;
        result.slug = detail.slug || null;
        result.description = (detail.description || detail.intro || '')
          .replace(/<[^>]+>/g, '').trim().slice(0, 2000);

        if (detail.thc) {
          const m = String(detail.thc).match(/([\d.]+)/);
          if (m) result.avg_thc = parseFloat(m[1]);
        }
        if (detail.cbd) {
          const m = String(detail.cbd).match(/([\d.]+)/);
          if (m) result.avg_cbd = parseFloat(m[1]);
        }
        if (detail.type) {
          result.type = TYPES_MAP[detail.type?.toLowerCase()] || detail.type?.toLowerCase();
        }

        const effectsData = detail.positiveEffects || detail.effects || [];
        if (Array.isArray(effectsData)) {
          result.effects = effectsData.slice(0, 6).map(e =>
            typeof e === 'string' ? e : e.name || ''
          ).filter(Boolean);
        }

        const flavorsData = detail.flavors || detail.aromas || [];
        if (Array.isArray(flavorsData)) {
          result.flavors = flavorsData.slice(0, 5).map(f =>
            typeof f === 'string' ? f : f.name || ''
          ).filter(Boolean);
        }

        const terps = detail.terpenes || detail.dominantTerpenes || [];
        if (Array.isArray(terps)) {
          result.terpenes = terps.slice(0, 6).map(t => ({
            name: typeof t === 'string' ? t : t.name || t.terpene || '',
            amount: typeof t === 'object' && t.amount ? `${parseFloat(t.amount).toFixed(1)}%` : null,
          })).filter(t => t.name);
        }

        const imageData = extractBestImage(detail);
        if (imageData) {
          result.image_url = imageData.url;
          result.image_source = imageData.source;
        }

        // Extract related links from the page too
        result.related_links = extractRelatedLinks(html, url);
      }
    } catch { /* JSON failed, try next method */ }
  }

  // ── 2. Fallback: __NEXT_DATA__ ─────────────────────────────────────────────
  if (!result.found) {
    const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (nextMatch) {
      try {
        const nextData = JSON.parse(nextMatch[1]);
        const strain = nextData?.props?.pageProps?.strain;
        if (strain?.name) {
          result.found = true;
          result.name = strain.name;
          result.slug = strain.slug || url.split('/strains/')[1]?.replace(/\/$/, '') || null;
          result.description = (strain.descriptionPlain || strain.description || '')
            .replace(/<[^>]+>/g, '').trim().slice(0, 2000);
          if (strain.cannabinoids?.thc?.percentile50) result.avg_thc = parseFloat(strain.cannabinoids.thc.percentile50);
          if (strain.cannabinoids?.cbd?.percentile50) result.avg_cbd = parseFloat(strain.cannabinoids.cbd.percentile50);
          const imageData = extractBestImage(strain);
          if (imageData) { result.image_url = imageData.url; result.image_source = imageData.source; }
          result.related_links = extractRelatedLinks(html, url);
        }
      } catch { /* ignore */ }
    }
  }

  // ── 3. og:image fallback ─────────────────────────────────────────────────
  if (!result.image_url) {
    const decoded = html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const ogMatch = decoded.match(/<meta\s+[^>]*(?:property|content)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (ogMatch) { result.image_url = ogMatch[1]; result.image_source = 'leafly_og'; }
  }

  // ── 4. THC Range aus Text ─────────────────────────────────────────────────
  if (!result.avg_thc) {
    const thc = html.match(/THC[^>]*?>?\s*([\d.]+)\s*[-–]\s*([\d.]+)/i)
             || html.match(/THC[^>]*?>?\s*([\d.]+)\s*%/i);
    if (thc) {
      result.thc_min = parseFloat(thc[1]);
      result.thc_max = thc[2] ? parseFloat(thc[2]) : parseFloat(thc[1]);
      result.avg_thc = result.thc_min;
    }
  }

  // ── 5. Type aus Meta ─────────────────────────────────────────────────────
  if (!result.type) {
    const typeMatch = html.match(/<meta[^>]+name=["']og:type["'][^>]+content=["']([^"']+)["']/i);
    if (typeMatch) {
      const t = typeMatch[1].toLowerCase();
      if (t.includes('indica')) result.type = 'indica';
      else if (t.includes('sativa')) result.type = 'sativa';
      else if (t.includes('hybrid')) result.type = 'hybrid';
    }
  }

  // Related links even if page not fully parsed
  if (!result.found) {
    result.related_links = extractRelatedLinks(html, url);
  }

  return result;
}

// ── DB Operations ─────────────────────────────────────────────────────────────
function slugify(name) {
  return (name || '')
    .toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function clampThc(v) {
  if (v == null || v <= 0 || v >= 100) return null;
  return parseFloat(parseFloat(v).toFixed(1));
}

function clampCbd(v) {
  if (v == null || v < 0 || v >= 100) return null;
  return parseFloat(parseFloat(v).toFixed(1));
}

async function upsertStrain(data) {
  if (!data.found || !data.name) return { action: 'skip', reason: 'not_found' };

  const slug = data.slug || slugify(data.name);

  const { data: existing } = await supabase
    .from('strains')
    .select('id, name, thc_min, thc_max, description, image_url')
    .eq('slug', slug)
    .maybeSingle();

  const insertData = {
    name: data.name.trim(),
    slug,
    type: data.type || 'hybrid',
    thc_min: clampThc(data.thc_min ?? data.avg_thc),
    thc_max: clampThc(data.thc_max ?? data.avg_thc),
    cbd_min: clampCbd(data.cbd_min ?? data.avg_cbd),
    cbd_max: clampCbd(data.cbd_max ?? data.avg_cbd),
    description: data.description?.slice(0, 2000) || null,
    effects: data.effects?.filter(Boolean).slice(0, 10) || [],
    flavors: data.flavors?.filter(Boolean).slice(0, 10) || [],
    terpenes: data.terpenes?.filter(t => t.name).slice(0, 10) || [],
    image_url: data.image_url || null,
    image_attribution: data.image_url ? { source: 'leafly', subtype: data.image_source || 'unknown', url: data.leafly_url } : { source: 'none' },
  };

  if (existing) {
    const updateFields = {};
    for (const [k, v] of Object.entries(insertData)) {
      if (k === 'name' || k === 'slug' || k === 'type') continue;
      if (k === 'image_url' && !v) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (k === 'image_attribution' && insertData.image_url) updateFields[k] = v;
      else if (k !== 'image_attribution') updateFields[k] = v;
    }
    if (Object.keys(updateFields).length === 0) return { action: 'skip', reason: 'no_new_data' };
    const { error } = await supabase.from('strains').update(updateFields).eq('id', existing.id);
    if (error) return { action: 'error', reason: error.message };
    return { action: 'update', id: existing.id };
  } else {
    const { error } = await supabase.from('strains').insert(insertData).select('id').single();
    if (error) return { action: 'error', reason: error.message };
    return { action: 'insert', id: error?.id };
  }
}

// ── Semaphore ─────────────────────────────────────────────────────────────────
function pLimit(concurrency) {
  if (concurrency < 1) throw new RangeError('Expected concurrency > 0');
  const queue = [];
  let running = 0;
  function next() { running--; if (queue.length > 0) { const { fn, resolve, reject } = queue.shift(); run(fn, resolve, reject); } }
  async function run(fn, resolve, reject) { running++; try { resolve(await fn()); } catch (err) { reject(err); } finally { next(); } }
  return function enqueue(fn) { return new Promise((resolve, reject) => { if (running < concurrency) run(fn, resolve, reject); else queue.push({ fn, resolve, reject }); }); };
}

// ── BFS Discovery + Scrape Loop ──────────────────────────────────────────────
async function discoverAndScrape(state) {
  const limit = pLimit(CONCURRENT);
  const maxTotal = LIMIT > 0 && !FULL ? LIMIT : Infinity;
  // Ensure arrays exist
  if (!state.discovered) state.discovered = {};
  if (!state.queue) state.queue = [];
  if (!state.processed) state.processed = [];

  const seen = new Set(Object.keys(state.discovered));
  const toQueue = [];

  // Seed queue with popular strains if new
  if (seen.size === 0 && (state.queue || []).length === 0) {
    for (const url of POPULAR_STRAINS) {
      if (!seen.has(url)) toQueue.push(url);
    }
  }

  // Add any queued items
  for (const url of state.queue) {
    if (!seen.has(url) && toQueue.length < maxTotal) toQueue.push(url);
  }

  if (toQueue.length === 0) {
    console.log('\n✅ Nichts mehr zu entdecken!');
    return;
  }

  console.log(`\n🚀 Starte BFS Discovery + Scraping...`);
  console.log(`   Queue: ${toQueue.length} neue Seeds | Bekannt: ${seen.size} | Limit: ${LIMIT > 0 && !FULL ? LIMIT : 'unbegrenzt'}\n`);

  let totalProcessed = 0;
  const startTime = Date.now();

  while (toQueue && toQueue.length > 0 && totalProcessed < maxTotal) {
    // Refill queue batch
    const batch = [];
    while (toQueue && toQueue.length > 0 && batch.length < 50) {
      const url = toQueue.shift();
      if (!seen.has(url)) batch.push(url);
    }

    if (!batch || batch.length === 0) break;

    // Scrape batch concurrently
    const tasks = batch.map(url =>
      limit(async () => {
        const idx = totalProcessed + 1;
        process.stdout.write(`[${idx}/${seen.size + toQueue.length + batch.length}] ${url.replace('https://www.leafly.com/strains/', '')} ... `);

        // Mark as discovered (may be scraped async later)
        if (!state.discovered[url]) {
          state.discovered[url] = { scraped: false, related: [] };
        }

        const html = await curl(url, 20);
        if (!html) {
          console.log('⚠️  Fetch fehlgeschlagen');
          state.errors++;
          state.processed.push(url);
          seen.add(url);
          totalProcessed++;
          saveState(state);
          return;
        }

        const data = parseStrainPage(html, url);

        if (data.related_links && data.related_links.length > 0) {
          state.discovered[url].related = data.related_links;
          let newLinks = 0;
          for (const rel of data.related_links) {
            if (!seen.has(rel) && !toQueue.includes(rel)) {
              toQueue.push(rel);
              newLinks++;
            }
          }
          if (newLinks > 0) {
            process.stdout.write(` (+${newLinks} neue Links) `);
          }
        }

        if (!data.found || !data.name) {
          console.log('⚠️  Parse fehlgeschlagen');
          state.skipped++;
          state.processed.push(url);
          state.discovered[url].scraped = false;
          seen.add(url);
          totalProcessed++;
          saveState(state);
          return;
        }

        // Mark scraped
        state.discovered[url].scraped = true;

        if (DRY) {
          console.log(`✅ DRY: "${data.name}" (${data.type || '?'}) THC:${data.avg_thc || '?'} CBD:${data.avg_cbd || '?'} img:${data.image_url ? 'ja' : 'nein'}`);
          state.duplicate_pages++;
          seen.add(url);
          totalProcessed++;
          state.processed.push(url);
          saveState(state);
          return;
        }

        const result = await upsertStrain(data);

        if (result.action === 'insert') {
          console.log(`✅ INSERT: "${data.name}"`);
          state.inserted++;
        } else if (result.action === 'update') {
          console.log(`🔄 UPDATE: "${data.name}"`);
          state.updated++;
        } else if (result.action === 'skip') {
          state.skipped++;
        } else {
          console.log(`❌ DB: ${result.reason}`);
          state.errors++;
        }

        seen.add(url);
        totalProcessed++;
        state.processed.push(url);
        saveState(state);

        // Progress
        if (totalProcessed % 25 === 0) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const rate = Math.round(totalProcessed / (elapsed / 60));
          console.log(`\n   📊 ${totalProcessed} verarbeitet | ${toQueue.length} in Queue | Rate: ~${rate}/min\n`);
        }
      })
    );

    await Promise.all(tasks);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🏁 FERTIG in ${elapsed}s`);
  console.log(`   🌐 Unique URLs entdeckt: ${Object.keys(state.discovered).length}`);
  console.log(`   ✅ Inserted: ${state.inserted}`);
  console.log(`   🔄 Updated: ${state.updated}`);
  console.log(`   ⏭️  Skipped: ${state.skipped}`);
  console.log(`   ❌ Errors: ${state.errors}`);
  console.log(`   📊 Gesamt verarbeitet: ${totalProcessed}`);

  if (!DRY && (state.inserted > 0 || state.updated > 0)) {
    console.log(`\n🌿 ${state.inserted} neue Strains zur DB hinzugefügt, ${state.updated} aktualisiert.`);
  }

  if (toQueue.length > 0) {
    console.log(`\n⏸️  ${toQueue.length} URLs noch in Queue.`);
    console.log(`   Weiter mit: node scripts/leafly-sitemap-discoverer.mjs --resume`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌿 Leafly BFS Discoverer + Scraper\n');
  console.log(`   Modus: ${DRY ? 'DRY (kein DB-Write)' : LINKS_ONLY ? 'LINKS ONLY' : 'LIVE'}`);
  console.log(`   Concurrent: ${CONCURRENT}\n`);

  const state = loadState();

  if (RESUME) {
    console.log('📂 Resume: Lade vorherigen Stand...');
    console.log(`   Bereits entdeckt: ${Object.keys(state.discovered).length}`);
    console.log(`   Davon gescraped: ${Object.values(state.discovered).filter(d => d.scraped).length}`);
    console.log(`   Inserted so far: ${state.inserted}`);
  }

  await discoverAndScrape(state);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
