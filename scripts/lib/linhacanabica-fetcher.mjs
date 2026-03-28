import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';

export async function findLinhacanabicaImage(strainName) {
  const searchUrl = 'https://api.github.com/search/code' +
    '?q=' + encodeURIComponent(strainName + ' repo:linhacanabica/images-strains-weed') +
    '&per_page=5&type=code';

  try {
    const json = execFileSync('curl', [
      '-s', '-A', 'GreenLog/1.0',
      '-H', 'Accept: application/vnd.github.v3+json',
      searchUrl
    ], { encoding: 'utf-8', timeout: 10000 });

    const data = JSON.parse(json);
    const items = (data.items || []).filter(item =>
      /\.(?:jpg|jpeg|png)$/i.test(item.name)
    );

    if (items.length === 0) return null;

    const firstMatch = items[0];
    const rawUrl = firstMatch.html_url
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');

    return { url: rawUrl, filename: firstMatch.name };
  } catch {
    return null;
  }
}

export async function downloadLinhacanabicaImage(imageUrl) {
  const tmpDir = os.tmpdir();
  const hash = createHash('md5').update(imageUrl).digest('hex');
  const tmpPath = path.join(tmpDir, `linha-${hash}.jpg`);

  try {
    execFileSync('curl', ['-s', '-L', '-o', tmpPath, imageUrl], { timeout: 20000 });
    const stats = fs.statSync(tmpPath);
    if (stats.size > 5000) return tmpPath;
    try { fs.unlinkSync(tmpPath); } catch {}
  } catch {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
  return null;
}
