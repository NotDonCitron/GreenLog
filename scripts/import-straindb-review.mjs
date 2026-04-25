#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { validateImage } from './lib/image-validator.mjs';

const STRAINDB_ORIGIN = 'https://strain-database.com';
const DEFAULT_DELAY_MS = 900;
const DEFAULT_LIMIT = 25;
const DEFAULT_PAGES = 2;
const REPORT_DIR = path.resolve('scripts/output');
const HASH_LOG = path.resolve('scripts/.straindb-image-hashes.json');
const PUBLIC_BASE_PATH = (process.env.IMAGE_PUBLIC_BASE_PATH || '/media').trim().replace(/\/+$/, '') || '/media';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT = parseNumberArg('--limit', DEFAULT_LIMIT);
const PAGES = parseNumberArg('--pages', DEFAULT_PAGES);
const DELAY_MS = parseNumberArg('--delay', DEFAULT_DELAY_MS);
const START_PAGE = parseNumberArg('--start-page', 1);
const REQUIRE_IMAGE = !args.includes('--allow-no-image');
const UPDATE_EXISTING = args.includes('--update-existing');
const INPUT_FILE = parseStringArg('--input');
const SLUGS = parseListArg('--slugs');
const OUTPUT_JSON = parseStringArg('--output');
const OUTPUT_JSONL = parseStringArg('--jsonl');

const DEFAULT_DISCOVERY_SLUGS = [
  'blue-zushi',
  'slurrbanger',
  'platinum-zushi',
  'platinum-zurkle',
  'platinum-dosha',
  'permanent-velvet',
  'jet-fuel-gelato',
  'animal-face',
  'jealousy',
  'zkittlez',
  'mac-burger',
  'forbidden-applez',
  'mango-bb',
  'super-lemon-haze',
  'strawberry-cough',
  'green-crack',
  'sour-tangie',
  'purple-haze',
  'trainwreck',
  'hawaiian-snow',
];

function parseNumberArg(name, fallback) {
  const eqArg = args.find((arg) => arg.startsWith(`${name}=`));
  if (eqArg) {
    const value = Number(eqArg.split('=').slice(1).join('='));
    return Number.isFinite(value) ? value : fallback;
  }

  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    const value = Number(args[idx + 1]);
    return Number.isFinite(value) ? value : fallback;
  }

  return fallback;
}

function parseStringArg(name) {
  const eqArg = args.find((arg) => arg.startsWith(`${name}=`));
  if (eqArg) return eqArg.split('=').slice(1).join('=').trim() || null;

  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1].trim() || null;
  }

  return null;
}

function parseListArg(name) {
  const value = parseStringArg(name);
  if (!value) return [];
  return value.split(',').map((item) => normalizeSlug(item)).filter(Boolean);
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function createSupabase() {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );
}

function createS3() {
  return new S3Client({
    endpoint: requiredEnv('MINIO_ENDPOINT'),
    region: process.env.MINIO_REGION?.trim() || 'eu-central-1',
    credentials: {
      accessKeyId: requiredEnv('MINIO_ACCESS_KEY'),
      secretAccessKey: requiredEnv('MINIO_SECRET_KEY'),
    },
    forcePathStyle: process.env.MINIO_FORCE_PATH_STYLE?.trim() !== 'false',
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanText(value, maxLength = 5000) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function validType(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('indica')) return 'indica';
  if (normalized.includes('sativa')) return 'sativa';
  if (normalized.includes('ruderalis')) return 'ruderalis';
  return 'hybrid';
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function namesFromItems(items, limit = 8) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const names = [];

  for (const item of items) {
    const name = cleanText(typeof item === 'string' ? item : item?.name, 64);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= limit) break;
  }

  return names;
}

function terpenesFromItems(items, limit = 8) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const terpenes = [];

  for (const item of items) {
    const name = cleanText(typeof item === 'string' ? item : item?.name, 64);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const percent =
      asNumber(item?.percentageMax) ??
      asNumber(item?.percentageMin) ??
      asNumber(item?.percent);

    terpenes.push(percent == null ? name : { name, percent });
    if (terpenes.length >= limit) break;
  }

  return terpenes;
}

function buildGenetics(data) {
  const parents = [cleanText(data.parent1Name, 96), cleanText(data.parent2Name, 96)].filter(Boolean);
  if (parents.length === 2) return `${parents[0]} x ${parents[1]}`;
  if (parents.length === 1) return parents[0];
  return null;
}

