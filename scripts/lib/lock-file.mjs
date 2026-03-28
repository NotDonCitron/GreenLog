import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

const LOCK_FILE = path.join(process.cwd(), 'scripts/.image-pipeline-lock.json');

const DEFAULT_DATA = {
  lastRun: null,
  processed: [],
  failed: [],
};

/**
 * Reads the lock file and returns its contents.
 * Returns default data if file doesn't exist or is corrupted.
 */
export function readLockFile() {
  try {
    const content = fs.readFileSync(LOCK_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { ...DEFAULT_DATA };
  }
}

/**
 * Writes data to the lock file as JSON with 2 spaces indent.
 */
export function writeLockFile(data) {
  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write lock file:', err);
    throw err;
  }
}

/**
 * Marks a slug as processed.
 * Adds to processed array (no duplicates), removes from failed if present.
 */
export function markProcessed(slug) {
  const data = readLockFile();
  if (!data.processed.includes(slug)) {
    data.processed.push(slug);
  }
  data.failed = data.failed.filter(f => f.slug !== slug);
  data.lastRun = new Date().toISOString();
  writeLockFile(data);
}

/**
 * Marks a slug as failed with a reason.
 * Adds to failed array or updates reason if already present.
 */
export function markFailed(slug, reason) {
  const data = readLockFile();
  const existingIndex = data.failed.findIndex(f => f.slug === slug);
  const entry = { slug, reason, timestamp: new Date().toISOString() };
  if (existingIndex >= 0) {
    data.failed[existingIndex] = entry;
  } else {
    data.failed.push(entry);
  }
  data.lastRun = new Date().toISOString();
  writeLockFile(data);
}

/**
 * Returns true if the slug is in the processed array.
 */
export function isProcessed(slug) {
  const data = readLockFile();
  return data.processed.includes(slug);
}
