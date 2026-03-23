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

async function testSingleStrain(name) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const url = `https://www.leafly.com/strains/${slug}`;
  
  console.log(`Testing ${name} at ${url}...`);
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    console.error(`Error: ${response.status} ${response.statusText}`);
    return;
  }

  const html = await response.text();
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
  
  if (nextDataMatch) {
    const fullData = JSON.parse(nextDataMatch[1]);
    const strain = fullData.props?.pageProps?.strain || {};
    
    const cleanDescription = cleanLeaflyText(strain.description);
    console.log(`\n--- CLEAN DESCRIPTION ---\n${cleanDescription.substring(0, 500)}...\n`);
    
    // Effekte extrahieren (Robustere Prüfung)
    const leaflyEffects = strain.effects;
    let formattedEffects = [];
    if (Array.isArray(leaflyEffects)) {
      formattedEffects = leaflyEffects.map(e => e.name).filter(Boolean);
    } else if (leaflyEffects && typeof leaflyEffects === 'object') {
      Object.values(leaflyEffects).forEach((group) => {
        if (Array.isArray(group)) {
          group.forEach(e => { if (e.name) formattedEffects.push(e.name); });
        }
      });
    }

    const { error } = await supabase.from('strains').upsert({
      name: strain.name || name,
      slug: slug,
      type: (strain.category || "hybrid").toLowerCase(),
      description: cleanDescription,
      terpenes: (strain.topTerpenes || []).map((t) => ({ name: t.name, percent: null })),
      effects: formattedEffects,
      genetics: strain.lineage?.displayName || "Unbekannt"
    }, { onConflict: 'slug' });

    if (error) console.error("Database Error:", error.message);
    else console.log("Successfully updated in database!");
  } else {
    console.error("Could not find __NEXT_DATA__ in HTML");
  }
}

testSingleStrain("OG Kush");
