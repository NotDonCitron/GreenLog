/**
 * leafly-full-scraper.mjs
 *
 * Scrapt Leafly-Seiten für alle oder ausgewählte Strains.
 * Lädt Bilder herunter und updatet DB + Supabase Storage.
 *
 * Usage:
 *   node scripts/leafly-full-scraper.mjs --dry                      # Testlauf mit 5 Strains
 *   node scripts/leafly-full-scraper.mjs --limit 50                # Nur 50 Strains
 *   node scripts/leafly-full-scraper.mjs --concurrent 3            # 3 parallele Requests (Standard)
 *   node scripts/leafly-full-scraper.mjs --wishlist --concurrent 3  # DB-Strains ohne Bild
 *
 * Daten die gescrapt werden:
 *   - THC / CBD Range
 *   - Description
 *   - Effects (aus Leafly)
 *   - Flavors (aus Leafly)
 *   - Terpene + %
 *   - Bild-URL → Download → Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const envPath = path.join(PROJECT_ROOT, '.env');
const STATE_FILE = path.join(PROJECT_ROOT, 'scraper-state.json');

dotenv.config({ path: envPath });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local'), override: false });

// ── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const WISHLIST = args.includes('--wishlist');
const LIMIT = parseArg('--limit', 0);          // 0 = alle
const CONCURRENT = parseArg('--concurrent', 3);
const BATCH_SIZE = 20;                          // DB-Updates in Blöcken

function parseArg(name, fallback) {
  const eq = args.find(a => a.startsWith(`${name}=`));
  if (eq) {
    const v = Number(eq.split('=').slice(1).join('='));
    return Number.isFinite(v) ? v : fallback;
  }
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    const v = Number(args[idx + 1]);
    return Number.isFinite(v) ? v : fallback;
  }
  return fallback;
}

// ── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ .env fehlt: NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── State ─────────────────────────────────────────────────────────────────────
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch { /* ignore */ }
  }
  return { processed: [], failed: [], imagesPending: [], updated: 0, errors: 0 };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── HTTP Client ──────────────────────────────────────────────────────────────
const TYPES_MAP = {
  'head': 'hybrid', 'indica': 'indica', 'sativa': 'sativa',
  'hybrid': 'hybrid', 'indica-dominant': 'indica', 'sativa-dominant': 'sativa',
  '均衡型': 'hybrid', 'indica-dominante': 'indica', 'sativa-dominante': 'sativa',
};

