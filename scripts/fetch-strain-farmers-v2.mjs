// scripts/fetch-strain-farmers-v2.mjs
// Scrapes farmer/breeder information from multiple sources
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DELAY_MS = 1500;
let lastCall = 0;

function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastCall;
  if (elapsed < DELAY_MS) {
    const sleepTime = (DELAY_MS - elapsed) / 1000;
    execSync(`sleep ${sleepTime}`);
  }
  lastCall = Date.now();
}

const { execSync } = await import('child_process');

// Lock file management
const LOCK_FILE = 'scripts/.farmer-pipeline-lock.json';

function readLockFile() {
  if (!existsSync(LOCK_FILE)) return { processed: [], lastRun: null };
  try {
    return JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
  } catch {
    return { processed: [], lastRun: null };
  }
}

function writeLockFile(data) {
  writeFileSync(LOCK_FILE, JSON.stringify(data, null, 2));
}

function markProcessed(slug) {
  const lock = readLockFile();
  if (!lock.processed.includes(slug)) {
    lock.processed.push(slug);
    lock.lastRun = new Date().toISOString();
    writeLockFile(lock);
  }
}

function isProcessed(slug) {
  const lock = readLockFile();
  return lock.processed.includes(slug);
}

// Known breeder mappings for popular strains (as fallback)
const KNOWN_BREEDERS = {
  // OG Family
  'og-kush': 'Chemdawg',
  'og-kush-f': 'Chemdawg',
  'og': 'Chemdawg',

  // Girl Scout Cookies Family
  'gsc': 'Cookie Fam',
  'girl-scout-cookies': 'Cookie Fam',
  'gelato': 'Cookie Fam',
  'gelato-33': 'Cookie Fam',

  // Diesel Family
  'sour-diesel': 'Chemdawg',
  'ny-cheese': 'Big Buddha',
  'cheese': 'Big Buddha',
  'uk-cheese': 'Big Buddha',

  // Haze Family
  'amnesia': 'Super Sativa Seed Club',
  'amnesia-haze': 'Super Sativa Seed Club',
  'super-silver-haze': 'Green House Seeds',
  'silver-haze': 'Green House Seeds',

  // Purple Family
  'granddaddy-purple': 'Ken Estes',
  'gdp': 'Ken Estes',
  'purple-kush': 'Ken Estes',

  // Cookies & Cakes
  'wedding-cake': 'Cookie Fam',
  'biscotti': 'Cookie Fam',
  'cookie': 'Cookie Fam',

  // Gorilla Glue Family
  'gorilla-glue': 'GG Strains',
  'gg-4': 'GG Strains',
  'gg-3': 'GG Strains',

  // Durban
  'durban-poison': 'African Spirits',

  // Blue Family
  'blue-dream': 'DJ Short',
  'blueberry': 'DJ Short',

  // AK
  'ak-47': 'Serious Seeds',

  // White Family
  'white-widow': 'Green House Seeds',
  'white- rhino': 'Green House Seeds',

  // Northern Lights
  'northern-lights': 'Afghan Seeds',

  // Skunk
  'skunk-1': 'Sensi Seeds',
  'skunk': 'Sensi Seeds',

  // Hindu Kush
  'hindu-kush': 'Sensi Seeds',

  // Jack Herer
  'jack-herer': 'Sensi Seeds',

  // Critical
  'critical': 'Green House Seeds',
  'critical-kush': 'Green House Seeds',

  // Bubba
  'bubba-kush': 'Bubba\'s Farm',
  'pre-98-bubba-kush': 'Bubba\'s Farm',

  // Durban Poison
  'durban': 'African Spirits',

  // Cheese
  'cheese-quake': 'Big Buddha',

  // Medical strains common in Germany
  'pedanios': 'Pedanios',
  'bedrocan': 'Bedrocan',
  'aurora': 'Aurora',
  'tilray': 'Tilray',
  'peace-naturals': 'Peace Naturals',
  'cantourage': 'Cantourage',
  'grunhorn': 'Grünhorn',
  'remexian': 'Remexian',
  'vayamed': 'Vayamed',
  'demecan': 'Demecan',
  'avaay': 'Avaay',
  'cannamedical': 'Cannamedical',
  'adrexpharma': 'Adrexpharma',
  'canopy': 'Canopy',
  'spectrum': 'Spectrum',
  're-cannis': 'Re:Cannis',
  'enua': 'enua',

  // Common street strains
  'banana-kush': 'California Breeders',
  'mac-1': 'Capulator',
  'mac': 'Capulator',
  'mango-kush': 'Unknown',
  'cinderella-99': 'Brothers Grimm',
  'pineapple-express': 'G13 Labs',
  'trainwreck': 'Sage Seeds',
  'ak': 'Serious Seeds',
  'purple': 'Ken Estes',
  'papaya': 'Crowned Jewels',
  'papaya-sugar': 'Crowned Jewels',

  // More common
  'gorilla-glue-4': 'GG Strains',
  'gg4': 'GG Strains',

  // Medical Germany
  'nova': 'Enua',
  's在一起了': 'Unknown',
};

