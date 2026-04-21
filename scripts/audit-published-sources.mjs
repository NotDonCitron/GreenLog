#!/usr/bin/env node
/**
 * audit-published-sources.mjs
 *
 * Zeigt die primary_source Verteilung der published Strains,
 * besonders derer ohne Bilder.
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local'), override: false });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isPlaceholderImage(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return lower.includes('placeholder') || lower.includes('picsum') || lower.includes('dummy');
}

async function main() {
  console.log('🔍 Analysiere published Strains nach Source...\n');

  let offset = 0;
  const pageSize = 1000;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .from('strains')
      .select('id, name, slug, primary_source, image_url, description, thc_min, thc_max, effects, terpenes, created_at')
      .eq('publication_status', 'published')
      .range(offset, offset + pageSize - 1);

    if (error) { console.error(error); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    offset += pageSize;
  }

  const sourceDist = {};
  const noImageBySource = {};
  const noImageNoThcBySource = {};

  all.forEach(s => {
    const src = s.primary_source || 'unknown';
    sourceDist[src] = (sourceDist[src] || 0) + 1;

    const noImg = isPlaceholderImage(s.image_url);
    if (noImg) {
      noImageBySource[src] = (noImageBySource[src] || 0) + 1;
    }

    const noThc = s.thc_min == null && s.thc_max == null;
    if (noImg && noThc) {
      noImageNoThcBySource[src] = (noImageNoThcBySource[src] || 0) + 1;
    }
  });

  console.log('📊 Alle published Strains nach primary_source:');
  Object.entries(sourceDist).sort((a, b) => b[1] - a[1]).forEach(([src, count]) => {
    console.log(`   ${src.padEnd(25)}: ${count.toString().padStart(4)}`);
  });
  console.log(`   ${'TOTAL'.padEnd(25)}: ${all.length.toString().padStart(4)}\n`);

  console.log('📊 Published Strains OHNE Bild nach primary_source:');
  Object.entries(noImageBySource).sort((a, b) => b[1] - a[1]).forEach(([src, count]) => {
    const pct = ((count / sourceDist[src]) * 100).toFixed(1);
    console.log(`   ${src.padEnd(25)}: ${count.toString().padStart(4)} (${pct}% von ${sourceDist[src]})`);
  });
  const totalNoImg = Object.values(noImageBySource).reduce((a, b) => a + b, 0);
  console.log(`   ${'TOTAL'.padEnd(25)}: ${totalNoImg.toString().padStart(4)} (${((totalNoImg/all.length)*100).toFixed(1)}% von ${all.length})\n`);

  console.log('📊 Published Strains OHNE Bild UND OHNE THC nach primary_source:');
  Object.entries(noImageNoThcBySource).sort((a, b) => b[1] - a[1]).forEach(([src, count]) => {
    console.log(`   ${src.padEnd(25)}: ${count.toString().padStart(4)}`);
  });
  const totalNoImgNoThc = Object.values(noImageNoThcBySource).reduce((a, b) => a + b, 0);
  console.log(`   ${'TOTAL'.padEnd(25)}: ${totalNoImgNoThc.toString().padStart(4)} (${((totalNoImgNoThc/all.length)*100).toFixed(1)}% von ${all.length})\n`);

  // Show newest strains (likely auto-imports)
  const byDate = [...all].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  console.log('📅 Neueste 10 published Strains (vermutlich Imports):');
  byDate.slice(0, 10).forEach(s => {
    const noImg = isPlaceholderImage(s.image_url) ? '❌ Kein Bild' : '✅ Bild';
    const noThc = s.thc_min == null && s.thc_max == null ? '❌ Kein THC' : '✅ THC';
    console.log(`   ${s.name.padEnd(30)} | src=${(s.primary_source || 'unknown').padEnd(20)} | ${noImg} | ${noThc} | ${s.created_at?.slice(0, 10) || '?'}`);
  });
}

main().catch(console.error);
