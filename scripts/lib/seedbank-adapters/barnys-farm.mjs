// scripts/lib/seedbank-adapters/barnys-farm.mjs
import { load } from 'cheerio';
import { fetchWithTimeout } from '../fetch-safe.mjs';

export const NAME = "Barney's Farm";
export const BASE_URL = 'https://www.barneysfarm.com';

export async function search(strainName) {
  try {
    const res = await fetchWithTimeout(BASE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    }, 8000);
    if (!res.ok) return [];
    const html = await res.text();
    const $ = load(html);

    const term = strainName.toLowerCase();
    const results = [];

    const seen = new Set();
    $('.product_block').each((_, el) => {
      const $el = $(el);
      const name = $el.find('.product_name').first().text().trim();
      if (!name || !name.toLowerCase().includes(term)) return;

      const img = $el.find('img').first().attr('src');
      let link = $el.find('a').first().attr('href');

      if (img && name) {
        if (link && link.startsWith('./')) {
          link = link.replace(/^\.\//, '/');
        }
        const productUrl = link ? (link.startsWith('http') ? link : `${BASE_URL}${link}`) : BASE_URL;
        if (seen.has(productUrl)) return;
        seen.add(productUrl);

        results.push({
          name,
          imageUrl: img.startsWith('http') ? img : `${BASE_URL}${img}`,
          productUrl,
          confidence: 0.8,
        });
      }
    });

    return results;
  } catch {
    return [];
  }
}