function buildFloweringTime(data) {
  const min = asNumber(data.floweringDaysMin);
  const max = asNumber(data.floweringDaysMax);
  if (min != null && max != null) return min === max ? `${min} days` : `${min}-${max} days`;
  if (min != null) return `${min} days`;
  if (max != null) return `${max} days`;
  return null;
}

function absoluteStrainDbUrl(url) {
  if (!url) return null;
  try {
    return new URL(url, STRAINDB_ORIGIN).toString();
  } catch {
    return null;
  }
}

function isRejectableImageUrl(url) {
  const value = String(url || '').toLowerCase();
  return (
    !url ||
    value.includes('placeholder') ||
    value.includes('default') ||
    value.includes('logo') ||
    value.includes('/breeders/')
  );
}

function buildImageCandidates(data) {
  const candidates = [];
  const primary = absoluteStrainDbUrl(data.primaryImageUrl);
  if (primary && !isRejectableImageUrl(primary)) {
    candidates.push({ url: primary, source: 'straindb_primary' });
  }
  return candidates;
}

function mapStrainDbPayload(data) {
  const slug = normalizeSlug(data.slug || data.name);
  const sourceUrl = data.sourceUrl || `${STRAINDB_ORIGIN}/strains/${slug}`;
  const strainDbUrl = `${STRAINDB_ORIGIN}/strains/${slug}`;
  const description = cleanText(data.descriptionDe || data.description, 6000);
  const breeder = cleanText(data.breederName || data.breeder?.name, 128);
  const sourceNotes = [
    `StrainDB review import: ${strainDbUrl}`,
    data.sourceUrl ? `Original source: ${data.sourceUrl}` : null,
    data.dataQualityScore != null ? `StrainDB quality score: ${data.dataQualityScore}` : null,
  ].filter(Boolean).join('\n');

  return {
    name: cleanText(data.name, 160),
    slug,
    type: validType(data.strainType),
    description,
    thc_min: asNumber(data.thcPercentMin),
    thc_max: asNumber(data.thcPercentMax),
    cbd_min: asNumber(data.cbdPercentMin),
    cbd_max: asNumber(data.cbdPercentMax),
    avg_thc: asNumber(data.thcPercentMax ?? data.thcPercentMin),
    avg_cbd: asNumber(data.cbdPercentMax ?? data.cbdPercentMin),
    breeder,
    genetics: buildGenetics(data),
    flowering_time: buildFloweringTime(data),
    grow_difficulty: cleanText(data.difficulty, 64),
    effects: namesFromItems(data.effects, 10),
    flavors: namesFromItems(data.flavors, 10),
    terpenes: terpenesFromItems(data.terpenes, 10),
    publication_status: 'review',
    primary_source: 'straindb',
    source: 'strain-database.com',
    source_notes: sourceNotes,
    source_provenance: {
      strain_database: {
        url: strainDbUrl,
        api_url: `${STRAINDB_ORIGIN}/api/strains/${slug}`,
        source_url: sourceUrl,
        data_quality_score: data.dataQualityScore ?? null,
        popularity_score: data.popularityScore ?? null,
        scraped_at: new Date().toISOString(),
      },
    },
    meta_sources: ['strain-database.com'],
    image_attribution: {
      source: 'strain-database.com',
      url: strainDbUrl,
      original_url: sourceUrl,
    },
    imageCandidates: buildImageCandidates(data),
    raw: data,
  };
}

function completeness(candidate, imageAsset) {
  const missing = [];
  if (!candidate.name) missing.push('name');
  if (!candidate.slug) missing.push('slug');
  if (!candidate.type) missing.push('type');
  if (!candidate.description) missing.push('description');
  if (candidate.thc_min == null && candidate.thc_max == null) missing.push('thc');
  if (candidate.cbd_min == null && candidate.cbd_max == null) missing.push('cbd');
  if ((candidate.terpenes?.length || 0) < 2) missing.push('terpenes');
  if ((candidate.flavors?.length || 0) < 1) missing.push('flavors');
  if ((candidate.effects?.length || 0) < 1) missing.push('effects');
  if (!imageAsset?.publicUrl) missing.push('image');
  return { missing, score: Math.round(((10 - missing.length) / 10) * 100) };
}

