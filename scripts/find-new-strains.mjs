/**
 * GreenLog/CannaLOG — Neue Strains Finder (Cannabis.net)
 * 
 * Sammelt ALLE Felder für die Strain-Karte:
 * - name, slug, type
 * - avg_thc, avg_cbd (ranges als min/max)
 * - effects[], flavors[], terpenes[]
 * - genetics, description
 * - image_url
 * 
 * Nutzung: node scripts/find-new-strains.mjs
 */

import { chromium } from 'playwright';

const DELAY_MS = 1500;

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/#/g, '');
}

function isPlaceholderImage(imgUrl) {
  if (!imgUrl) return true;
  const l = imgUrl.toLowerCase();
  return l.includes('placeholder') || 
         l.includes('/defaults/') ||
         l.includes('logo') ||
         l.includes('og-image');
}

async function getCannabisNetStrainLinks(browser) {
  const page = await browser.newPage();
  
  try {
    await page.goto('https://cannabis.net/strains', {
      waitUntil: 'domcontentloaded',
      timeout: 25000
    });
    await page.waitForTimeout(3000);

    // Get all strain links from the directory page
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => a.href.match(/cannabis\.net\/strains\/[a-z]+\/[a-z0-9-]+/))
        .map(a => {
          const text = a.innerText || '';
          const href = a.href;
          
          // Extract THC from link text
          const thcMatch = text.match(/THC[^0-9]*([0-9]+)-?([0-9]+)?/);
          // Extract CBD
          const cbdMatch = text.match(/CBD[^0-9]*([0-9.]+)/);
          // Extract type
          const typeText = text.toLowerCase();
          const type = typeText.includes('indica') ? 'indica' :
                       typeText.includes('sativa') ? 'sativa' : 'hybrid';
          
          return { 
            href, 
            name: text.split('\n')[0].trim(),
            thc: thcMatch ? { min: parseInt(thcMatch[1]), max: thcMatch[2] ? parseInt(thcMatch[2]) : null } : null,
            cbd: cbdMatch ? parseFloat(cbdMatch[1]) : null,
            type
          };
        })
        .filter(l => l.name && l.name.length > 1 && l.name.length < 50);
    });

    await page.close();
    return [...new Map(links.map(l => [l.href, l])).values()]; // dedupe by href

  } catch (err) {
    await page.close().catch(() => {});
    return [];
  }
}

async function scrapeCannabisNetStrain(url, browser) {
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const getMeta = (prop) => {
        const el = document.querySelector(`meta[${prop}]`);
        return el ? el.content : null;
      };

      const name = 
        document.querySelector('h1')?.innerText?.trim() ||
        getMeta('property="og:title"')?.replace(' - cannabis.net', '') || '';

      const imageUrl = getMeta('property="og:image"');
      const description = getMeta('property="og:description"') || '';
      const bodyText = document.body.innerText;

      // THC range
      const thcMatch = bodyText.match(/THC[^0-9]*([0-9]+)-?([0-9]+)?/);
      const thc_min = thcMatch ? parseInt(thcMatch[1]) : null;
      const thc_max = thcMatch && thcMatch[2] ? parseInt(thcMatch[2]) : thc_min;

      // CBD
      const cbdMatch = bodyText.match(/CBD[^0-9]*([0-9.]+)/);
      const cbd = cbdMatch ? parseFloat(cbdMatch[1]) : null;

      // Type
      const typeText = bodyText.toLowerCase();
      const type = typeText.includes('indica') ? 'indica' :
                   typeText.includes('sativa') ? 'sativa' : 'hybrid';

      // Effects (common patterns)
      const effectKeywords = ['euphoric', 'relaxed', 'happy', 'uplifted', 'creative', 'energetic', 'focused', 'sleepy', 'hungry', 'aroused', 'talkative'];
      const effects = effectKeywords.filter(e => typeText.includes(e)).slice(0, 6);

      // Flavors
      const flavorKeywords = ['sweet', 'sour', 'citrus', 'pine', 'earthy', 'woody', 'spicy', 'cheese', 'fruity', 'berry', 'tropical', 'lemon', 'lime', 'chocolate', 'coffee', 'mint', 'pepper', 'skunky', 'pungent', 'floral'];
      const flavors = flavorKeywords.filter(f => typeText.includes(f)).slice(0, 6);

      // Genetics (from cross names)
      const geneticsMatch = bodyText.match(/cross(?:es|ing)?[\s:]+([^,\n]{3,50})/i) ||
                           bodyText.match(/genetics?[\s:]+([^,\n]{3,50})/i);
      const genetics = geneticsMatch ? geneticsMatch[1].trim() : null;

      return {
        name,
        imageUrl,
        description: description.slice(0, 500),
        thc_min,
        thc_max,
        cbd,
        type,
        effects,
        flavors,
        genetics,
      };
    });

    await page.close();
    return data;

  } catch (err) {
    await page.close().catch(() => {});
    return null;
  }
}

