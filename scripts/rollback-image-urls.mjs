#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const BATCH_SIZE = 100;

function cannalogUrlToMediaPath(url) {
  if (!url || typeof url !== 'string') return null;

  if (url.includes('storage.cannalog.fun/media/')) {
    const idx = url.indexOf('/media/');
    return url.slice(idx);
  }

  if (url.includes('storage.cannalog.fun/strains/')) {
    const idx = url.indexOf('/strains/');
    return `/media${url.slice(idx)}`;
  }

  return null;
}

async function rollbackTable(table, urlColumn) {
  console.log(`\n--- ${table}.${urlColumn} ---`);

  let total = 0;
  let updated = 0;
  let failed = 0;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${urlColumn}`)
      .not(urlColumn, 'is', null)
      .like(urlColumn, '%storage.cannalog.fun%')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error(`  Error fetching at offset ${offset}: ${error.message}`);
      break;
    }

    const rows = data || [];
    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    total += rows.length;

    for (const row of rows) {
      const oldUrl = row[urlColumn];
      const newPath = cannalogUrlToMediaPath(oldUrl);

      if (!newPath) {
        console.warn(`  SKIP ${row.id}: could not convert "${oldUrl}"`);
        failed++;
        continue;
      }

      if (apply) {
        const { error: updateError } = await supabase
          .from(table)
          .update({ [urlColumn]: newPath })
          .eq('id', row.id);

        if (updateError) {
          console.error(`  FAIL ${row.id}: ${updateError.message}`);
          failed++;
        } else {
          updated++;
        }
      } else {
        console.log(`  DRY-RUN ${row.id}: "${oldUrl}" → "${newPath}"`);
        updated++;
      }
    }

    offset += BATCH_SIZE;
    if (rows.length < BATCH_SIZE) hasMore = false;
  }

  console.log(`  Total: ${total}, Updated: ${updated}, Failed: ${failed}`);
  return { total, updated, failed };
}

async function main() {
  const targets = [
    { table: 'strains', urlColumn: 'image_url' },
    { table: 'profiles', urlColumn: 'avatar_url' },
    { table: 'organizations', urlColumn: 'logo_url' },
    { table: 'user_collection', urlColumn: 'user_image_url' },
  ];

  const summary = { total: 0, updated: 0, failed: 0 };

  for (const t of targets) {
    const result = await rollbackTable(t.table, t.urlColumn);
    summary.total += result.total;
    summary.updated += result.updated;
    summary.failed += result.failed;
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total: ${summary.total}, Updated: ${summary.updated}, Failed: ${summary.failed}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);

  if (!apply) {
    console.log('\nRe-run with --apply to actually update the database.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