async function fetchLeaflyPage(strainName) {
  const slug = strainName.toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const url = `https://leafly.com/strains/${slug}`;

  let text;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (res.status === 404) return null;
    if (res.status === 429 || res.status === 403) {
      throw new Error(`HTTP ${res.status} — Rate limit`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    text = await res.text();
  } catch (e) {
    if (e.message?.includes('Rate limit') || e.message?.includes('timeout')) {
      // Backoff für diesen Batch
      console.warn(`   ⚠️  Rate limit/getimed out, warte 30s...`);
      await sleep(30000);
    }
    throw e;
  }

  return parseLeaflyHTML(text, slug, strainName);
}

function parseLeaflyHTML(html, slug, strainName) {
  const result = { slug, image_url: null, thc_min: null, thc_max: null,
    cbd_min: null, cbd_max: null, description: '', effects: [], flavors: [],
    terpenes: [], avg_thc: null, avg_cbd: null, type: null };

  // ── 1. window.__INITIAL_STATE__ JSON ────────────────────────────────────
  const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?})\s*;?\s*<\/script/s);
  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);

      // Strain Detail
      const detail = state?.strains?.detail?.data?.attributes;
      if (detail) {
        result.description = detail.description || detail.intro || '';
        result.description = result.description.replace(/<[^>]+>/g, '').trim().slice(0, 2000);

        // THC
        if (detail.thc) {
          const m = String(detail.thc).match(/([\d.]+)/);
          if (m) result.avg_thc = parseFloat(m[1]);
        }
        // CBD
        if (detail.cbd) {
          const m = String(detail.cbd).match(/([\d.]+)/);
          if (m) result.avg_cbd = parseFloat(m[1]);
        }

        // Type
        if (detail.type) {
          result.type = TYPES_MAP[detail.type?.toLowerCase()] || detail.type?.toLowerCase();
        }

        // Effects aus "positiveEffects" oder "effects"
        const effectsData = detail.positiveEffects || detail.effects || [];
        if (Array.isArray(effectsData)) {
          result.effects = effectsData.slice(0, 6).map(e =>
            typeof e === 'string' ? e : e.name || ''
          ).filter(Boolean);
        }

        // Flavors
        const flavorsData = detail.flavors || detail.aromas || [];
        if (Array.isArray(flavorsData)) {
          result.flavors = flavorsData.slice(0, 5).map(f =>
            typeof f === 'string' ? f : f.name || ''
          ).filter(Boolean);
        }

        // Terpene
        const terps = detail.terpenes || detail.dominantTerpenes || [];
        if (Array.isArray(terps)) {
          result.terpenes = terps.slice(0, 6).map(t => ({
            name: typeof t === 'string' ? t : t.name || t.terpene || '',
            amount: typeof t === 'object' && t.amount ? `${parseFloat(t.amount).toFixed(1)}%` : null,
          })).filter(t => t.name);
        }

        // Image
        if (detail.image_url || detail.imageUrl || detail.image) {
          result.image_url = detail.image_url || detail.imageUrl || detail.image;
        }
      }

      // Fallback: legacy layout
      if (!result.image_url) {
        const legacy = state?.strains?.strainsLayout?.data?.attributes;
        if (legacy?.image) result.image_url = legacy.image;
      }
    } catch (e) {
      // JSON parse fehlgeschlagen, weiter mit Meta-Tags
    }
  }

  // ── 2. Meta Tags Fallback ───────────────────────────────────────────────
  if (!result.image_url) {
    const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
               || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogImg) result.image_url = ogImg[1];
  }

  // ── 3. Meta description Fallback ────────────────────────────────────────
  if (!result.description) {
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (desc) result.description = desc[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
  }

  // ── 4. THC/CBD Range aus Meta oder Text ────────────────────────────────
  if (!result.avg_thc) {
    const thc = html.match(/THC[^>]*?>?\s*([\d.]+)\s*[-–]\s*([\d.]+)/i)
             || html.match(/THC[^>]*?>?\s*([\d.]+)\s*%/i);
    if (thc) {
      result.thc_min = parseFloat(thc[1]);
      result.thc_max = thc[2] ? parseFloat(thc[2]) : parseFloat(thc[1]);
      result.avg_thc = result.thc_min;
    }
  }
  if (!result.avg_cbd) {
    const cbd = html.match(/CBD[^>]*?>?\s*([\d.]+)\s*[-–]\s*([\d.]+)/i)
             || html.match(/CBD[^>]*?>?\s*([\d.]+)\s*%/i);
    if (cbd) {
      result.cbd_min = parseFloat(cbd[1]);
      result.cbd_max = cbd[2] ? parseFloat(cbd[2]) : parseFloat(cbd[1]);
      result.avg_cbd = result.cbd_min;
    }
  }

  return result;
}

// ── Image Download & Upload ───────────────────────────────────────────────────
const BUCKET = 'strains';

async function ensureBucket() {
  const { error } = await supabase.storage.getBucket(BUCKET).catch(() => ({ error: true }));
  if (error) {
    try {
      await supabase.storage.createBucket(BUCKET, { public: true });
      console.log('   📦 Bucket "strains" erstellt');
    } catch { /* evtl. schon vorhanden */ }
  }
}