async function loadExistingStrainIndex(supabase) {
  const bySlug = new Map();
  const byName = new Map();
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from('strains')
      .select('id,name,slug,publication_status,primary_source')
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) throw error;
    const rows = data || [];
    for (const row of rows) {
      bySlug.set(normalizeSlug(row.slug), row);
      byName.set(String(row.name || '').toLowerCase().trim(), row);
    }
    if (rows.length < 1000) break;
    page++;
  }

  return { bySlug, byName };
}

async function loadKnownHashes() {
  try {
    const data = JSON.parse(await fs.readFile(HASH_LOG, 'utf8'));
    return new Set(Array.isArray(data.hashes) ? data.hashes : []);
  } catch {
    return new Set();
  }
}

async function saveKnownHashes(hashes) {
  await fs.writeFile(HASH_LOG, JSON.stringify({ hashes: [...hashes].sort() }, null, 2));
}

async function loadInputSlugs() {
  if (SLUGS.length > 0) return SLUGS;

  if (INPUT_FILE) {
    const raw = await fs.readFile(INPUT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const source = Array.isArray(parsed) ? parsed : parsed.strains || parsed.slugs || [];
    return source
      .map((item) => normalizeSlug(typeof item === 'string' ? item : item.slug || item.name))
      .filter(Boolean);
  }

  return discoverSlugsFromBrowsePages();
}

async function discoverSlugsFromBrowsePages() {
  const discovered = [];
  const seen = new Set();

  for (let page = START_PAGE; page < START_PAGE + PAGES; page++) {
    const url = `${STRAINDB_ORIGIN}/strains${page > 1 ? `?page=${page}` : ''}`;
    const response = await fetchWithRetries(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GreenLogReviewImporter/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response?.ok) {
      console.warn(`Warning: browse page ${page} unavailable; using fallback seeds.`);
      break;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const hrefs = $('a[href^="/strains/"], a[href^="https://strain-database.com/strains/"]')
      .map((_, el) => $(el).attr('href'))
      .get();

    for (const href of hrefs) {
      const slug = normalizeSlug(new URL(href, STRAINDB_ORIGIN).pathname.split('/').filter(Boolean).at(-1));
      if (!slug || seen.has(slug) || slug === 'strains') continue;
      seen.add(slug);
      discovered.push(slug);
      if (LIMIT > 0 && discovered.length >= LIMIT) return discovered;
    }

    await sleep(DELAY_MS);
  }

  if (discovered.length === 0) {
    for (const slug of DEFAULT_DISCOVERY_SLUGS) {
      if (!seen.has(slug)) {
        seen.add(slug);
        discovered.push(slug);
      }
    }
  }

  return LIMIT > 0 ? discovered.slice(0, LIMIT) : discovered;
}

async function fetchWithRetries(url, options, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status !== 429 && response.status < 500) return response;
      if (attempt === retries) return response;
    } catch (error) {
      if (attempt === retries) {
        console.warn(`Warning: ${url} failed: ${error.message}`);
        return null;
      }
    }

    await sleep(DELAY_MS * attempt);
  }

  return null;
}

