// scripts/lib/seedbank-adapters/dutch-passion.mjs
import { load } from 'cheerio';
import { fetchWithTimeout } from '../fetch-safe.mjs';

export const NAME = 'Dutch Passion';
export const BASE_URL = 'https://www.dutch-passion.com';

export async function search(strainName) {
  const searchUrl = `${BASE_URL}/en/search?s=${encodeURIComponent(strainName)}`;
  try {
    const res = await fetchWithTimeout(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    }, 8000);
    if (!res.ok) return [];
    const html = await res.text();
    const $ = load(html);

    if ($('#product-search-no-matches').length > 0) return [];

    const results = [];
    $('.js-product-miniature, .product-miniature').each((_, el) => {
      const $el = $(el);
      const name = $el.find('h2').first().text().trim();
      const img =
        $el.find('img').first().attr('data-full-size-image-url') ||
        $el.find('img').first().attr('data-src') ||
        $el.find('img').first().attr('src');
      const link = $el.find('a.product-miniature__thumb-link, a.stretched-link').first().attr('href') ||
        $el.find('a').first().attr('href');

      if (img && name && !img.startsWith('data:')) {
        results.push({
          name,
          imageUrl: img.startsWith('http') ? img : `${BASE_URL}${img}`,
          productUrl: link ? (link.startsWith('http') ? link : `${BASE_URL}${link}`) : searchUrl,
          confidence: 0.85,
        });
      }
    });

    return results;
  } catch {
    return [];
  }
}
