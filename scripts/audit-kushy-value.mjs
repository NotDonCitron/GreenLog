#!/usr/bin/env node
/**
 * audit-kushy-value.mjs
 *
 * Analysiert, welche der 3.263 kushy-csv Draft-Strains
 * tatsächlich brauchbare Daten für Enrichment haben.
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

async function main() {
  console.log('🔍 Analysiere kushy-csv Strains...\n');

  let offset = 0;
  const pageSize = 1000;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .from('strains')
      .select('id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, terpenes, effects, flavors, image_url, genetics, brand, publication_status')
      .eq('primary_source', 'kushy-csv');

    if (error) { console.error(error); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    offset += pageSize;
    if (all.length >= 4000) break; // safety
  }

  console.log(`📊 Total kushy-csv Strains: ${all.length}\n`);

  // Categorize by value
  const hasEffects = all.filter(s => Array.isArray(s.effects) && s.effects.length > 0);
  const hasFlavors = all.filter(s => Array.isArray(s.flavors) && s.flavors.length > 0);
  const hasGenetics = all.filter(s => s.genetics && s.genetics !== 'Unbekannt' && s.genetics.length > 0);
  const hasBrand = all.filter(s => s.brand && s.brand !== 'Unknown Breeder');
  const hasThc = all.filter(s => s.thc_min != null || s.thc_max != null);
  const hasImage = all.filter(s => s.image_url && !s.image_url.toLowerCase().includes('placeholder'));
  const hasDesc = all.filter(s => s.description && s.description.length >= 20);

  // Combined value score
  const withAnyValue = all.filter(s =>
    (Array.isArray(s.effects) && s.effects.length > 0) ||
    (Array.isArray(s.flavors) && s.flavors.length > 0) ||
    (s.genetics && s.genetics !== 'Unbekannt') ||
    (s.brand && s.brand !== 'Unknown Breeder') ||
    s.thc_min != null || s.thc_max != null
  );

  const justNameAndType = all.filter(s =>
    (!s.effects || s.effects.length === 0) &&
    (!s.flavors || s.flavors.length === 0) &&
    (!s.genetics || s.genetics === 'Unbekannt') &&
    (!s.brand || s.brand === 'Unknown Breeder') &&
    s.thc_min == null && s.thc_max == null &&
    (!s.description || s.description.length < 20)
  );

  console.log('📈 Einzelne Datenpunkte:');
  console.log(`   Effects:    ${hasEffects.length} (${((hasEffects.length/all.length)*100).toFixed(1)}%)`);
  console.log(`   Flavors:    ${hasFlavors.length} (${((hasFlavors.length/all.length)*100).toFixed(1)}%)`);
  console.log(`   Genetics:   ${hasGenetics.length} (${((hasGenetics.length/all.length)*100).toFixed(1)}%)`);
  console.log(`   Brand:      ${hasBrand.length} (${((hasBrand.length/all.length)*100).toFixed(1)}%)`);
  console.log(`   THC:        ${hasThc.length} (${((hasThc.length/all.length)*100).toFixed(1)}%)`);
  console.log(`   Image:      ${hasImage.length} (${((hasImage.length/all.length)*100).toFixed(1)}%)`);
  console.log(`   Description:${hasDesc.length} (${((hasDesc.length/all.length)*100).toFixed(1)}%)`);
  console.log('');

  console.log('📊 Wert-Kategorien:');
  console.log(`   ✅ Mit brauchbaren Daten: ${withAnyValue.length} (${((withAnyValue.length/all.length)*100).toFixed(1)}%)`);
  console.log(`   🗑️  Nur Name + Typ:       ${justNameAndType.length} (${((justNameAndType.length/all.length)*100).toFixed(1)}%)`);
  console.log('');

  // Duplicates check: do any of these names match published strains?
  const { data: published } = await supabase
    .from('strains')
    .select('name, slug')
    .eq('publication_status', 'published');

  const publishedNames = new Set((published || []).map(s => s.name.toLowerCase()));
  const publishedSlugs = new Set((published || []).map(s => s.slug.toLowerCase()));

  const matchingPublished = withAnyValue.filter(s =>
    publishedNames.has(s.name.toLowerCase()) || publishedSlugs.has(s.slug.toLowerCase())
  );

  console.log('🔗 Enrichment-Potenzial:');
  console.log(`   kushy-csv Strains mit Daten:     ${withAnyValue.length}`);
  console.log(`   Davon Namen-Match mit Published: ${matchingPublished.length}`);
  console.log(`   → Könnten published Strains anreichern: ${matchingPublished.length}`);
  console.log('');

  // Show 5 examples of valuable ones
  if (withAnyValue.length > 0) {
    console.log('📋 Beispiele - Brauchbare kushy-csv Strains:');
    withAnyValue.slice(0, 5).forEach(s => {
      const parts = [];
      if (s.effects?.length) parts.push(`Effects:${s.effects.slice(0, 3).join(',')}`);
      if (s.flavors?.length) parts.push(`Flavors:${s.flavors.slice(0, 3).join(',')}`);
      if (s.genetics) parts.push(`Genetics:${s.genetics}`);
      if (s.brand) parts.push(`Brand:${s.brand}`);
      console.log(`   ${s.name.padEnd(25)} | ${parts.join(' | ')}`);
    });
    console.log('');
  }

  if (justNameAndType.length > 0) {
    console.log('📋 Beispiele - Wertlos (Nur Name + Typ):');
    justNameAndType.slice(0, 5).forEach(s => {
      console.log(`   ${s.name.padEnd(25)} | type=${s.type || '?'} | slug=${s.slug}`);
    });
    console.log('');
  }

  console.log('💡 Empfehlung:');
  console.log(`   - Lösche ${justNameAndType.length} wertlose Strains (Nur Name + Typ)`);
  console.log(`   - Behhalte ${withAnyValue.length} Strains mit Daten für Enrichment`);
  console.log(`   - ${matchingPublished.length} davon könnten direkt published Strains anreichern`);
}

main().catch(console.error);