// Check if slug matches any known breeder pattern
function checkKnownBreeder(slug) {
  const lower = slug.toLowerCase();
  for (const [pattern, breeder] of Object.entries(KNOWN_BREEDERS)) {
    if (lower.includes(pattern) || pattern.includes(lower)) {
      return breeder;
    }
  }
  return null;
}

// Try to get breeder from page content
async function extractBreederFromHtml(html, source) {
  const patterns = [
    /Breeder[s]?[:\s]*([^<\n,]+)/i,
    /Bred by[:\s]*([^<\n,]+)/i,
    /Seed Company[:\s]*([^<\n,]+)/i,
    /Seed Bank[:\s]*([^<\n,]+)/i,
    /Produced by[:\s]*([^<\n,]+)/i,
    /Original breeder[:\s]*([^<\n,]+)/i,
    /Breeding[:\s]*([^<\n,]+)/i,
  ];

  for (const regex of patterns) {
    const match = html.match(regex);
    if (match && match[1]) {
      const breeder = match[1].trim().replace(/\[\d+\]/g, '').replace(/<[^>]+>/g, '').trim();
      if (breeder.length > 1 && breeder.length < 80) {
        return breeder;
      }
    }
  }
  return null;
}

// Try Leafly
async function tryLeafly(strainName) {
  const slug = strainName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const url = `https://leafly.com/strains/${slug}`;

  try {
    rateLimit();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });

    if (!response.ok) return null;

    const html = await response.text();
    const breeder = await extractBreederFromHtml(html, 'leafly');
    if (breeder) return { breeder, source: 'leafly' };
  } catch {}
  return null;
}

// Try Wikileaf
async function tryWikileaf(strainName) {
  const slug = strainName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const url = `https://www.wikileaf.com/strains/${slug}/`;

  try {
    rateLimit();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });

    if (!response.ok) return null;

    const html = await response.text();
    const breeder = await extractBreederFromHtml(html, 'wikileaf');
    if (breeder) return { breeder, source: 'wikileaf' };
  } catch {}
  return null;
}

// Main function to get farmer for a strain
async function getFarmerForStrain(strainName, slug) {
  // First check known breeders
  const knownBreeder = checkKnownBreeder(slug);
  if (knownBreeder && knownBreeder !== 'Unknown') {
    return { breeder: knownBreeder, source: 'known_mapping' };
  }

  // Try Leafly
  let result = await tryLeafly(strainName);
  if (result) return result;

  // Try Wikileaf
  result = await tryWikileaf(strainName);
  if (result) return result;

  return null;
}

async function main() {
  // Get all strains without farmer
  const { data: allStrains } = await supabase
    .from('strains')
    .select('id, slug, name, farmer, source');

  const strainsNeedingFarmer = allStrains?.filter(s => !s.farmer) || [];

  console.log(`Found ${strainsNeedingFarmer.length} strains without farmer`);
  console.log(`Lock file processed: ${readLockFile().processed.length}`);

  const stats = { known: 0, scraped: 0, notFound: 0, errors: 0, skipped: 0 };

  for (const strain of strainsNeedingFarmer) {
    if (isProcessed(strain.slug)) {
      stats.skipped++;
      continue;
    }

    console.log(`\nProcessing: ${strain.name} (${strain.slug})`);

    try {
      const result = await getFarmerForStrain(strain.name, strain.slug);

      if (result) {
        console.log(`  Found: "${result.breeder}" (${result.source})`);

        const { error } = await supabase
          .from('strains')
          .update({ farmer: result.breeder })
          .eq('id', strain.id);

        if (error) {
          console.log(`  DB error: ${error.message}`);
          stats.errors++;
        } else {
          if (result.source === 'known_mapping') {
            stats.known++;
          } else {
            stats.scraped++;
          }
        }
      } else {
        console.log(`  No breeder found`);
        // Set as "Unknown Producer" for tracking
        const { error } = await supabase
          .from('strains')
          .update({ farmer: 'Unknown Producer' })
          .eq('id', strain.id);

        if (error) {
          stats.errors++;
        } else {
          stats.notFound++;
        }
      }

      markProcessed(strain.slug);
    } catch (err) {
      console.log(`  Error: ${err.message}`);
      stats.errors++;
    }
  }

  console.log(`\n=== FINAL STATS ===`);
  console.log(`From known mapping: ${stats.known}`);
  console.log(`From scraping: ${stats.scraped}`);
  console.log(`Set to Unknown: ${stats.notFound}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Skipped (already processed): ${stats.skipped}`);
}

main().catch(console.error);
