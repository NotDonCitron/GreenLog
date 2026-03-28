import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Cache der 17 direkt verfügbaren Beispiel-Bilder von GitHub
let examplesCache = null;

async function getExamples() {
  if (examplesCache) return examplesCache;

  const headers = [
    '-s', '-A', 'GreenLog/1.0',
    '-H', 'Accept: application/vnd.github.v3+json'
  ];
  if (GITHUB_TOKEN) {
    headers.push('-H', `Authorization: token ${GITHUB_TOKEN}`);
  }

  try {
    const json = execFileSync('curl', [
      ...headers,
      'https://api.github.com/repos/linhacanabica/images-strains-weed/contents/examples?per_page=100'
    ], { encoding: 'utf-8', timeout: 10000 });

    const data = JSON.parse(json);
    examplesCache = (data || [])
      .filter(f => f.type === 'file' && /\.(?:jpg|jpeg|png)$/i.test(f.name))
      .map(f => ({
        name: f.name.replace(/\.(?:jpg|jpeg|png)$/i, ''),
        url: f.download_url
      }));
    return examplesCache;
  } catch {
    return [];
  }
}

export async function findLinhacanabicaImage(strainName) {
  // Normalisiere Strain-Name für Fuzzy-Vergleich
  const normalized = strainName.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const examples = await getExamples();

  // Direkter Match
  const direct = examples.find(e => e.name === normalized);
  if (direct) return { url: direct.url, filename: direct.name + '.png' };

  // Fuzzy Match mit Levenshtein-Distance < 4
  for (const example of examples) {
    if (levenshtein(normalized, example.name) < 4) {
      return { url: example.url, filename: example.name + '.png' };
    }
  }

  return null;
}

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export async function downloadLinhacanabicaImage(imageUrl) {
  const tmpDir = os.tmpdir();
  const hash = createHash('md5').update(imageUrl).digest('hex');
  const tmpPath = path.join(tmpDir, `linha-${hash}.png`);

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
