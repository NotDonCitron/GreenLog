/**
 * GreenLog — Strain Finder (strain-database.com)
 * 
 * API: https://strain-database.com/api/strains/{slug}
 * 58.262 Strains mit THC, CBD, Genetics, Breeder, Bild
 * 
 * Nutzung: node scripts/find-new-strains-from-strain-db.mjs
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const IMAGE_BASE = 'https://strain-database.com/images/strains';
const DELAY_MS = 500;

// Target strains - popular US hype strains + classics
const TARGET_STRAINS = [
  // US Hype Strains
  'gelato', 'runtz', 'wedding-cake', 'gmo-cookies', 'mac', 'biscotti',
  'peanut-butter-breath', 'sundae-driver', 'mochi', 'gelonade', 'jungle-cake',
  'london-poundcake', 'gas-candy', 'cheetah-piss', 'rainbow-sherbet', 'f1-durb',
  'orange-pop', 'lemon-vibes', 'cherry-troops', 'mint-chip', 'ghost-toast',
  // More popular
  'gorilla-glue', 'girl-scout-cookies', 'og-kush', 'sour-diesel', 'blue-dream',
  'granddaddy-purple', 'northern-lights', 'purple-kush', 'jack-herer',
  'super-lemon-haze', 'green-crack', 'durban-poison', 'amnesia-haze',
  'white-widow', 'ak-47', 'chemdawg', 'trainwreck', 'pineapple-express',
  'headband', 'mafia-og', 'slurricane', 'wedding-pie', 'dosidos',
  'forum-gsc', 'gelato-41', 'gelato-33', 'pumpkin-bread', 'modified-grapes',
  'ice-cream-cake', 'gello', 'frankenstein', 'tropicana-cookies', 'gushers',
  'cactus-breathe', 'candy-platters', 'rocket-fuel', 'oreoz', 'la-confidential',
  'purple-panties', 'cherry-pie', 'blue-cheese', 'cali-d', 'alien-cookies',
  'biscotti', 'loud-tiger', 'hot-sugar', 'sugar-bear', 'white-truffle',
  'rainbow-runtz', 'grape-gasoline', 'black-cherry-gelato', 'pink-runtz',
  'white-runtz', '甜茶', // Tangie in Chinese
  'jealousy', 'sherbet', 'biscotti', 'motorbreath', 'la-kush-cake',
];

function fetchStrain(slug) {
  try {
    const json = execSync(`curl -sL "https://strain-database.com/api/strains/${slug}" -A "Mozilla/5.0" --max-time 15 2>/dev/null`, { encoding: 'utf8' });
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function downloadImage(slug) {
  try {
    const ext = 'webp';
    const path = `/tmp/strain-${slug}.${ext}`;
    execSync(`curl -sL "${IMAGE_BASE}/${slug}.webp" -A "Mozilla/5.0" -o "${path}" --max-time 20 2>/dev/null`);
    const fs = require('fs');
    const stats = fs.statSync(path);
    if (stats.size < 5000) {
      fs.unlinkSync(path);
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

async function main() {
  console.log('🌿 Strain Finder — strain-database.com\n');
  console.log(`📋 ${TARGET_STRAINS.length}目标Strains...\n`);

  const { writeFileSync: wf } = await import('fs');
  const candidates = [];
  const seen = new Set();

  for (let i = 0; i < TARGET_STRAINS.length; i++) {
    const slug = TARGET_STRAINS[i];
    if (seen.has(slug)) continue;
    seen.add(slug);

    process.stdout.write(`[${i+1}/${TARGET_STRAINS.length}] ${slug}... `);
    
    const data = fetchStrain(slug);
    
    if (data && data.name && data.thcPercentMin) {
      const imageUrl = data.primaryImageUrl ? 
        `https://strain-database.com${data.primaryImageUrl}` : null;
      
      const strain = {
        name: data.name,
        slug: data.slug,
        type: (data.strainType || 'hybrid').toLowerCase(),
        avg_thc: data.thcPercentMax || data.thcPercentMin,
        thc_min: data.thcPercentMin,
        thc_max: data.thcPercentMax || data.thcPercentMin,
        avg_cbd: data.cbdPercentMax || data.cbdPercentMin,
        cbd_min: data.cbdPercentMin,
        cbd_max: data.cbdPercentMax,
        genetics: data.parent1Name && data.parent2Name ? 
          `${data.parent1Name} × ${data.parent2Name}` : data.parent1Name || null,
        breeder: data.breederName,
        description: data.description || data.descriptionDe,
        image_url: imageUrl,
        image_local: downloadImage(slug),
        source: 'strain-database.com',
      };

      candidates.push(strain);
      console.log(`✅ THC: ${strain.avg_thc}% | CBD: ${strain.avg_cbd || '-'}% | Breeder: ${strain.breeder || '-'} | Bild: ${strain.image_url ? 'JA' : 'NEIN'}`);
    } else {
      console.log(`❌ (nicht gefunden)`);
    }
    
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n📊 ERGEBNISSE: ${candidates.length}/${TARGET_STRAINS.length} gefunden\n`);
  
  // Save all candidates (with or without images)
  wf('./new-strains-strain-db.json', JSON.stringify(candidates, null, 2));
  console.log(`💾 Gespeichert: new-strains-strain-db.json`);
  
  // Filter those with images
  const withImages = candidates.filter(c => c.image_local || c.image_url);
  console.log(`📷 Davon mit Bild: ${withImages.length}`);
  
  if (withImages.length > 0) {
    console.log('\nBeispiele:');
    withImages.slice(0, 5).forEach(s => {
      console.log(`  ${s.name}: THC ${s.avg_thc}%, ${s.type}, ${s.breeder || 'unbekannter Breeder'}`);
      console.log(`    Genetics: ${s.genetics || '-'}`);
      console.log(`    Bild: ${s.image_url}`);
    });
  }
}

main().catch(console.error);
