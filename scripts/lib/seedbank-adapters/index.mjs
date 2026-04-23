// scripts/lib/seedbank-adapters/index.mjs
import * as sensi from './sensi-seeds.mjs';
import * as royalQueen from './royal-queen.mjs';
import * as barnys from './barnys-farm.mjs';
import * as dutch from './dutch-passion.mjs';

export const ADAPTERS = [sensi, royalQueen, barnys, dutch];

/**
 * Normalize strain name for fuzzy comparison.
 */
export function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein distance.
 */
export function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Score match between strain name and seedbank result.
 */
export function scoreMatch(strainName, resultName) {
  const a = normalizeName(strainName);
  const b = normalizeName(resultName);
  if (a === b) return 1.0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  // Boost if one contains the other
  const containment = a.includes(b) || b.includes(a) ? 0.15 : 0;
  return Math.max(0, 1 - dist / maxLen) + containment;
}

/**
 * Search all adapters and return best match per adapter.
 */
export async function searchAll(strainName) {
  const allResults = [];
  for (const adapter of ADAPTERS) {
    try {
      const results = await adapter.search(strainName);
      for (const r of results) {
        const score = scoreMatch(strainName, r.name);
        if (score >= 0.6) {
          allResults.push({ ...r, adapter: adapter.NAME, score });
        }
      }
    } catch (err) {
      console.warn(`  Adapter ${adapter.NAME} failed:`, err.message);
    }
  }
  // Sort by score descending
  allResults.sort((a, b) => b.score - a.score);
  return allResults;
}
