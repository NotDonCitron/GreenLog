#!/usr/bin/env node
import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const tableArg = process.argv.find((arg) => arg.startsWith('--table='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 50;
const onlyTable = tableArg?.split('=')[1] || null;

const PUBLIC_BASE_PATH = (process.env.IMAGE_PUBLIC_BASE_PATH || '/media').replace(/\/+$/, '') || '/media';
const MAX_BYTES = Number(process.env.IMAGE_DOWNLOAD_MAX_BYTES || 10 * 1024 * 1024);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 20_000);
const REPORT_DIR = path.resolve('scripts/image-migration-reports');

const targets = [
  {
    table: 'strains',
    select: 'id,image_url,canonical_image_path',
    urlColumn: 'image_url',
    canonicalColumn: 'canonical_image_path',
    bucket: 'strains',
    keyFor: (row, ext) => `${row.id}.${ext}`,
    updateFor: (publicUrl, storagePath) => ({ image_url: publicUrl, canonical_image_path: storagePath }),
  },
  {
    table: 'user_collection',
    select: 'id,user_id,strain_id,user_image_url',
    urlColumn: 'user_image_url',
    bucket: 'user-strains',
    keyFor: (row, ext) => `${row.user_id}/${row.strain_id}/${row.id}.${ext}`,
    updateFor: (publicUrl) => ({ user_image_url: publicUrl }),
  },
  {
    table: 'profiles',
    select: 'id,avatar_url',
    urlColumn: 'avatar_url',
    bucket: 'avatars',
    keyFor: (row, ext) => `${row.id}/migrated.${ext}`,
    updateFor: (publicUrl) => ({ avatar_url: publicUrl }),
  },
  {
    table: 'organizations',
    select: 'id,logo_url,avatar_url',
    urlColumn: 'logo_url',
    bucket: 'org-logos',
    keyFor: (row, ext) => `${row.id}/logo.${ext}`,
    updateFor: (publicUrl) => ({ logo_url: publicUrl }),
  },
  {
    table: 'organizations',
    select: 'id,logo_url,avatar_url',
    urlColumn: 'avatar_url',
    bucket: 'org-logos',
    keyFor: (row, ext) => `${row.id}/avatar.${ext}`,
    updateFor: (publicUrl) => ({ avatar_url: publicUrl }),
  },
  {
    table: 'grow_entries',
    select: 'id,user_id,image_url',
    urlColumn: 'image_url',
    bucket: 'user-strains',
    keyFor: (row, ext) => `legacy-grow-entries/${row.user_id || 'unknown'}/${row.id}.${ext}`,
    updateFor: (publicUrl) => ({ image_url: publicUrl }),
  },
];

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
    region: process.env.MINIO_REGION || 'eu-central-1',
    credentials: {
      accessKeyId: requiredEnv('MINIO_ACCESS_KEY'),
      secretAccessKey: requiredEnv('MINIO_SECRET_KEY'),
    },
    forcePathStyle: process.env.MINIO_FORCE_PATH_STYLE !== 'false',
  });
}

function isMigratedUrl(url) {
  return typeof url === 'string' && url.startsWith(`${PUBLIC_BASE_PATH}/`);
}

function isDownloadableUrl(url) {
  if (!url || isMigratedUrl(url) || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function extFromContentType(contentType, sourceUrl) {
  const cleanType = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (cleanType === 'image/png') return 'png';
  if (cleanType === 'image/webp') return 'webp';
  if (cleanType === 'image/gif') return 'gif';
  if (cleanType === 'image/jpeg' || cleanType === 'image/jpg') return 'jpg';

  const match = String(sourceUrl).match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  const ext = match?.[1]?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? (ext === 'jpeg' ? 'jpg' : ext) : 'jpg';
}

async function downloadImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new Error(`Unexpected content-type: ${contentType}`);
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_BYTES) throw new Error(`Image too large: ${contentLength} bytes`);

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_BYTES) throw new Error(`Image too large: ${bytes.length} bytes`);

    return { bytes, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

function publicUrl(bucket, key) {
  return `${PUBLIC_BASE_PATH}/${bucket}/${key}`;
}

async function uploadImage(s3, bucket, key, bytes, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: bytes,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

async function loadCandidates(supabase, target) {
  const { data, error } = await supabase
    .from(target.table)
    .select(target.select)
    .not(target.urlColumn, 'is', null)
    .limit(limit);

  if (error) throw new Error(`${target.table}.${target.urlColumn}: ${error.message}`);
  return (data || []).filter((row) => isDownloadableUrl(row[target.urlColumn]));
}

async function migrateTarget(supabase, s3, target) {
  const rows = await loadCandidates(supabase, target);
  const records = [];

  for (const row of rows) {
    const oldUrl = row[target.urlColumn];
    const baseRecord = { table: target.table, id: row.id, column: target.urlColumn, oldUrl, status: 'pending' };

    try {
      const downloaded = await downloadImage(oldUrl);
      const ext = extFromContentType(downloaded.contentType, oldUrl);
      const key = target.keyFor(row, ext);
      const newUrl = publicUrl(target.bucket, key);
      const storagePath = `${target.bucket}/${key}`;

      if (apply) {
        await uploadImage(s3, target.bucket, key, downloaded.bytes, downloaded.contentType);
        const { error } = await supabase
          .from(target.table)
          .update(target.updateFor(newUrl, storagePath))
          .eq('id', row.id);
        if (error) throw new Error(`DB update failed: ${error.message}`);
      }

      records.push({
        ...baseRecord,
        status: apply ? 'migrated' : 'dry-run',
        bucket: target.bucket,
        key,
        newUrl,
        storagePath,
        contentType: downloaded.contentType,
        bytes: downloaded.bytes.length,
      });
    } catch (error) {
      records.push({ ...baseRecord, status: 'failed', reason: error instanceof Error ? error.message : String(error) });
    }
  }

  return records;
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const supabase = createSupabase();
  const s3 = createS3();
  const selectedTargets = onlyTable ? targets.filter((target) => target.table === onlyTable) : targets;

  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    limit,
    onlyTable,
    records: [],
  };

  for (const target of selectedTargets) {
    report.records.push(...await migrateTarget(supabase, s3, target));
  }

  const reportPath = path.join(REPORT_DIR, `image-migration-${report.generatedAt.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  const counts = report.records.reduce((acc, record) => {
    acc[record.status] = (acc[record.status] || 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({ reportPath, counts, mode: report.mode }, null, 2));
  if (!apply) console.log('Dry-run only. Re-run with --apply to upload and update database rows.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
