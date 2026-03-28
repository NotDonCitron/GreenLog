import { execSync } from 'child_process';
import { extractOgImage, normalizeSlug } from './extract-image.mjs';

let lastCall = 0;

function rateLimit(source) {
  const delays = { leafly: 2000, wikileaf: 1000, picsum: 500 };
  const now = Date.now();
  const minDelay = delays[source] || 1000;
  const elapsed = now - lastCall;
  if (elapsed < minDelay) {
    execSync('sleep', [(minDelay - elapsed) / 1000]);
  }
  lastCall = Date.now();
}

/**
 * Fetches strain image from Leafly.
 * @param {string} slug - The strain slug
 * @param {string} name - The strain name (used for retry if slug differs)
 * @returns {Promise<{url: string, source: 'leafly'}|null>}
 */
export async function tryLeafly(slug, name) {
  rateLimit('leafly');

  const url = `https://leafly.com/strains/${normalizeSlug(slug)}`;
  const imageUrl = await extractOgImage(url);

  if (imageUrl) {
    return { url: imageUrl, source: 'leafly' };
  }

  // Retry with name if different from slug
  if (name && normalizeSlug(name) !== normalizeSlug(slug)) {
    rateLimit('leafly');
    const retryUrl = `https://leafly.com/strains/${normalizeSlug(name)}`;
    const retryImageUrl = await extractOgImage(retryUrl);
    if (retryImageUrl) {
      return { url: retryImageUrl, source: 'leafly' };
    }
  }

  return null;
}

/**
 * Fetches strain image from Wikileaf.
 * @param {string} slug - The strain slug
 * @param {string} name - The strain name (used for retry if slug differs)
 * @returns {Promise<{url: string, source: 'wikileaf'}|null>}
 */
export async function tryWikileaf(slug, name) {
  rateLimit('wikileaf');

  const url = `https://www.wikileaf.com/strains/${normalizeSlug(slug)}/`;
  const imageUrl = await extractOgImage(url);

  if (imageUrl) {
    return { url: imageUrl, source: 'wikileaf' };
  }

  // Retry with name if different from slug
  if (name && normalizeSlug(name) !== normalizeSlug(slug)) {
    rateLimit('wikileaf');
    const retryUrl = `https://www.wikileaf.com/strains/${normalizeSlug(name)}/`;
    const retryImageUrl = await extractOgImage(retryUrl);
    if (retryImageUrl) {
      return { url: retryImageUrl, source: 'wikileaf' };
    }
  }

  return null;
}

/**
 * Generates a deterministic Picsum image URL based on slug hash.
 * @param {string} slug - The strain slug
 * @returns {string} - The Picsum URL
 */
export function getPicsumUrl(slug) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    const char = slug.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `https://picsum.photos/seed/${Math.abs(hash)}/600/800`;
}

