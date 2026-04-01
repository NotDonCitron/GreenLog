// scripts/find-strain-images-from-weedmaps.mjs
// Tries to find images for strains from Weedmaps
// Run: node scripts/find-strain-images-from-weedmaps.mjs

import { chromium } from 'playwright';

const DELAY_MS = 2000;

async function findImage(strainName) {
  const slug = strainName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const url = `https://weedmaps.com/strains/${slug}`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Try Weedmaps first
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    let imgUrl = await page.evaluate(() => {
      // Look for og:image
      const og = document.querySelector('meta[property="og:image"]');
      if (og && og.content && !og.content.includes('placeholder') && !og.content.includes('logo')) {
        return og.content;
      }
      // Look for strain image in page
      const img = document.querySelector('[data-testid="strain-hero-image"] img') ||
                  document.querySelector('.strain-page__hero img') ||
                  document.querySelector('article img');
      if (img && img.src && !img.src.includes('placeholder')) {
        return img.src;
      }
      return null;
    });

    // Try Leafly CDN as fallback
    if (!imgUrl) {
      const leaflySlug = slug;
      const leaflyUrl = `https://leafly.com/strains/${leaflySlug}`;
      await page.goto(leaflyUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      imgUrl = await page.evaluate(() => {
        const og = document.querySelector('meta[property="og:image"]');
        if (og && og.content && !og.content.includes('defaults') && !og.content.includes('logo')) {
          return og.content;
        }
        return null;
      });
    }

    await browser.close();

    const found = !!imgUrl;
    return { slug, name: strainName, url, imgUrl, found };

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return { slug, name: strainName, url, imgUrl: null, found: false, error: err.message };
  }
}

async function processStrains(strainNames, concurrency = 3) {
  console.log(`🔍 Finding images for ${strainNames.length} strains...\n`);

  const results = [];
  const withImages = [];
  const withoutImages = [];

  for (let i = 0; i < strainNames.length; i += concurrency) {
    const batch = strainNames.slice(i, i + concurrency);
    console.log(`[${i + 1}-${Math.min(i + concurrency, strainNames.length)}/${strainNames.length}]`);

    const batchResults = await Promise.all(batch.map(name => findImage(name)));

    for (const result of batchResults) {
      results.push(result);
      if (result.found) {
        withImages.push(result);
        console.log(`  ✅ ${result.name}: ${result.imgUrl?.slice(0, 70)}`);
      } else {
        withoutImages.push(result);
        console.log(`  ❌ ${result.name}`);
      }
    }

    if (i + concurrency < strainNames.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  return { results, withImages, withoutImages };
}

// CLI
const args = process.argv.slice(2);

if (args[0] === '--test') {
  const strains = args.slice(1).length > 0 ? args.slice(1) : ['gelato', 'wedding-cake', 'runtz', 'og-kush'];
  processStrains(strains).then(({ withImages, withoutImages }) => {
    console.log(`\n📊 RESULTS:`);
    console.log(`  ✅ Found: ${withImages.length}`);
    console.log(`  ❌ Missing: ${withoutImages.length}`);
    process.exit(0);
  });
} else {
  import('fs').then(({ readFileSync, writeFileSync }) => {
    const missing = JSON.parse(readFileSync('./real-missing-strains.json', 'utf-8'));
    console.log(`\n📂 Loaded ${missing.length} strains from real-missing-strains.json\n`);

    processStrains(missing).then(({ withImages, withoutImages }) => {
      console.log(`\n📊 FINAL RESULTS:`);
      console.log(`  ✅ Found images: ${withImages.length}`);
      console.log(`  ❌ Still missing: ${withoutImages.length}`);

      writeFileSync('./found-strain-images.json', JSON.stringify(withImages, null, 2));
      writeFileSync('./still-missing-strains.json', JSON.stringify(withoutImages.map(r => r.name), null, 2));

      console.log(`\n💾 Saved found-strain-images.json (${withImages.length})`);
      console.log(`💾 Saved still-missing-strains.json (${withoutImages.length})`);
      process.exit(0);
    });
  });
}
