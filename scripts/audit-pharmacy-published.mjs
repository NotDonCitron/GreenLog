#!/usr/bin/env node
/**
 * audit-pharmacy-published.mjs
 *
 * Prüft die verbleibenden 971 pharmacy published Strains
 * auf Bildqualität und Datenlücken.
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local'), override: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function isPlaceholderImage(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return lower.includes('placeholder') || lower.includes('picsum') || lower.includes('dummy');
}

async function main() {
  console.log('🔍 Prüfe pharmacy published Strains...\n');

  let offset = 0;
  const pageSize = 1000;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .from('strains')
      .select('id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, terpenes, effects, flavors, image_url, quality_score, created_at')
      .eq('publication_status', 'published')
      .eq('primary_source', 'pharmacy')
      .range(offset, offset + pageSize - 1);

    if (error) { console.error(error); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    offset += pageSize;
  }

  const withImage = all.filter(s => !isPlaceholderImage(s.image_url));
  const withoutImage = all.filter(s => isPlaceholderImage(s.image_url));

  const withThc = all.filter(s => s.thc_min != null || s.thc_max != null);
  const withDesc = all.filter(s => s.description && s.description.length >= 20);
  const withEffects = all.filter(s => Array.isArray(s.effects) && s.effects.length > 0);
  const withTerpenes = all.filter(s => Array.isArray(s.terpenes) && s.terpenes.length > 0);
  const withFlavors = all.filter(s => Array.isArray(s.flavors) && s.flavors.length > 0);

  console.log(`📊 pharmacy published Strains: ${all.length}`);
  console.log(`   ✅ Mit Bild:        ${withImage.length}`);
  console.log(`   ❌ Ohne Bild:       ${withoutImage.length}`);
  console.log(`   ✅ Mit THC:         ${withThc.length}`);
  console.log(`   ✅ Mit Beschr.:     ${withDesc.length}`);
  console.log(`   ✅ Mit Effects:     ${withEffects.length}`);
  console.log(`   ✅ Mit Terpenen:    ${withTerpenes.length}`);
  console.log(`   ✅ Mit Flavors:     ${withFlavors.length}`);
  console.log('');

  // Check image URLs
  const imageHosts = {};
  withImage.forEach(s => {
    try {
      const host = new URL(s.image_url).hostname;
      imageHosts[host] = (imageHosts[host] || 0) + 1;
    } catch {
      imageHosts['invalid'] = (imageHosts['invalid'] || 0) + 1;
    }
  });

  console.log('📊 Bild-Quellen:');
  Object.entries(imageHosts).sort((a, b) => b[1] - a[1]).forEach(([host, count]) => {
    console.log(`   ${host.padEnd(30)}: ${count}`);
  });
  console.log('');

  // Oldest vs newest
  const byDate = [...all].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  console.log('📅 Älteste 5 pharmacy Strains:');
  byDate.slice(0, 5).forEach(s => {
    const hasImg = !isPlaceholderImage(s.image_url) ? '✅ Bild' : '❌ Kein Bild';
    console.log(`   ${s.name.padEnd(30)} | ${hasImg} | ${s.created_at?.slice(0, 10) || '?'}`);
  });
  console.log('');

  const byDateDesc = [...all].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  console.log('📅 Neueste 5 pharmacy Strains:');
  byDateDesc.slice(0, 5).forEach(s => {
    const hasImg = !isPlaceholderImage(s.image_url) ? '✅ Bild' : '❌ Kein Bild';
    console.log(`   ${s.name.padEnd(30)} | ${hasImg} | ${s.created_at?.slice(0, 10) || '?'}`);
  });
}

main().catch(console.error);
