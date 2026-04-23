// scripts/lib/seedbank-adapters/sensi-seeds.mjs
import { execFileSync } from 'child_process';

export const NAME = 'Sensi Seeds';
export const BASE_URL = 'https://sensiseeds.com';

export async function search(strainName) {
  const apiUrl = `${BASE_URL}/catalog/searchtermautocomplete?term=${encodeURIComponent(strainName)}`;
  try {
    const json = execFileSync('curl', [
      '-s', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      '-m', '10',
      apiUrl
    ], { encoding: 'utf-8', timeout: 15000 });
    const data = JSON.parse(json);
    return (data || [])
      .filter(item => item.productwebpurl || item.productpictureurl)
      .map(item => ({
        name: item.name || strainName,
        imageUrl: (item.productwebpurl || item.productpictureurl)
          .replace(/_[0-9]+\.(webp|jpg|png)$/, '.$1'),
        productUrl: item.url || `${BASE_URL}/search?q=${encodeURIComponent(strainName)}`,
        confidence: 0.9,
      }));
  } catch {
    return [];
  }
}
