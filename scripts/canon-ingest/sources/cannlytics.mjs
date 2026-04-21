export const name = 'cannlytics';
export const reliability = 0.7;
export const fieldStrengths = ['thc_min', 'thc_max', 'cbd_min', 'cbd_max', 'terpenes', 'effects', 'flavors', 'description'];

const BASE_URL = 'https://cannlytics.com/api/data/strains';
const PAGE_SIZE = 420;

const TERPENE_FIELDS = [
  'alpha_bisabolol', 'alpha_pinene', 'alpha_terpinene', 'beta_caryophyllene',
  'beta_myrcene', 'beta_pinene', 'camphene', 'carene', 'caryophyllene_oxide',
  'd_limonene', 'eucalyptol', 'gamma_terpinene', 'geraniol', 'guaiol',
  'humulene', 'isopulegol', 'linalool', 'nerolidol', 'ocimene', 'p_cymene',
  'terpinene', 'terpinolene',
];

export async function* fetchAll(limiter) {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${BASE_URL}?limit=${PAGE_SIZE}&order=strain_name&offset=${offset}`;
      console.log(`  📡 [${name}] Fetching offset=${offset}...`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GreenLog-Canon-Ingest/1.0',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`  ❌ [${name}] HTTP ${response.status}: ${response.statusText}`);
        break;
      }

      const body = await response.json();
      const strains = Array.isArray(body?.data) ? body.data : [];

      if (strains.length === 0) {
        hasMore = false;
        break;
      }

      yield strains.map(mapStrain);
      offset += strains.length;

      if (strains.length < PAGE_SIZE) hasMore = false;

      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        console.error(`  ❌ [${name}] Request timeout at offset=${offset}`);
      } else {
        console.error(`  ❌ [${name}] Error at offset=${offset}: ${err.message}`);
      }
      break;
    }
  }
}

function mapStrain(s) {
  const totalThc = s.total_thc || s.delta_9_thc || null;
  const totalCbd = s.total_cbd || s.cbd || null;
  const delta9 = s.delta_9_thc || null;

  let thcMin = null, thcMax = null;
  if (totalThc != null && totalThc > 0) {
    thcMin = Math.round((totalThc * 0.7) * 10) / 10;
    thcMax = Math.round(totalThc * 10) / 10;
  } else if (delta9 != null && delta9 > 0) {
    thcMin = Math.round((delta9 * 0.8) * 10) / 10;
    thcMax = Math.round(delta9 * 10) / 10;
  }

  let cbdMin = null, cbdMax = null;
  if (totalCbd != null && totalCbd > 0) {
    cbdMin = Math.round((totalCbd * 0.6) * 10) / 10;
    cbdMax = Math.round(totalCbd * 10) / 10;
  }

  const terpenes = TERPENE_FIELDS
    .filter(f => s[f] != null && s[f] > 0)
    .map(f => ({ name: f.replace(/_/g, ' '), concentration: Math.round(s[f] * 1000) / 1000 }));

  const effects = (s.potential_effects || [])
    .map(e => e.replace('effect_', '').replace(/_/g, ' '))
    .filter(Boolean);

  const flavors = (s.potential_aromas || [])
    .map(a => a.replace('aroma_', '').replace(/_/g, ' '))
    .filter(Boolean);

  return {
    name: s.strain_name || s.id,
    strain_type: null,
    description: s.description || null,
    thc: (thcMin != null && thcMax != null) ? { min: thcMin, max: thcMax } : null,
    cbd: (cbdMin != null && cbdMax != null) ? { min: cbdMin, max: cbdMax } : null,
    terpene_profile: terpenes,
    flavor_profile: flavors,
    effect_list: effects,
    image: (s.image_url && !s.image_url.includes('firebasestorage')) ? s.image_url : null,
  };
}
