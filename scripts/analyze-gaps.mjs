import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uwjyvvvykyueuxtdkscs.supabase.co',
  'sb_publishable_nUmGx6KEJ0-JZIYuEgQTbQ_JHuPwW5Y'
);

const { data: strains, error } = await supabase
  .from('strains')
  .select('id, name, slug, image_url, description, terpenes, effects, flavors, thc_min, thc_max, type')
  .eq('is_custom', false);

if (error) { console.error(error); process.exit(1); }

const total = strains.length;

const gaps = strains.map(s => {
  const hasPlaceholderImg = !s.image_url || s.image_url.includes('placeholder') || s.image_url.includes('picsum') || s.image_url.includes('picsum.photos');
  const hasBadDescription = !s.description || s.description.includes('Die beliebte Sorte') || s.description.includes('Medizinisches Cannabis von') || s.description.length < 40;
  const hasNoTerpenes = !s.terpenes || (Array.isArray(s.terpenes) && s.terpenes.length === 0);
  const hasNoEffects = !s.effects || (Array.isArray(s.effects) && s.effects.length === 0);
  const hasNoFlavors = !s.flavors || (Array.isArray(s.flavors) && s.flavors.length === 0);
  const hasNoThc = !s.thc_min && !s.thc_max;

  return {
    name: s.name,
    slug: s.slug,
    gaps: { image: hasPlaceholderImg, description: hasBadDescription, terpenes: hasNoTerpenes, effects: hasNoEffects, flavors: hasNoFlavors, thc: hasNoThc }
  };
});

const imageGaps = gaps.filter(g => g.gaps.image).length;
const descGaps = gaps.filter(g => g.gaps.description).length;
const terpGaps = gaps.filter(g => g.gaps.terpenes).length;
const effectGaps = gaps.filter(g => g.gaps.effects).length;
const flavorGaps = gaps.filter(g => g.gaps.flavors).length;
const thcGaps = gaps.filter(g => g.gaps.thc).length;

console.log(`\n=== STRAIN DATA GAP ANALYSIS ===`);
console.log(`Total strains analyzed: ${total}`);
console.log(`Missing/placeholder images: ${imageGaps} (${((imageGaps/total)*100).toFixed(1)}%)`);
console.log(`Bad/missing description: ${descGaps} (${((descGaps/total)*100).toFixed(1)}%)`);
console.log(`Missing terpenes: ${terpGaps} (${((terpGaps/total)*100).toFixed(1)}%)`);
console.log(`Missing effects: ${effectGaps} (${((effectGaps/total)*100).toFixed(1)}%)`);
console.log(`Missing flavors: ${flavorGaps} (${((flavorGaps/total)*100).toFixed(1)}%)`);
console.log(`Missing THC: ${thcGaps} (${((thcGaps/total)*100).toFixed(1)}%)`);

console.log(`\n=== TOP 20 STRAINS WITH MOST GAPS ===`);
const mostGaps = gaps
  .map(g => ({ ...g, gapCount: Object.values(g.gaps).filter(Boolean).length }))
  .sort((a, b) => b.gapCount - a.gapCount)
  .slice(0, 20);

mostGaps.forEach(g => {
  const missing = Object.entries(g.gaps).filter(([,v]) => v).map(([k]) => k).join(', ');
  console.log(`  ${g.name} (${g.slug}): [${missing}]`);
});
