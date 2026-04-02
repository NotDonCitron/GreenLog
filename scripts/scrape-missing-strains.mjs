/**
 * GreenLog — Scrape Missing Strain Images
 * Targeted script for the ~125 strains without images
 * Uses Leafly direct URL pattern with polite delays
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { writeFileSync, existsSync } from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY fehlt!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Strains missing images (from query)
const MISSING_STRAINS = [
  'trop-cherry','blue-nerds','cheetah-piss','gas-candy','obama-runtz','dantes-inferno',
  'strawberry-banana','cherry-runtz','purple-runtz','blue-runtz','carbon-fiber',
  'east-coast-sour-diesel','colombian-gold','strawberry','love-potion','fruit-punch',
  'rs11','black-runtz','white-durban','crunch-berries','jet-fuel-gelato','passion-fruit',
  'strawberry-lemonade','blueberry-dream','spk','green-goblin','cat-piss','cannalope-haze',
  'pineapple-punch','arjans-strawberry-haze','chocolate-diesel','f1-durb','chem-de-la-chem',
  'cbd-lilly','lemon-g','crumbled-lime','jack-the-ripper','sour-jack','mango-dream',
  'super-jack','pineapple-og','sour-joker','berry-pie','frostbite','sunshine',
  'key-lime-haze','sugar-plum','memory-loss','euphoria','strawberry-amnesia','purple-thai',
  'white-shark','french-cookies','blue-magic','gumbo','lemon-bars','blackberry-cream',
  'alien-bubba','rainbow-runtz','cement-shoes','blue-knight','triangle-kush','el-chapo-og',
  'y2k','bubblegum-gelato','purple-hindu-kush','pink-panties','illuminati-og','black-cherry-og',
  'purple-cream','purple-panty-dropper','pink-rozay','mendo-breath','strawberry-cheesecake',
  'black-ice','dolato','sunset','pluto','fatso','sweet-tooth','gobbstopper','donkey-butter',
  'snoop-dogg-og','purple-push-pop','gas-mask','jelly-roll','bubba-og','fpog','orange-kush',
  'legend-og','king-kush','candy-cane','alien-kush','platinum-kush','faygo-red-pop',
  'platinum-bubba-kush','point-break','hawaiian-snow','charlottes-web','pineapple-haze',
  'chocolate-thai','red-congolese','king-louis','watermelon-zkittlez','blue-zkittlez','g-13',
  'black-mamba','mango','garlic-bud','meat-breath','frosty','rainbow-belt','cadillac-rainbow',
  'grape-gasoline','black-cherry-gelato','matanuska-thunder-fuck','green-lantern','hawaiian-haze',
  'amnesia-lemon-haze','grape-cream-cake','donny-burger','watermelon','tigers-blood','hippie-crasher','cheesecake'
];

// Also delete garbage entries
const GARBAGE = ['test', 'test2', '--help'];

const DELAY_MS = 1500; // 1.5s between requests (Leafly polite)

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchLeaflyImage(strainSlug) {
  const url = `https://leafly.com/strains/${strainSlug}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      console.log(`  ❌ ${strainSlug}: HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();
    
    // Look for og:image or strain card image patterns
    const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const twitterMatch = html.match(/<meta name="twitter:image" content="([^"]+)"/);
    
    let imageUrl = null;
    
    if (ogMatch) {
      imageUrl = ogMatch[1];
    } else if (twitterMatch) {
      imageUrl = twitterMatch[1];
    }
    
    if (imageUrl && imageUrl.includes('leafly')) {
      console.log(`  ✅ ${strainSlug}: ${imageUrl.substring(0, 80)}...`);
      return imageUrl;
    }
    
    console.log(`  ⚠️ ${strainSlug}: kein Leafly-Bild gefunden`);
    return null;
  } catch (e) {
    console.log(`  ❌ ${strainSlug}: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log(`🔍 Starte Scraping für ${MISSING_STRAINS.length} Strains...\n`);
  
  const results = [];
  
  for (let i = 0; i < MISSING_STRAINS.length; i++) {
    const slug = MISSING_STRAINS[i];
    process.stdout.write(`[${i+1}/${MISSING_STRAINS.length}] ${slug}... `);
    
    const imageUrl = await fetchLeaflyImage(slug);
    
    if (imageUrl) {
      results.push({ slug, imageUrl });
    }
    
    if (i < MISSING_STRAINS.length - 1) {
      await sleep(DELAY_MS);
    }
  }
  
  console.log(`\n\n📊 Ergebnis: ${results.length} Bilder gefunden von ${MISSING_STRAINS.length} Strains`);
  
  if (results.length > 0) {
    console.log('\n💾 Speichere Results...');
    writeFileSync('scripts/.missing-strain-results.json', JSON.stringify(results, null, 2));
    
    // Batch update Supabase
    console.log('\n📤 Update Supabase...');
    let updated = 0;
    for (const r of results) {
      const { error } = await supabase
        .from('strains')
        .update({ image_url: r.imageUrl })
        .eq('name', r.slug);
      
      if (!error) updated++;
      else console.log(`  ⚠️ ${r.slug}: ${error.message}`);
    }
    console.log(`✅ ${updated} Strains in DB aktualisiert`);
  }
}

main().catch(console.error);
