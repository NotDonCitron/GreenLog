import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';

export async function findSeedbankImages(sourceUrl, strainName) {
  const html = execFileSync('curl', [
    '-s', '-L', '-A',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    sourceUrl
  ], { encoding: 'utf-8', timeout: 15000 });

  const normalizedName = strainName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const imgRegex = /https?:\/\/[^\s"']+\.(?:jpg|jpeg|png)(?:\?[^\s"']*)?/gi;
  const urls = html.match(imgRegex) || [];

  return urls
    .filter(url => {
      const lower = url.toLowerCase();
      return lower.includes(strainName.toLowerCase()) || lower.includes(normalizedName);
    })
    .map(url => ({ url, author: 'Seedbank', license: 'promotional_use' }));
}

export async function downloadSeedbankImage(imageUrl) {
  const tmpDir = os.tmpdir();
  const hash = createHash('md5').update(imageUrl).digest('hex');
  const tmpPath = path.join(tmpDir, `seedbank-${hash}.jpg`);

  try {
    execFileSync('curl', ['-s', '-L', '-o', tmpPath, imageUrl], { timeout: 15000 });
    const stats = fs.statSync(tmpPath);
    if (stats.size > 5000) return tmpPath;
    fs.unlinkSync(tmpPath);
  } catch {}
  return null;
}
