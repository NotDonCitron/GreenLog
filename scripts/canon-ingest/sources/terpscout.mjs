export const name = 'terpscout';
export const reliability = 0.9;
export const fieldStrengths = ['effects', 'terpenes', 'flavors'];

const BASE_URL = 'https://www.terpscout.com/api';
const PAGE_SIZE = 50;

const KEYS = [
  process.env.TERPSCOUT_KEY_1,
  process.env.TERPSCOUT_KEY_2,
  process.env.TERPSCOUT_KEY_3,
  process.env.TERPSCOUT_KEY_4,
  process.env.TERPSCOUT_KEY_5,
].filter(Boolean);

let keyIndex = 0;
let requestsThisWindow = 0;
let windowStart = Date.now();
const WINDOW_LIMIT = 20;
const WINDOW_RESET_MS = 60000;

function getNextKey() {
  if (requestsThisWindow >= WINDOW_LIMIT) {
    const elapsed = Date.now() - windowStart;
    if (elapsed < WINDOW_RESET_MS) {
      return null;
    }
    requestsThisWindow = 0;
    windowStart = Date.now();
  }
  if (KEYS.length === 0) return null;
  const key = KEYS[keyIndex % KEYS.length];
  keyIndex++;
  requestsThisWindow++;
  return key;
}

export async function* fetchAll(limiter) {
  if (KEYS.length === 0) {
    console.warn(`  ⚠️  [${name}] No API keys set (TERPSCOUT_KEY_1...). Skipping.`);
    return;
  }

  let page = 1;
  let hasMore = true;

  const firstPayload = await fetchPage(page);
  if (!firstPayload) return;

  const firstStrains = Array.isArray(firstPayload?.strains) ? firstPayload.strains : [];
  const total = Number(firstPayload?.total ?? firstStrains.length ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (firstStrains.length > 0) {
    yield firstStrains.map(mapStrain);
  }
  page++;

  while (page <= totalPages && hasMore) {
    const payload = await fetchPage(page);
    if (!payload) { hasMore = false; break; }

    const strains = Array.isArray(payload?.strains) ? payload.strains : [];
    if (strains.length === 0) { hasMore = false; break; }

    yield strains.map(mapStrain);
    page++;

    await new Promise(r => setTimeout(r, 3000));
  }
}

async function fetchPage(page) {
  const key = getNextKey();
  if (!key) {
    const elapsed = Date.now() - windowStart;
    const wait = WINDOW_RESET_MS - elapsed;
    console.log(`  ⏳ [${name}] Rate limited. Waiting ${(wait / 1000).toFixed(1)}s...`);
    await new Promise(r => setTimeout(r, Math.max(wait, 1000)));
    const retryKey = getNextKey();
    if (!retryKey) return null;
  }

  try {
    const url = `${BASE_URL}/strains?page=${page}&take=${PAGE_SIZE}`;
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'GreenLog-Canon-Ingest/1.0',
    };
    if (KEYS.length > 0) {
      headers['x-api-key'] = KEYS[(keyIndex - 1) % KEYS.length];
    }

    const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });

    if (response.status === 429) {
      console.log(`  ⏳ [${name}] Rate limited (429). Backing off...`);
      await new Promise(r => setTimeout(r, 5000));
      return fetchPage(page);
    }

    if (!response.ok) {
      console.error(`  ❌ [${name}] HTTP ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`  ❌ [${name}] Error page ${page}: ${err.message}`);
    return null;
  }
}

function mapStrain(s) {
  return {
    name: s.name || s.strain_name,
    strain_type: s.type || s.strain_type || s.category,
    description: s.description || s.desc || s.about,
    thc: s.thc_percent ?? s.thc ?? null,
    cbd: s.cbd_percent ?? s.cbd ?? null,
    terpene_profile: s.terpenes || s.terpene_profile || [],
    flavor_profile: s.flavors || s.flavor_profile || s.aromas || [],
    effect_list: s.effects || s.effect_list || [],
    image: s.image_url || s.image || null,
  };
}