async function fetchStrainDbPayload(slug) {
  const url = `${STRAINDB_ORIGIN}/api/strains/${slug}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GreenLogReviewImporter/1.0)',
      Accept: 'application/json',
    },
  });

  if (response.status === 404) return { ok: false, reason: 'not_found' };
  if (!response.ok) return { ok: false, reason: `http_${response.status}` };

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return { ok: false, reason: `unexpected_content_type:${contentType}` };

  return { ok: true, data: await response.json() };
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GreenLogReviewImporter/1.0)',
      Accept: 'image/*,*/*;q=0.8',
      Referer: STRAINDB_ORIGIN,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) return { ok: false, reason: `http_${response.status}` };
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (contentType && !contentType.startsWith('image/')) return { ok: false, reason: `content_type:${contentType}` };
  return { ok: true, buffer: Buffer.from(await response.arrayBuffer()), contentType };
}

async function mirrorImage(s3, candidate, imageCandidates, hashes) {
  if (REQUIRE_IMAGE && imageCandidates.length === 0) {
    return { ok: false, reason: 'no_image_candidate' };
  }

  for (const image of imageCandidates) {
    try {
      const downloaded = await downloadImage(image.url);
      if (!downloaded.ok) continue;

      const validated = await validateImage(downloaded.buffer);
      if (!validated.ok) continue;

      if (hashes.has(validated.hash)) {
        return { ok: false, reason: 'duplicate_image_hash', hash: validated.hash, sourceUrl: image.url };
      }

      const urlHash = createHash('sha1').update(image.url).digest('hex').slice(0, 10);
      const key = `straindb/${candidate.slug}-${urlHash}.jpg`;
      await s3.send(new PutObjectCommand({
        Bucket: 'strains',
        Key: key,
        Body: validated.buffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }));

      hashes.add(validated.hash);
      return {
        ok: true,
        publicUrl: `${PUBLIC_BASE_PATH}/strains/${key}`,
        canonicalPath: `strains/${key}`,
        hash: validated.hash,
        width: validated.width,
        height: validated.height,
        bytes: validated.buffer.length,
        sourceUrl: image.url,
        source: image.source,
      };
    } catch {
      continue;
    }
  }

  return { ok: false, reason: 'image_validation_failed' };
}

function buildInsertPayload(candidate, imageAsset) {
  return {
    name: candidate.name,
    slug: candidate.slug,
    type: candidate.type,
    description: candidate.description,
    thc_min: candidate.thc_min,
    thc_max: candidate.thc_max,
    cbd_min: candidate.cbd_min,
    cbd_max: candidate.cbd_max,
    avg_thc: candidate.avg_thc,
    avg_cbd: candidate.avg_cbd,
    breeder: candidate.breeder,
    genetics: candidate.genetics,
    flowering_time: candidate.flowering_time,
    grow_difficulty: candidate.grow_difficulty,
    effects: candidate.effects,
    flavors: candidate.flavors,
    terpenes: candidate.terpenes,
    image_url: imageAsset?.publicUrl || null,
    canonical_image_path: imageAsset?.canonicalPath || null,
    image_attribution: {
      ...candidate.image_attribution,
      image_url: imageAsset?.sourceUrl || null,
      mirrored_by: 'scripts/import-straindb-review.mjs',
    },
    image_source: imageAsset?.source || null,
    publication_status: 'review',
    primary_source: 'straindb',
    source: 'strain-database.com',
    source_notes: candidate.source_notes,
    source_provenance: candidate.source_provenance,
    meta_sources: candidate.meta_sources,
  };
}

function buildExistingDiff(existing, candidate) {
  return {
    existing_id: existing.id,
    existing_status: existing.publication_status,
    existing_source: existing.primary_source,
    candidate_fields: {
      description: Boolean(candidate.description),
      thc: candidate.thc_min != null || candidate.thc_max != null,
      cbd: candidate.cbd_min != null || candidate.cbd_max != null,
      effects: candidate.effects.length,
      flavors: candidate.flavors.length,
      terpenes: candidate.terpenes.length,
      image_candidates: candidate.imageCandidates.length,
    },
  };
}

async function writeReports(report, records) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = OUTPUT_JSON || path.join(REPORT_DIR, `straindb-review-import-${timestamp}.json`);
  const jsonlPath = OUTPUT_JSONL || path.join(REPORT_DIR, `straindb-review-import-${timestamp}.jsonl`);

  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  await fs.writeFile(jsonlPath, records.map((record) => JSON.stringify(record)).join('\n') + '\n');
  return { jsonPath, jsonlPath };
}

async function main() {
  console.log('StrainDB review importer');
  console.log('========================');
  console.log(`Mode:          ${APPLY ? 'apply' : 'dry-run'}`);
  console.log(`Limit:         ${LIMIT || 'all'}`);
  console.log(`Pages:         ${INPUT_FILE || SLUGS.length ? 'input' : PAGES}`);
  console.log(`Require image: ${REQUIRE_IMAGE ? 'yes' : 'no'}`);
  console.log(`Update exist.: ${UPDATE_EXISTING ? 'yes' : 'no'}`);

  const supabase = createSupabase();
  const s3 = APPLY ? createS3() : null;
  const hashes = await loadKnownHashes();
  const existing = await loadExistingStrainIndex(supabase);
  const slugs = await loadInputSlugs();
  const selectedSlugs = LIMIT > 0 ? slugs.slice(0, LIMIT) : slugs;

  const stats = {
    candidates: selectedSlugs.length,
    imported: 0,
    existing: 0,
    no_image: 0,
    failed: 0,
    dry_run_ready: 0,
  };
  const records = [];

  console.log(`Candidates:    ${selectedSlugs.length}`);
  console.log('');

  for (let i = 0; i < selectedSlugs.length; i++) {
    const slug = selectedSlugs[i];
    const progress = `[${i + 1}/${selectedSlugs.length}]`;
    console.log(`${progress} ${slug}`);

    const fetched = await fetchStrainDbPayload(slug);
    if (!fetched.ok) {
      stats.failed++;
      records.push({ slug, action: 'failed', reason: fetched.reason });
      console.log(`  failed: ${fetched.reason}`);
      await sleep(DELAY_MS);
      continue;
    }

    const candidate = mapStrainDbPayload(fetched.data);
    const existingRow = existing.bySlug.get(candidate.slug) || existing.byName.get(candidate.name.toLowerCase());
    if (existingRow && !UPDATE_EXISTING) {
      stats.existing++;
      records.push({
        slug: candidate.slug,
        name: candidate.name,
        action: 'existing',
        source_url: candidate.source_provenance.strain_database.url,
        diff: buildExistingDiff(existingRow, candidate),
      });
      console.log(`  existing: ${existingRow.publication_status}`);
      await sleep(DELAY_MS);
      continue;
    }

    let imageAsset = null;
    if (APPLY) {
      const mirrored = await mirrorImage(s3, candidate, candidate.imageCandidates, hashes);
      if (mirrored.ok) {
        imageAsset = mirrored;
      } else if (REQUIRE_IMAGE) {
        stats.no_image++;
        records.push({
          slug: candidate.slug,
          name: candidate.name,
          action: 'skipped',
          reason: mirrored.reason,
          source_url: candidate.source_provenance.strain_database.url,
        });
        console.log(`  skipped: ${mirrored.reason}`);
        await sleep(DELAY_MS);
        continue;
      }
    } else if (candidate.imageCandidates.length > 0) {
      imageAsset = { publicUrl: '(dry-run)', canonicalPath: '(dry-run)', sourceUrl: candidate.imageCandidates[0].url };
    }

    const quality = completeness(candidate, imageAsset);
    const payload = buildInsertPayload(candidate, imageAsset);

    if (!APPLY) {
      stats.dry_run_ready++;
      records.push({
        slug: candidate.slug,
        name: candidate.name,
        action: 'would_import',
        quality,
        source_url: candidate.source_provenance.strain_database.url,
        image_candidates: candidate.imageCandidates,
        payload,
      });
      console.log(`  would import: quality ${quality.score}, missing ${quality.missing.join(', ') || 'none'}`);
      await sleep(DELAY_MS);
      continue;
    }

    const query = existingRow && UPDATE_EXISTING
      ? supabase.from('strains').update(payload).eq('id', existingRow.id).select('id').single()
      : supabase.from('strains').insert(payload).select('id').single();
    const { data, error } = await query;

    if (error) {
      stats.failed++;
      records.push({
        slug: candidate.slug,
        name: candidate.name,
        action: 'failed',
        reason: error.message,
        quality,
      });
      console.log(`  db failed: ${error.message}`);
      await sleep(DELAY_MS);
      continue;
    }

    stats.imported++;
    records.push({
      id: data.id,
      slug: candidate.slug,
      name: candidate.name,
      action: existingRow ? 'updated_review' : 'imported_review',
      quality,
      image: imageAsset,
      source_url: candidate.source_provenance.strain_database.url,
    });
    console.log(`  imported: ${data.id} quality ${quality.score}`);
    await sleep(DELAY_MS);
  }

  if (APPLY) await saveKnownHashes(hashes);

  const report = {
    timestamp: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    options: {
      limit: LIMIT,
      pages: PAGES,
      delayMs: DELAY_MS,
      requireImage: REQUIRE_IMAGE,
      updateExisting: UPDATE_EXISTING,
      inputFile: INPUT_FILE,
      slugs: SLUGS,
    },
    stats,
    records,
  };
  const paths = await writeReports(report, records);

  console.log('');
  console.log('Summary');
  console.log('-------');
  console.log(`Imported:      ${stats.imported}`);
  console.log(`Would import:  ${stats.dry_run_ready}`);
  console.log(`Existing:      ${stats.existing}`);
  console.log(`No image:      ${stats.no_image}`);
  console.log(`Failed:        ${stats.failed}`);
  console.log(`Report JSON:   ${paths.jsonPath}`);
  console.log(`Report JSONL:  ${paths.jsonlPath}`);
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});