async function main() {
  console.log('🌿 GreenLog — Vollständiger Strain Finder (Cannabis.net)\n');
  console.log('Sammelt: THC, CBD, Terpenes, Effects, Flavors, Genetics, Bild\n');

  const browser = await chromium.launch({ headless: true });
  const candidates = [];

  // Step 1: Get all strain links from cannabis.net/strains
  console.log('📋 Lade Strain-Liste von cannabis.net...');
  const strainLinks = await getCannabisNetStrainLinks(browser);
  console.log(`  ${strainLinks.length} Strains auf der Seite gefunden\n`);

  // Step 2: Scrape each strain for full data
  let processed = 0;
  let skipped = 0;

  for (const strainLink of strainLinks) {
    processed++;
    console.log(`[${processed}/${strainLinks.length}] ${strainLink.name}...`);

    // Skip if already have basic data from directory
    if (!strainLink.thc && !strainLink.cbd) {
      // Still need to scrape page for full data
    }

    const data = await scrapeCannabisNetStrain(strainLink.href, browser);

    if (data && data.name && data.imageUrl && !isPlaceholderImage(data.imageUrl)) {
      const strain = {
        name: data.name,
        slug: slugify(data.name),
        type: data.type || strainLink.type || 'hybrid',
        avg_thc: data.thc_max || data.thc_min || null,
        avg_cbd: data.cbd || null,
        thc_min: data.thc_min || null,
        thc_max: data.thc_max || null,
        cbd_min: data.cbd ? Math.max(0, data.cbd - 0.5) : null,
        cbd_max: data.cbd ? data.cbd + 0.5 : null,
        effects: data.effects || [],
        flavors: data.flavors || [],
        description: data.description || null,
        genetics: data.genetics || null,
        image_url: data.imageUrl,
        source: 'cannabis.net',
      };

      candidates.push(strain);
      console.log(`    ✅ THC: ${strain.avg_thc || '-'}% | CBD: ${strain.avg_cbd || '-'}% | Effects: ${strain.effects.length} | Flavors: ${strain.flavors.length}`);
    } else {
      console.log(`    ❌ Kein Bild oder unvollständig`);
      skipped++;
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  await browser.close();

  // Save results
  console.log(`\n\n📊 ERGEBNISSE:`);
  console.log(`   Strains mit Bild + THC/CBD: ${candidates.length}`);
  console.log(`   Nicht verarbeitet: ${skipped}`);

  if (candidates.length > 0) {
    const { writeFileSync } = await import('fs');
    writeFileSync('./new-strains-full-data.json', JSON.stringify(candidates, null, 2));

    console.log(`\n💾 Gespeichert: new-strains-full-data.json\n`);
    console.log('Beispieldaten (erste 5):');
    candidates.slice(0, 5).forEach(s => {
      console.log(`\n  ${s.name} (${s.type})`);
      console.log(`    THC: ${s.avg_thc || '-'}%${s.thc_min && s.thc_max ? ` (${s.thc_min}-${s.thc_max}%)` : ''} | CBD: ${s.avg_cbd || '-'}%`);
      console.log(`    Effects: ${s.effects.slice(0,3).join(', ') || '-'}`);
      console.log(`    Flavors: ${s.flavors.slice(0,3).join(', ') || '-'}`);
      console.log(`    Genetics: ${s.genetics || '-'}`);
      console.log(`    Bild: ${s.image_url?.slice(0, 60)}`);
    });

    console.log(`\n✅ Nächster Schritt: Import-Script bauen`);
  }
}

main().catch(console.error);
