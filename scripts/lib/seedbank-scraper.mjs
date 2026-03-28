import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';

export async function findSeedbankImages(strainName) {
  const results = [];

  // Try Sensi Seeds autocomplete API
  try {
    const apiUrl = 'https://sensiseeds.com/catalog/searchtermautocomplete?term=' + encodeURIComponent(strainName);
    const json = execFileSync('curl', [
      '-s', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      apiUrl
    ], { encoding: 'utf-8', timeout: 10000 });
    const data = JSON.parse(json);
    for (const item of (data || [])) {
      if (item.productwebpurl || item.productpictureurl) {
        results.push({
          url: item.productwebpurl || item.productpictureurl,
          author: 'Sensi Seeds',
          license: 'promotional_use'
        });
      }
    }
  } catch {}

  return results;
}

export async function downloadSeedbankImage(imageUrl) {
  const tmpDir = os.tmpdir();
  const hash = createHash('md5').update(imageUrl).digest('hex');
  const ext = imageUrl.toLowerCase().includes('.webp') ? 'webp' : 'jpg';
  const tmpPath = path.join(tmpDir, `seedbank-${hash}.${ext}`);

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