async function uploadImage(imageUrl, strainSlug) {
  if (!imageUrl || imageUrl.includes('data:image') || imageUrl.includes('placeholder')) {
    return null;
  }

  const ext = (imageUrl.match(/\.(jpg|jpeg|png|webp)\??/) || ['.jpg'])[0].split('?')[0];
  const fileName = `${strainSlug}${ext}`;
  const storagePath = `images/${fileName}`;

  // Check ob schon hochgeladen
  const { data: ex } = await supabase.storage.from(BUCKET).list('images', { search: fileName });
  if (ex?.length > 0) {
    const { data: url } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return url.publicUrl;
  }

  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(storagePath, buf, { contentType, upsert: true });

    if (upErr) throw upErr;

    const { data: url } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return url.publicUrl;
  } catch (e) {
    console.warn(`   ⚠️  Bild-Upload fehlgeschlagen: ${e.message}`);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function slugify(name) {
  return name.toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── Semaphore für Concurrency ────────────────────────────────────────────────
class Semaphore {
  constructor(n) { this.n = n; this.waiting = []; }
  async acquire() {
    if (this.n > 0) { this.n--; return; }
    await new Promise(r => this.waiting.push(r));
  }
  release() {
    if (this.waiting.length > 0) { const next = this.waiting.shift(); next(); }
    else this.n++;
  }
}

// ── Wishlist Helper (paginated) ───────────────────────────────────────────
async function getWishlist() {
  console.log('📋 Lade Wishlist (alle Strains ohne Bild)...');
  const CHUNK = 1000;
  let allStrains = [];
  let page = 0;
  while (true) {
    const { data: chunk, error } = await supabase
      .from('strains')
      .select('id, name, slug, image_url, description, effects, flavors, avg_thc, avg_cbd, type, brand, source')
      .range(page * CHUNK, (page + 1) * CHUNK - 1);
    if (error) { console.error('❌ DB Fehler:', error.message); process.exit(1); }
    if (!chunk || chunk.length === 0) break;
    allStrains.push(...chunk);
    if (chunk.length < CHUNK) break;
    page++;
    if (page >= 50) break; // Safety: max 50k rows
  }
  const strains = allStrains.filter(s => !s.image_url);
  console.log(`   ${strains.length} Strains ohne Bild (von ${allStrains.length} geladen)`);
  return strains;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌿 Leafly Full Scraper');
  console.log('='.repeat(50));
  if (DRY) console.log('⚠️  DRY RUN (5 Strains)\n');
  if (WISHLIST) console.log('🎯 Wishlist-Modus: Strains ohne Bild\n');

  // ── 1. Strains aus DB holen ─────────────────────────────────────────────
  let target;
  if (WISHLIST) {
    target = await getWishlist();
  } else {
    let { data, error } = await supabase
      .from('strains')
      .select('id, name, slug, image_url, description, effects, flavors, avg_thc, avg_cbd, type, brand, source')
      .limit(10000);
    if (error) { console.error('❌ DB Fehler:', error.message); process.exit(1); }
    target = data;
    console.log(`📋 ${target.length} Strains in der DB`);
  }
  if (DRY) target = target.slice(0, 5);
  if (LIMIT > 0) target = target.slice(0, LIMIT);

  console.log(`📊 ${target.length} Strains zu scrappen`);
  if (target.length === 0) { console.log('✅ Nichts zu tun'); return; }
  console.log(`⚡ Concurrency: ${CONCURRENT}\n`);

  // ── 2. State laden ──────────────────────────────────────────────────────
  const state = loadState();
  // processed: Strings (erfolgreich), failed: Objekte {id, reason}
  const processedSet = new Set(state.processed);
  state.failed.forEach(f => processedSet.add(String(f.id)));
  target = target.filter(s => !processedSet.has(String(s.id)));

  if (target.length === 0) {
    console.log('✅ Alle Strains bereits verarbeitet');
    console.log(`   Gesamt bisher: ${state.updated ?? 0} updated, ${state.errors ?? 0} errors`);
    return;
  }

  console.log(`📋 ${target.length} neue Strains (${state.updated ?? 0} bereits done)\n`);

  // ── 3. Scraper ─────────────────────────────────────────────────────────
  await ensureBucket();
  const sem = new Semaphore(CONCURRENT);
  let updated = 0, errors = 0, skipped = 0, imgDone = 0;
  let pendingUpdates = [];          // ← lokal, kein shared state
  let flushing = false;
  const startTime = Date.now();

  async function tryFlush() {
    if (flushing || pendingUpdates.length < BATCH_SIZE) return;
    flushing = true;
    const batch = pendingUpdates.splice(0);
    flushing = false;
    await flushUpdates(batch);
  }

  const tasks = target.map((strain, idx) => async () => {
    await sem.acquire();
    try {
      const result = await fetchLeaflyPage(strain.name);

      if (!result) {
        skipped++;
        state.failed.push({ id: strain.id, reason: '404 not found' });
        // nicht in processed — failed reicht für Skip-Logik
      } else {
        // Bild upload
        let finalImageUrl = strain.image_url;
        if (result.image_url && !strain.image_url) {
          const uploaded = await uploadImage(result.image_url, strain.slug || slugify(strain.name));
          if (uploaded) { finalImageUrl = uploaded; imgDone++; }
        }

        const update = { id: strain.id };
        if (result.description && !strain.description) update.description = result.description.slice(0, 2000);
        if (result.effects.length > 0 && !strain.effects?.length) update.effects = result.effects.slice(0, 8);
        if (result.flavors.length > 0 && !strain.flavors?.length) update.flavors = result.flavors.slice(0, 6);

        const clampThc = v => v != null && v > 0 && v < 100 ? parseFloat(v.toFixed(1)) : null;
        const clampCbd = v => v != null && v >= 0 && v < 100 ? parseFloat(v.toFixed(1)) : null;

        if (result.avg_thc && !strain.avg_thc) {
          const t = clampThc(result.avg_thc);
          if (t) { update.avg_thc = t; update.thc_min = t; update.thc_max = t; }
        }
        if (result.avg_cbd && !strain.avg_cbd) {
          const c = clampCbd(result.avg_cbd);
          if (c) { update.avg_cbd = c; update.cbd_min = c; update.cbd_max = c; }
        }
        if (result.terpenes.length > 0) update.terpenes = result.terpenes.slice(0, 6);
        if (result.type && !strain.type) update.type = result.type;

        // Bild NUR setzen wenn hochgeladen
        if (finalImageUrl) update.image_url = finalImageUrl;

        // NUR in DB updaten wenn wirklich was Neues da ist
        if (Object.keys(update).length > 1) {
          pendingUpdates.push(update);
          updated++;
          state.processed.push(String(strain.id));
        } else {
          // Nix Neues → trotzdem als "processed" markieren
          state.processed.push(String(strain.id));
        }

        // Batch flush bei 20
        tryFlush();
      }
    } catch (e) {
      errors++;
      state.failed.push({ id: strain.id, error: e.message });
      // nicht in processed — failed reicht für Skip-Logik
    } finally {
      sem.release();

      const pct = (((idx + 1) / target.length) * 100).toFixed(0);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      if ((idx + 1) % 20 === 0 || idx + 1 === target.length) {
        console.log(`   📊 ${idx + 1}/${target.length} (${pct}%) | OK:${updated} ERR:${errors} SKIP:${skipped} IMG:${imgDone} | ${elapsed}s`);
      }
    }
  });

  // ── Launch mit Semaphore ────────────────────────────────────────────────
  const running = [];
  for (const task of tasks) {
    running.push(task());
    if (running.filter(p => p._fulfilled !== false).length >= CONCURRENT) {
      await Promise.race(running);
      // alte finished entfernen
      for (let i = running.length - 1; i >= 0; i--) {
        try { await running[i]; running.splice(i, 1); } catch { running.splice(i, 1); }
      }
    }
  }
  await Promise.allSettled(running);

  // Final flush
  if (pendingUpdates.length > 0) await flushUpdates(pendingUpdates);

  // State speichern
  state.updated += updated;
  state.errors += errors;
  saveState(state);

  const totalSecs = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(50));
  console.log('📊 SCRAPE REPORT');
  console.log('='.repeat(50));
  console.log(`✅ Verarbeitet: ${updated}  |  ❌ Errors: ${errors}  |  ⏭️  Kein Treffer: ${skipped}`);
  console.log(`📸 Bilder hochgeladen: ${imgDone}`);
  console.log(`⏱  Zeit: ${totalSecs}s`);
  console.log(`📈 Rate: ${(updated / Number(totalSecs)).toFixed(1)} strains/sec`);
  console.log('');
  console.log('💾 State gespeichert → Resume mit demselben Befehl möglich');
  console.log('   Falls Rate-Limited: einfach 5min warten und nochmal starten');
}

async function flushUpdates(updates) {
  if (updates.length === 0) return;
  // Nur non-null Felder mitsenden
  const clean = updates.map(u => Object.fromEntries(Object.entries(u).filter(([, v]) => v !== undefined)));
  try {
    // Update via .eq('id') statt upsert — garantiert UPDATE, kein INSERT-Versuch
    const results = await Promise.allSettled(
      clean.map(u => {
        const { id, ...fields } = u;
        return supabase.from('strains').update(fields).eq('id', id);
      })
    );
    const failed = results.filter(r => r.status === 'rejected' || r.value?.error);
    if (failed.length > 0) {
      console.error(`   ⚠️  ${failed.length} Einzelupdates fehlgeschlagen`);
    }
  } catch (e) {
    console.error(`   ⚠️  Flush-Fehler: ${e.message}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
