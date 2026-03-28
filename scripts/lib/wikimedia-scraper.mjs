// scripts/lib/wikimedia-scraper.mjs
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';

export async function findWikimediaImages(strainName) {
  const apiUrl = 'https://commons.wikimedia.org/w/api.php?' +
    'action=query&list=search&srsearch=' + encodeURIComponent(strainName + ' cannabis bud') +
    '&srnamespace=6&format=json&origin=*&srlimit=10';

  let results = [];
  try {
    const json = execFileSync('curl', [
      '-s', '-A', 'GreenLog/1.0',
      apiUrl
    ], { encoding: 'utf-8', timeout: 10000 });

    const data = JSON.parse(json);
    results = data.query?.search || [];
  } catch (err) {
    console.warn('Wikimedia API search failed:', err.message);
    return [];
  }

  const images = [];
  for (const result of results) {
    await new Promise(r => setTimeout(r, 1000));
    const title = result.title.toLowerCase();
    if (title.includes('3d') || title.includes('render') ||
        title.includes('cartoon') || title.includes('icon') ||
        title.includes('logo') || title.includes('seedling')) continue;

    const infoUrl = 'https://commons.wikimedia.org/w/api.php?' +
      'action=query&titles=' + encodeURIComponent(result.title) +
      '&prop=imageinfo&iiprop=url|extmeta' +
      '&iiextmetadata=Artist|LicenseShortName&format=json&origin=*';

    try {
      const infoJson = execFileSync('curl', ['-s', '-A', 'GreenLog/1.0', infoUrl], { encoding: 'utf-8', timeout: 10000 });
      const infoData = JSON.parse(infoJson);
      const pages = infoData.query?.pages || {};
      const page = Object.values(pages)[0];
      const imgInfo = page?.imageinfo?.[0];

      if (imgInfo?.thumburl || imgInfo?.url) {
        const author = (imgInfo.extmeta?.Artist?.value || 'Unknown')
          .replace(/<[^>]+>/g, '').trim();
        const license = imgInfo.extmeta?.LicenseShortName?.value || 'CC BY-SA';
        images.push({
          url: imgInfo.thumburl || imgInfo.url,
          author,
          license,
          pageUrl: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(result.title),
        });
      }
    } catch (err) {
      console.warn('Wikimedia image info fetch failed:', err.message);
    }
  }
  return images;
}

export async function downloadWikimediaImage(imageUrl) {
  const tmpDir = os.tmpdir();
  const hash = createHash('md5').update(imageUrl).digest('hex');
  const tmpPath = path.join(tmpDir, `wikimedia-${hash}.jpg`);

  try {
    execFileSync('curl', ['-s', '-L', '-o', tmpPath, imageUrl], { timeout: 15000 });
    const stats = fs.statSync(tmpPath);
    if (stats.size > 5000) return tmpPath;
    try { fs.unlinkSync(tmpPath); } catch {}
  } catch {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
  return null;
}
