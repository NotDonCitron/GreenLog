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

async function scrapeWithVariants(strainName) {
  // Generiere verschiedene Slugs zum Ausprobieren
  const variants = [
    strainName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), // standard-slug
    strainName.toLowerCase().replace(/\s+/g, ''), // nospaces
    strainName.split(' ')[0].toLowerCase(), // first word only (z.B. "GSC" statt "Girl Scout Cookies")
  ].filter((v, i, a) => a.indexOf(v) === i); // Duplikate entfernen

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
          if (strain.description && strain.description.length > 50) {
            return {
              description: cleanLeaflyText(strain.description),
              terpenes: (strain.topTerpenes || []).map(t => ({ name: t.name, percent: null })),
              effects: Array.isArray(strain.effects) ? strain.effects.map(e => e.name) : [],
              type: (strain.category || "hybrid").toLowerCase()
            };
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

async function repair() {
  console.log("🛠️ STARTE REPARATUR-LAUF FÜR FEHLENDE TEXTE...");
  
  // Hole alle Strains mit Standard-Text oder ohne Text
  const { data: strains, error } = await supabase
    .from('strains')
    .select('id, name, slug')
    .or('description.ilike.%Die beliebte Sorte%,description.is.null');

  if (error) {
    console.error("Fehler beim Laden der Strains:", error.message);
    return;
  }

  console.log(`Gefunden: ${strains.length} Strains zum Reparieren.`);

  for (let i = 0; i < strains.length; i++) {
    const s = strains[i];
    process.stdout.write(`[${i+1}/${strains.length}] Versuche ${s.name}... `);
    
    const data = await scrapeWithVariants(s.name);
    
    if (data) {
      const { error: updateError } = await supabase
        .from('strains')
        .update({
          description: data.description,
          terpenes: data.terpenes,
          effects: data.effects,
          type: data.type
        })
        .eq('id', s.id);
      
      if (!updateError) process.stdout.write("✅ Repariert!\n");
      else process.stdout.write("❌ DB Fehler\n");
    } else {
      process.stdout.write("⚠️ Nicht auf Leafly gefunden\n");
    }
    
    // Längere Pause zur Sicherheit
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log("🏁 REPARATUR BEENDET!");
}

repair();
