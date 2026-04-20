import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OBSCURA_BIN = path.join(__dirname, '..', 'obscura');

// MED/Mbrand → Leafly slug mapping (from existing scripts)
const SLUG_MAPPING = {
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
  "sherbert": "sunset-sherbert",
  "pink-gas": "pink-kush",
  "goc": "gmo-cookies",
  "biscotti": "biscotti",
  "apples-and-bananas": "apples-and-bananas",
  "sherbet": "sunset-sherbert",
  "gsc": "gsc",
  "gelato": "gelato",
  "mimosa": "mimosa",
  "sunset-sherbet": "sunset-sherbert",
};

/**
 * Generate URL-slug variants from a strain name.
 * Tries: exact, normalized, mapped, singular/plural, first-word, no-hyphens.
 */
function generateSlugVariants(name) {
  if (!name) return [];
  const base = String(name).toLowerCase().trim();
  const variants = new Set();

  // 1. Exact (MED_MAPPING override)
  if (SLUG_MAPPING[base]) {
    variants.add(SLUG_MAPPING[base]);
  }

  // 2. Direct normalized slug
  const normalized = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  variants.add(normalized);

  // 3. Plural
  variants.add(normalized + 's');
  // 4. Singular (remove trailing 's')
  if (base.endsWith('s') && base.length > 2) {
    variants.add(normalized.replace(/s$/, ''));
  }
  // 5. No hyphens
  variants.add(normalized.replace(/-/g, ''));
  // 6. First word only
  const firstWord = normalized.split('-')[0];
  if (firstWord && firstWord !== normalized) {
    variants.add(firstWord);
  }

  return [...new Set(variants)].filter(v => v.length > 1);
}

/**
 * Run Obscura fetch with eval expression.
 */
function obscuraEval(url, evalExpr, timeout = 45000) {
  const encUrl = url.replace(/"/g, '\\"');
  const encExpr = evalExpr.replace(/"/g, '\\"');
  const cmd = `${OBSCURA_BIN} fetch "${encUrl}" --eval "${encExpr}" --stealth -q --wait-until networkidle0`;

  try {
    return execSync(cmd, {
      encoding: 'utf8',
      timeout,
      maxBuffer: 50 * 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Parse Leafly __NEXT_DATA__ into structured strain data.
 */
function parseLeaflyNextData(nextData) {
  try {
    const strain = nextData?.props?.pageProps?.strain;
    if (!strain || !strain.name) return null;

    const terps = Object.entries(strain.terps || {})
      .map(([key, val]) => ({
        name: val.name,
        percent: parseFloat((val.score * 2).toFixed(1)) || 0.5,
      }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3);

    const effects = Object.entries(strain.effects || {})
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, 5)
      .map(([, e]) => e.name);

    const flavors = Object.entries(strain.flavors || {})
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, 3)
      .map(([, f]) => f.name);

    const thc = strain.cannabinoids?.thc?.percentile50 || null;
    const description = strain.descriptionPlain || null;

    return {
      description,
      terpenes: terps.length > 0 ? terps : null,
      effects: effects.length > 0 ? effects : null,
      flavors: flavors.length > 0 ? flavors : null,
      thc_avg: thc,
      type: (strain.category || 'hybrid').toLowerCase(),
      found_slug: strain.slug,
      leafly_url: `https://leafly.com/strains/${strain.slug}`,
    };
  } catch {
    return null;
  }
}

/**
 * Scrape Leafly strain data (terpenes, effects, flavors, description, THC)
 * using Obscura headless browser with automatic slug variant fallback.
 *
 * @param {string} slug - Strain slug from DB
 * @param {string} name - Strain name from DB
 * @returns {Promise<Object|null>} Scraped data or null
 */
export async function scrapeLeaflyWithObscura(slug, name) {
  const triedSlugs = new Set();
  const allVariants = [
    ...generateSlugVariants(slug),
    ...(name && name !== slug ? generateSlugVariants(name) : []),
  ];

  for (const variant of allVariants) {
    if (triedSlugs.has(variant)) continue;
    triedSlugs.add(variant);

    const url = `https://leafly.com/strains/${variant}`;

    // Check page title for 404 before trying to parse
    const title = obscuraEval(url, 'document.title');
    if (!title || title.includes('404') || title.includes('Not Found')) {
      continue;
    }

    const raw = obscuraEval(
      url,
      "document.getElementById('__NEXT_DATA__')?.textContent || null"
    );

    if (!raw) continue;

    try {
      const nextData = JSON.parse(raw);
      const result = parseLeaflyNextData(nextData);
      if (result) {
        return result;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Extract strain image URL from Leafly using Obscura.
 * Tries: og:image meta tag → nugImage from __NEXT_DATA__ → Wikileaf og:image
 *
 * @param {string} slug - Strain slug
 * @param {string} name - Strain name
 * @returns {Promise<{url: string, source: string}|null>}
 */
export async function getStrainImageWithObscura(slug, name) {
  const triedSlugs = new Set();
  const allVariants = [
    ...generateSlugVariants(slug),
    ...(name && name !== slug ? generateSlugVariants(name) : []),
  ];

  for (const variant of allVariants) {
    if (triedSlugs.has(variant)) continue;
    triedSlugs.add(variant);

    const leaflyUrl = `https://leafly.com/strains/${variant}`;
    const title = obscuraEval(leaflyUrl, 'document.title');
    if (title && !title.includes('404') && !title.includes('Not Found')) {
      // Try og:image first
      const ogImage = obscuraEval(
        leaflyUrl,
        "document.querySelector('meta[property=\"og:image\"]')?.content || ''"
      );
      if (ogImage) return { url: ogImage, source: 'leafly' };

      // Fall back to nugImage from __NEXT_DATA__
      const nugImage = obscuraEval(
        leaflyUrl,
        `(function(){try{return JSON.parse(document.getElementById('__NEXT_DATA__')?.textContent)?.props?.pageProps?.strain?.nugImage||null}catch(e){return null}})()`
      );
      if (nugImage) return { url: nugImage, source: 'leafly' };
    }

    // Try Wikileaf
    const wikileafUrl = `https://www.wikileaf.com/strains/${variant}/`;
    const wikileafOg = obscuraEval(
      wikileafUrl,
      "document.querySelector('meta[property=\"og:image\"]')?.content || ''"
    );
    if (wikileafOg) return { url: wikileafOg, source: 'wikileaf' };
  }

  return null;
}
