import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

async function scrapeLeafly(strainName) {
  // Variants for slug
  const variants = [
    strainName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    strainName.toLowerCase().replace(/\s+/g, ''),
    strainName.split(' ')[0].toLowerCase(),
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (const slug of variants) {
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
            // Process Terpenes
            const terps = Object.entries(strain.terps || {})
              .map(([key, val]) => ({ name: val.name, score: val.score }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map(t => ({ name: t.name, percent: parseFloat((t.score * 2).toFixed(1)) || 0.5 }));

            // Process Effects
            const effects = Object.entries(strain.effects || {})
              .map(([key, val]) => ({ name: val.name, score: val.score }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map(e => e.name);

            // Process Flavors
            const flavors = Object.entries(strain.flavors || {})
              .map(([key, val]) => ({ name: val.name, score: val.score }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map(f => f.name);

            // Process THC
            const thc = strain.cannabinoids?.thc?.percentile50 || null;

            return {
              description: cleanLeaflyText(strain.description) || null,
              terpenes: terps.length > 0 ? terps : null,
              effects: effects.length > 0 ? effects : null,
              flavors: flavors.length > 0 ? flavors : null,
              thc_avg: thc,
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
  console.log("🔍 SUCHE STRAINS MIT DATEN-LÜCKEN...");

  // Wir suchen Strains, die:
  // - Keine Beschreibung haben oder Platzhalter-Text
  // - Keine Terpene haben
  // - Keine Effekte haben
  // - Keine Flavors haben
  
  const { data: strains, error } = await supabase
    .from('strains')
    .select('*');

  if (error) {
    console.error("Fehler beim Laden:", error);
    return;
  }

  const gaps = strains.filter(s => {
    const hasBadDescription = !s.description || s.description.includes("Die beliebte Sorte") || s.description.includes("Medizinisches Cannabis von");
    const hasNoTerpenes = !s.terpenes || (Array.isArray(s.terpenes) && s.terpenes.length === 0);
    const hasNoEffects = !s.effects || (Array.isArray(s.effects) && s.effects.length === 0);
    const hasNoFlavors = !s.flavors || (Array.isArray(s.flavors) && s.flavors.length === 0);
    
    return hasBadDescription || hasNoTerpenes || hasNoEffects || hasNoFlavors;
  });

  console.log(`Gefunden: ${gaps.length} Strains mit Lücken (von insgesamt ${strains.length}).`);

  for (let i = 0; i < gaps.length; i++) {
    const s = gaps[i];
    // Extrahiere den Namen (entferne Brand falls vorhanden bei medizinischen Strains)
    let searchName = s.name;
    if (s.is_medical && s.brand) {
        searchName = s.name.replace(s.brand, "").trim();
    }
    
    process.stdout.write(`[${i+1}/${gaps.length}] Scrape ${s.name} (Suche nach: ${searchName})... `);
    
    const data = await scrapeLeafly(searchName);
    
    if (data) {
      const updates = {};
      if (!s.description || s.description.includes("Die beliebte Sorte") || s.description.includes("Medizinisches Cannabis von")) {
        if (data.description && data.description.length > 50) updates.description = data.description;
      }
      if (!s.terpenes || s.terpenes.length === 0) updates.terpenes = data.terpenes;
      if (!s.effects || s.effects.length === 0) updates.effects = data.effects;
      if (!s.flavors || s.flavors.length === 0) updates.flavors = data.flavors;
      if (!s.thc_min && data.thc_avg) {
        updates.thc_min = Math.max(0, data.thc_avg - 2);
        updates.thc_max = data.thc_avg + 2;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('strains')
          .update(updates)
          .eq('id', s.id);
          
        if (!updateError) process.stdout.write("✅ Daten aktualisiert\n");
        else process.stdout.write(`❌ DB Fehler: ${updateError.message}\n`);
      } else {
        process.stdout.write("🟡 Keine neuen Daten gefunden\n");
      }
    } else {
      process.stdout.write("⚠️ Nicht gefunden\n");
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log("🏁 FERTIG!");
}

run();
