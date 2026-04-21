#!/usr/bin/env node
/**
 * quick-audit.mjs — Aktueller Stand der strains-Tabelle
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local'), override: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function isPlaceholderImage(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return lower.includes('placeholder') || lower.includes('picsum') || lower.includes('dummy');
}

async function main() {
  console.log('🔍 Quick Audit — Aktueller Stand\n');

  let offset = 0;
  const pageSize = 1000;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .from('strains')
      .select('id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, terpenes, effects, flavors, image_url, publication_status, is_custom, primary_source, quality_score')
      .range(offset, offset + pageSize - 1);

    if (error) { console.error(error); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    offset += pageSize;
  }

  const total = all.length;
  const published = all.filter(s => s.publication_status === 'published');
  const draft = all.filter(s => s.publication_status === 'draft');
  const review = all.filter(s => s.publication_status === 'review');
  const custom = all.filter(s => s.is_custom === true);
  const locked = all.filter(s => s.publication_status === 'locked');

  const noImage = all.filter(s => isPlaceholderImage(s.image_url));
  const noDesc = all.filter(s => !s.description || s.description.length < 20);
  const noThc = all.filter(s => s.thc_min == null && s.thc_max == null);
  const noEffects = all.filter(s => !Array.isArray(s.effects) || s.effects.length === 0);
  const noTerpenes = all.filter(s => !Array.isArray(s.terpenes) || s.terpenes.length === 0);
  const noFlavors = all.filter(s => !Array.isArray(s.flavors) || s.flavors.length === 0);
  const invalidImageUrl = all.filter(s => {
    if (!s.image_url) return false;
    try { new URL(s.image_url); return false; } catch { return true; }
  });

  // Published with problems
  const publishedNoImage = published.filter(s => isPlaceholderImage(s.image_url));

  console.log('='.repeat(50));
  console.log('📊 GESAMT');
  console.log('='.repeat(50));
  console.log(`   Total Strains:       ${total}`);
  console.log(`   Published:           ${published.length}`);
  console.log(`   Draft:               ${draft.length}`);
  console.log(`   Review:              ${review.length}`);
  console.log(`   Locked:              ${locked.length}`);
  console.log(`   Custom (User):       ${custom.length}`);
  console.log('');

  console.log('='.repeat(50));
  console.log('📊 LÜCKEN (alle Strains)');
  console.log('='.repeat(50));
  console.log(`   ❌ Kein Bild:         ${noImage.length} (${((noImage.length/total)*100).toFixed(1)}%)`);
  console.log(`   ❌ Keine Beschreib.:  ${noDesc.length} (${((noDesc.length/total)*100).toFixed(1)}%)`);
  console.log(`   ❌ Kein THC:          ${noThc.length} (${((noThc.length/total)*100).toFixed(1)}%)`);
  console.log(`   ❌ Keine Effects:     ${noEffects.length} (${((noEffects.length/total)*100).toFixed(1)}%)`);
  console.log(`   ❌ Keine Terpene:     ${noTerpenes.length} (${((noTerpenes.length/total)*100).toFixed(1)}%)`);
  console.log(`   ❌ Keine Flavors:     ${noFlavors.length} (${((noFlavors.length/total)*100).toFixed(1)}%)`);
  console.log(`   ⚠️  Invalid Bild-URL:  ${invalidImageUrl.length}`);
  console.log('');

  console.log('='.repeat(50));
  console.log('📊 PROBLEME BEI PUBLISHED');
  console.log('='.repeat(50));
  console.log(`   ❌ Kein Bild:         ${publishedNoImage.length}`);
  console.log(`   ✅ Published mit Bild: ${published.length - publishedNoImage.length}`);
  console.log('');

  // Source distribution
  const sources = {};
  all.forEach(s => {
    const src = s.primary_source || 'unknown';
    sources[src] = (sources[src] || 0) + 1;
  });
  console.log('='.repeat(50));
  console.log('📊 NACH SOURCE');
  console.log('='.repeat(50));
  Object.entries(sources).sort((a, b) => b[1] - a[1]).forEach(([src, count]) => {
    const pCount = all.filter(s => (s.primary_source || 'unknown') === src && s.publication_status === 'published').length;
    console.log(`   ${src.padEnd(20)}: ${count.toString().padStart(4)} (published: ${pCount})`);
  });
}

main().catch(console.error);
