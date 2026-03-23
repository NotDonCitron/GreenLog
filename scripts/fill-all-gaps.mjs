import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const EXTRA_MAPPING = {
  "sweets": "sweets",
  "royal-berry": "royal-berry",
  "plum-driver": "plum-crazy",
  "mintwave": "mint-chocolate-chip",
  "lemon-pepper-punch": "lemon-pepper",
  "cocoa-bomba": "cocoa-bomba",
  "tiger-eyez": "tiger-cake",
  "bling-blaow": "glitter-bomb",
  "asteroid-og": "asteroid-og",
  "monkey-butter": "monkey-grease",
  "scotti": "wedding-cake",
  "pink-gas": "pink-kush",
  "goc": "gmo-cookies",
  "ice-cream-cake-kush-mints": "ice-cream-cake",
  "london-pound-cake": "london-pound-cake-75"
};

function cleanLeaflyText(text) {
  if (!text) return "";
  return text
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function scrapeLeafly(strainName, brand = null) {
  let baseName = strainName.toLowerCase();
  if (brand) baseName = baseName.replace(brand.toLowerCase(), "").trim();

  // Cleanup technical suffixes
  baseName = baseName
    .replace(/\s+\d+\/\d+$/, "")
    .replace(/\s+thc\d+.*$/, "")
    .replace(/\s+typ\s+\d+$/, "")
    .replace(/\s+(pn|cm|remexian|vayamed|amici|enua|demecan|avaay|cannamedical)$/, "")
    .trim();

  const slugBase = baseName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const mappedSlug = EXTRA_MAPPING[slugBase];
  
  const variants = [];
  if (mappedSlug) variants.push(mappedSlug);
  variants.push(slugBase);
  variants.push(slugBase + "s");
  if (slugBase.endsWith("s")) variants.push(slugBase.slice(0, -1));
  variants.push(slugBase.replace(/-/g, ""));

  const uniqueVariants = [...new Set(variants)].filter(Boolean);

  for (const slug of uniqueVariants) {
    const url = `https://www.leafly.com/strains/${slug}`;
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (response.ok) {
        const html = await response.text();
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        if (nextDataMatch) {
          const fullData = JSON.parse(nextDataMatch[1]);
          const strain = fullData.props?.pageProps?.strain || {};
          
          if (strain.name) {
            // Terpenes
            const terps = Object.entries(strain.terps || {})
              .map(([key, val]) => ({ name: val.name, score: val.score }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map(t => ({ name: t.name, percent: parseFloat((t.score * 2).toFixed(1)) || 0.5 }));

            // Effects
            const effects = Object.entries(strain.effects || {})
              .map(([key, val]) => ({ name: val.name, score: val.score }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map(e => e.name);

            // Flavors
            const flavors = Object.entries(strain.flavors || {})
              .map(([key, val]) => ({ name: val.name, score: val.score }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map(f => f.name);

            // Cannabinoids
            const thc = strain.cannabinoids?.thc?.percentile50 || null;
            const cbd = strain.cannabinoids?.cbd?.percentile50 || 0;

            // Genetics (Lineage or Parents)
            let genetics = strain.lineage?.displayName || null;
            if (!genetics && Array.isArray(strain.parents) && strain.parents.length > 0) {
              genetics = strain.parents.map(p => p.name).join(" x ");
            }

            return {
              description: cleanLeaflyText(strain.description) || null,
              terpenes: terps.length > 0 ? terps : null,
              effects: effects.length > 0 ? effects : null,
              flavors: flavors.length > 0 ? flavors : null,
              thc_avg: thc,
              cbd_avg: cbd,
              genetics: genetics,
              type: (strain.category || "hybrid").toLowerCase()
            };
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

async function run() {
  console.log("🚀 STARTE FINALES FILL-ALL-GAPS...");

  const { data: strains, error } = await supabase.from('strains').select('*');
  if (error) return;

  const gaps = strains.filter(s => {
    const hasNoTHC = !s.thc_min && !s.thc_max;
    const hasNoGenetics = !s.genetics || s.genetics === 'Unbekannt';
    const hasNoFlavors = !s.flavors || s.flavors.length === 0;
    const hasNoTerpenes = !s.terpenes || s.terpenes.length === 0;
    return hasNoTHC || hasNoGenetics || hasNoFlavors || hasNoTerpenes;
  });

  console.log(`Gefunden: ${gaps.length} Strains mit Lücken.`);

  for (let i = 0; i < gaps.length; i++) {
    const s = gaps[i];
    process.stdout.write(`[${i+1}/${gaps.length}] Scrape ${s.name}... `);
    
    const data = await scrapeLeafly(s.name, s.brand);
    
    if (data) {
      const updates = {};
      
      // THC Range
      if (!s.thc_min && data.thc_avg) {
        updates.thc_min = Math.max(0, data.thc_avg - 2);
        updates.thc_max = data.thc_avg + 2;
      }
      
      // CBD Range
      if (!s.cbd_min && data.cbd_avg !== null) {
        updates.cbd_min = Math.max(0, data.cbd_avg - 0.5);
        updates.cbd_max = data.cbd_avg + 0.5;
      }

      // Genetics
      if ((!s.genetics || s.genetics === 'Unbekannt') && data.genetics) {
        updates.genetics = data.genetics;
      }

      // Flavors & Terpenes
      if (!s.flavors || s.flavors.length === 0) updates.flavors = data.flavors;
      if (!s.terpenes || s.terpenes.length === 0) updates.terpenes = data.terpenes;
      if (!s.effects || s.effects.length === 0) updates.effects = data.effects;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase.from('strains').update(updates).eq('id', s.id);
        if (!updateError) process.stdout.write("✅ Aktualisiert\n");
        else process.stdout.write("❌ Fehler\n");
      } else {
        process.stdout.write("🟡 Keine neuen Daten\n");
      }
    } else {
      process.stdout.write("⚠️ Nicht gefunden\n");
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("🏁 FERTIG!");
}

run();
