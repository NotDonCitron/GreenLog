// scripts/lib/attribution-store.mjs
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const fs = require('fs');

const ATTR_FILE = join(process.cwd(), 'scripts/.image-attributions.json');
const ATTR_FILE_TMP = join(process.cwd(), 'scripts/.image-attributions.tmp.json');

const DEFAULT_DATA = {};

export function readAttributions() {
  try {
    return JSON.parse(fs.readFileSync(ATTR_FILE, 'utf-8'));
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function writeAttributions(data) {
  // Atomic write: tmp file + rename
  fs.writeFileSync(ATTR_FILE_TMP, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(ATTR_FILE_TMP, ATTR_FILE);
}

export function saveAttribution(slug, attribution) {
  const data = readAttributions();
  data[slug] = attribution;
  writeAttributions(data);
}

export function getAttribution(slug) {
  return readAttributions()[slug] || null;
}
