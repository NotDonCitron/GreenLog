import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MED_MAPPING = {
  "sedamen": "pink-kush",
  "luminarium": "delahaze",
  "pedanios": "ghost-train-haze",
  "houndstooth": "super-lemon-haze",
  "penelope": "cbd-skunk-haze",
  "argaman": "cbd-critical-mass",
  "islander": "wappa",
  "monkey-butter": "monkey-grease",
  "farm-gas": "gmo-cookies",
  "sourdough": "wedding-cake",
  "typ-1": "master-kush",
  "typ-2": "warlock",
  "galax": "white-widow",
  "craft-emerald": "gsc",
  "tiger-eyez": "tiger-cake",
  "plum-driver": "plum-crazy",
  "bling-blaow": "glitter-bomb",
  "el-gringo": "gsc",
  "el-jefe": "el-jefe",
  "scotti": "wedding-cake",
  "ice-cream-cake-kush-mints": "ice-cream-cake",
  "kush-mint": "kush-mints",
  "gorilla-glue": "gorilla-glue-4",
  "gg4": "gorilla-glue-4",
  "london-pound-cake": "london-pound-cake-75",
  "sherbert": "sunset-sherbet",
  "pink-gas": "pink-kush",
  "goc": "gmo-cookies",
  "biscotti": "biscotti",
  "apples-and-bananas": "apples-and-bananas"
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
  
  // 1. Markennamen entfernen
  if (brand) {
    baseName = baseName.replace(brand.toLowerCase(), "").trim();
  }

  // 2. Technische Suffixe entfernen
  baseName = baseName
    .replace(/\s+\d+\/\d+$/, "") // 24/1 etc
    .replace(/\s+thc\d+.*$/, "") // thc25 etc
    .replace(/\s+typ\s+\d+$/, "") // typ 1 etc
    .replace(/\s+pn$/, "")
    .replace(/\s+cm$/, "")
    .replace(/\s+remexian$/, "")
    .replace(/\s+vayamed$/, "")
    .replace(/\s+amici$/, "")
    .trim();

  const slugBase = baseName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // 3. Mapping check
  const mappedSlug = MED_MAPPING[slugBase];
  
  const variants = [];
  if (mappedSlug) variants.push(mappedSlug);
  variants.push(slugBase);
  variants.push(slugBase + "s"); // plural
  if (slugBase.endsWith("s")) variants.push(slugBase.slice(0, -1)); // singular
  variants.push(slugBase.replace(/-/g, "")); // nospaces
  if (slugBase.includes("-")) variants.push(slugBase.split("-")[0]); // first word

  // Unique variants
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
            const terps = Object.entries(strain.terps || {})
              .map(([key, val]) => ({ name: val.name, score: val.score }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map(t => ({ name: t.name, percent: parseFloat((t.score * 2).toFixed(1)) || 0.5 }));

            const effects = Object.entries(strain.effects || {})
              .map(([key, val]) => ({ name: val.name, score: val.score }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map(e => e.name);

            const flavors = Object.entries(strain.flavors || {})
              .map(([key, val]) => ({ name: val.name, score: val.score }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map(f => f.name);

            const thc = strain.cannabinoids?.thc?.percentile50 || null;

            return {
              description: cleanLeaflyText(strain.description) || null,
              terpenes: terps.length > 0 ? terps : null,
              effects: effects.length > 0 ? effects : null,
              flavors: flavors.length > 0 ? flavors : null,
              thc_avg: thc,
              type: (strain.category || "hybrid").toLowerCase(),
              found_slug: slug
            };
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

async function run() {
  console.log("🔍 STARTE VERFEINERTES SCRAPING FÜR LÜCKEN...");

  const { data: strains, error } = await supabase
    .from('strains')
    .select('*');

  if (error) {
    console.error("Fehler beim Laden:", error);
    return;
  }

  const gaps = strains.filter(s => {
    const hasBadDescription = !s.description || s.description.includes("Die beliebte Sorte") || s.description.includes("Medizinisches Cannabis von") || s.description.length < 40;
    const hasNoTerpenes = !s.terpenes || (Array.isArray(s.terpenes) && s.terpenes.length === 0);
    const hasNoEffects = !s.effects || (Array.isArray(s.effects) && s.effects.length === 0);
    const hasNoFlavors = !s.flavors || (Array.isArray(s.flavors) && s.flavors.length === 0);
    
    return hasBadDescription || hasNoTerpenes || hasNoEffects || hasNoFlavors;
  });

  console.log(`Gefunden: ${gaps.length} Strains mit Lücken.`);

  for (let i = 0; i < gaps.length; i++) {
    const s = gaps[i];
    process.stdout.write(`[${i+1}/${gaps.length}] Scrape ${s.name}... `);
    
    const data = await scrapeLeafly(s.name, s.brand);
    
    if (data) {
      const updates = {};
      // Update description only if generic or missing
      if (!s.description || s.description.includes("Die beliebte Sorte") || s.description.includes("Medizinisches Cannabis von") || s.description.length < 50) {
        if (data.description) updates.description = data.description;
      }
      
      // Update arrays if empty
      if (!s.terpenes || s.terpenes.length === 0) updates.terpenes = data.terpenes;
      if (!s.effects || s.effects.length === 0) updates.effects = data.effects;
      if (!s.flavors || s.flavors.length === 0) updates.flavors = data.flavors;
      
      // Update THC if missing
      if (!s.thc_min && data.thc_avg) {
        updates.thc_min = Math.max(0, data.thc_avg - 2);
        updates.thc_max = data.thc_avg + 2;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('strains')
          .update(updates)
          .eq('id', s.id);
          
        if (!updateError) process.stdout.write(`✅ (${data.found_slug})\n`);
        else process.stdout.write(`❌ DB Fehler\n`);
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
