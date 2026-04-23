// scripts/lib/seedbank-adapters/royal-queen.mjs
import { load } from 'cheerio';
import { fetchWithTimeout } from '../fetch-safe.mjs';

export const NAME = 'Royal Queen Seeds';
export const BASE_URL = 'https://www.royalqueenseeds.com';

export async function search(strainName) {
  const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(strainName)}`;
  try {
    const res = await fetchWithTimeout(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    }, 8000);
    if (!res.ok) return [];
    const html = await res.text();
    const $ = load(html);

    const term = strainName.toLowerCase();
    const productLinks = [];

    $('a').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const text = $el.text().trim();

      const isProductPath =
        href.includes('/feminized-cannabis-seeds/') ||
        href.includes('/autoflowering-cannabis-seeds/') ||
        href.includes('/cbd-seeds/') ||
        href.includes('/regular-cannabis-seeds/') ||
        href.includes('/cannabis-seeds/');

      if (isProductPath && text.toLowerCase().includes(term)) {
        if (!productLinks.find(p => p.href === href)) {
          productLinks.push({ href, text });
        }
      }
    });

    const limited = productLinks.slice(0, 2);

    const results = [];
    for (const { href, text } of limited) {
      try {
        const productRes = await fetchWithTimeout(href, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        }, 8000);
        if (!productRes.ok) continue;
        const productHtml = await productRes.text();
        const $$ = load(productHtml);

        const img =
          $$('img.main-product-image').first().attr('src') ||
          $$('img[src*="/large/"]').first().attr('src') ||
          $$('img.product-image').first().attr('src');

        if (img) {
          const cleanName = text.replace(/^\d+\.\s*/, '').trim();
          results.push({
            name: cleanName,
            imageUrl: img.startsWith('http') ? img : `${BASE_URL}${img}`,
            productUrl: href,
            confidence: 0.8,
          });
        }
      } catch {
        // Skip failed product page fetches
      }
    }

    return results;
  } catch {
    return [];
  }
}
