/**
 * GreenLog — Strain Finder (Lightweight, kein Browser)
 * Nutzt nur HTTP requests — kein Playwright
 * 
 * Nutzung: node scripts/find-new-strains-http.mjs
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const DELAY_MS = 1200;

// Extended strain list - Top strains from cannabis.net + popular varieties
const STRAINS = [
  // Hybrid - Popular
  { name: 'Wedding Cake', slug: 'wedding-cake', type: 'hybrid' },
  { name: 'Gelato', slug: 'gelato', type: 'hybrid' },
  { name: 'Runtz', slug: 'runtz', type: 'hybrid' },
  { name: 'GSC', slug: 'girl-scout-cookies', type: 'hybrid' },
  { name: 'MAC', slug: 'mac', type: 'hybrid' },
  { name: 'GMO Cookies', slug: 'gmo-cookies', type: 'hybrid' },
  { name: 'Cheese', slug: 'cheese', type: 'hybrid' },
  { name: 'Dosidos', slug: 'dosidos', type: 'hybrid' },
  { name: 'Larry OG', slug: 'larry-og', type: 'hybrid' },
  { name: 'Sour Diesel', slug: 'sour-diesel', type: 'hybrid' },
  // Indica - Popular
  { name: 'Northern Lights', slug: 'northern-lights', type: 'indica' },
  { name: 'Purple Kush', slug: 'purple-kush', type: 'indica' },
  { name: 'Granddaddy Purple', slug: 'granddaddy-purple', type: 'indica' },
  { name: 'Ice Cream Cake', slug: 'ice-cream-cake', type: 'indica' },
  { name: 'Wedding Pie', slug: 'wedding-pie', type: 'indica' },
  { name: 'GMO', slug: 'gmo', type: 'indica' },
  { name: 'Motorbreath', slug: 'motorbreath', type: 'indica' },
  // Sativa - Popular
  { name: 'Jack Herer', slug: 'jack-herer', type: 'sativa' },
  { name: 'Super Lemon Haze', slug: 'super-lemon-haze', type: 'sativa' },
  { name: 'Green Crack', slug: 'green-crack', type: 'sativa' },
  { name: 'Durban Poison', slug: 'durban-poison', type: 'sativa' },
  { name: 'Amnesia Haze', slug: 'amnesia-haze', type: 'sativa' },
  { name: 'Tangie', slug: 'tangie', type: 'sativa' },
  { name: 'Super Silver Haze', slug: 'super-silver-haze', type: 'sativa' },
  { name: 'Maui Wowie', slug: 'maui-wowie', type: 'sativa' },
  { name: 'Chocolope', slug: 'chocolope', type: 'sativa' },
  // More Hybrids
  { name: 'Biscotti', slug: 'biscotti', type: 'hybrid' },
  { name: 'Peanut Butter Breath', slug: 'peanut-butter-breath', type: 'hybrid' },
  { name: 'Sundae Driver', slug: 'sundae-driver', type: 'hybrid' },
  { name: 'Mochi', slug: 'mochi', type: 'hybrid' },
  { name: 'Gelonade', slug: 'gelonade', type: 'hybrid' },
  { name: 'Jungle Cake', slug: 'jungle-cake', type: 'hybrid' },
  { name: 'Ice Cream Cake', slug: 'ice-cream-cake', type: 'indica' },
  { name: 'Cheetah Piss', slug: 'cheetah-piss', type: 'hybrid' },
  { name: 'Paris OG', slug: 'paris-og', type: 'indica' },
  { name: 'Starbud', slug: 'starbud', type: 'indica' },
  { name: 'SFV OG', slug: 'sfv-og', type: 'indica' },
  { name: 'Kuah', slug: 'kush', type: 'indica' },
];

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/#/g, '');
}

function scrape(url) {
  try {
    const html = execSync(`curl -sL "${url}" -A "Mozilla/5.0" --max-time 15 2>/dev/null`, { encoding: 'utf8' });
    
    if (!html || html.length < 200) return null;
    
    // Image
    const imgMatch = html.match(/og:image["\s]+content=["']([^"']+)["']/i) ||
                     html.match(/<img[^>]+class=["'][^"']*(?:strain|hero|product)[^"']*["'][^>]+src=["']([^"']+)["']/i);
    const imageUrl = imgMatch ? imgMatch[1] : null;
    
    // THC range
    const thcMatch = html.match(/THC[^0-9]*([0-9]+)-?([0-9]+)?%/i);
    const thc_min = thcMatch ? parseInt(thcMatch[1]) : null;
    const thc_max = thcMatch && thcMatch[2] ? parseInt(thcMatch[2]) : thcMatch?.[1] ? parseInt(thcMatch[1]) : null;
    
    // CBD
    const cbdMatch = html.match(/CBD[^0-9]*([0-9.]+)/i);
    const cbd = cbdMatch ? parseFloat(cbdMatch[1]) : null;
    
    // Effects
    const effectKeywords = ['euphoric', 'relaxed', 'happy', 'uplifted', 'creative', 'energetic', 'focused', 'sleepy', 'hungry', 'aroused'];
    const textLower = html.toLowerCase();
    const effects = [...new Set(effectKeywords.filter(e => textLower.includes(e)))].slice(0, 6);
    
    // Flavors
    const flavorKeywords = ['sweet', 'sour', 'citrus', 'pine', 'earthy', 'woody', 'spicy', 'cheese', 'fruity', 'berry', 'tropical', 'lemon', 'lime', 'chocolate', 'coffee', 'mint', 'pepper', 'skunky', 'pungent', 'floral', 'berry', 'grape'];
    const flavors = [...new Set(flavorKeywords.filter(f => textLower.includes(f)))].slice(0, 6);
    
    return { imageUrl, thc_min, thc_max, cbd, effects, flavors };
  } catch {
    return null;
  }
}

async function main() {
  console.log('🌿 Strain Finder — Extended Version\n');
  console.log(`📋 ${STRAINS.length} Strains zum Scrapen...\n`);

  const candidates = [];
  const { writeFileSync: wf } = await import('fs');

  for (let i = 0; i < STRAINS.length; i++) {
    const s = STRAINS[i];
    const url = `https://cannabis.net/strains/${s.type}/${s.slug}`;
    
    process.stdout.write(`[${i+1}/${STRAINS.length}] ${s.name} (${s.type})... `);
    
    const data = scrape(url);
    
    if (data && data.imageUrl && data.thc_min) {
      const strain = {
        name: s.name,
        slug: slugify(s.name),
        type: s.type,
        avg_thc: data.thc_max || data.thc_min,
        thc_min: data.thc_min,
        thc_max: data.thc_max || data.thc_min,
        avg_cbd: data.cbd || null,
        cbd_min: data.cbd ? Math.max(0, data.cbd - 0.5) : null,
        cbd_max: data.cbd ? data.cbd + 0.5 : null,
        effects: data.effects,
        flavors: data.flavors,
        image_url: data.imageUrl,
        source: 'cannabis.net',
      };
      
      // Fix outliers
      if (strain.avg_thc > 50) strain.avg_thc = null;
      if (strain.avg_cbd > 15) strain.avg_cbd = null;
      
      candidates.push(strain);
      process.stdout.write(`✅ THC: ${strain.avg_thc}% | CBD: ${strain.avg_cbd || '-'}% | Fx: ${strain.effects.length} | Fl: ${strain.flavors.length}\n`);
    } else {
      process.stdout.write(`❌\n`);
    }
    
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n📊 ERGEBNISSE: ${candidates.length}/${STRAINS.length} mit Bild + THC`);
  
  wf('./new-strains-full-data.json', JSON.stringify(candidates, null, 2));
  console.log(`💾 Gespeichert: new-strains-full-data.json`);
  
  if (candidates.length > 0) {
    console.log('\nBeispieldaten:');
    candidates.slice(0, 5).forEach(s => {
      console.log(`  ${s.name}: THC ${s.avg_thc}%, CBD ${s.avg_cbd || '-'}%`);
      console.log(`    Effects: ${s.effects.slice(0,3).join(', ')}`);
      console.log(`    Flavors: ${s.flavors.slice(0,3).join(', ')}`);
    });
  }
}

main().catch(console.error);
