// scripts/lib/attribution-store.mjs
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const fs = require('fs');

const ATTR_FILE = join(process.cwd(), 'scripts/.image-attributions.json');

const DEFAULT_DATA = {};

export function readAttributions() {
  try {
    return JSON.parse(fs.readFileSync(ATTR_FILE, 'utf-8'));
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function writeAttributions(data) {
  fs.writeFileSync(ATTR_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function saveAttribution(slug, attribution) {
  const data = readAttributions();
  data[slug] = attribution;
  writeAttributions(data);
}

export function getAttribution(slug) {
  return readAttributions()[slug] || null;
}
