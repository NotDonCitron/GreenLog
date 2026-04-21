/**
 * GreenLog Canon Ingest — Leefii Source Adapter
 * 
 * Fetches strain data from the Leefii API with offset/cursor pagination.
 * Configure via environment variables:
 *   - LEEFII_API_URL (default: https://api.leefii.com/v1)
 *   - LEEFII_API_KEY
 * 
 * The adapter implements a standard interface:
 *   { name: string, fetchAll(limiter): AsyncGenerator<RawStrain[]> }
 */

const DEFAULT_API_URL = 'https://leefii.com/api/v1';
const PAGE_SIZE = 50;

export const name = 'leefii';

/**
 * Fetch all strains from Leefii with offset-based pagination.
 * Yields batches (pages) of raw strain records.
 * 
 * @param {import('p-limit').LimitFunction} limiter
 * @yields {object[]} Batch of raw strain records
 */
export async function* fetchAll(limiter) {
    const baseUrl = process.env.LEEFII_API_URL || DEFAULT_API_URL;
    const apiKey = process.env.LEEFII_API_KEY;

    if (!apiKey) {
        console.warn(`  ⚠️  [${name}] No API key set (LEEFII_API_KEY). Skipping.`);
        return;
    }

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        try {
            const url = `${baseUrl}/strains?offset=${offset}&limit=${PAGE_SIZE}`;
            console.log(`  📡 [${name}] Fetching offset=${offset}...`);

            const response = await fetch(url, {
                headers: {
                    'X-API-Key': apiKey,
                    'Accept': 'application/json',
                    'User-Agent': 'GreenLog-Canon-Ingest/1.0',
                },
                signal: AbortSignal.timeout(30000),
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
                    console.log(`  ⏳ [${name}] Rate limited. Retrying in ${retryAfter}s...`);
                    await new Promise(r => setTimeout(r, retryAfter * 1000));
                    continue;
                }
                console.error(`  ❌ [${name}] HTTP ${response.status}: ${response.statusText}`);
                break;
            }

            const body = await response.json();

            // Flexible response parsing
            const strains = Array.isArray(body) ? body :
                Array.isArray(body.data) ? body.data :
                    Array.isArray(body.strains) ? body.strains :
                        Array.isArray(body.items) ? body.items : [];

            if (strains.length === 0) {
                hasMore = false;
                break;
            }

            // Map Leefii fields to our flexible raw shape
            const mapped = strains.map(s => ({
                name: s.name || s.strain_name || s.title,
                strain_type: s.type || s.strain_type || s.classification || s.category,
                description: s.description || s.overview || s.summary,
                thc: extractRange(s, 'thc'),
                cbd: extractRange(s, 'cbd'),
                terpene_profile: s.terpenes || s.terpene_list || s.dominant_terpenes || [],
                flavor_profile: s.flavors || s.aromas || s.taste || [],
                effect_list: s.effects || s.reported_effects || [],
                image: s.image_url || s.image || s.photo || s.thumbnail,
            }));

            yield mapped;
            offset += strains.length;

            // Check total count
            const total = body.total || body.total_count || body.count;
            if (total && offset >= total) {
                hasMore = false;
            }

            // Respect rate limits
            await new Promise(r => setTimeout(r, 300));

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

/**
 * Extract a min/max range from various API field patterns.
 */
function extractRange(obj, prefix) {
    // Check camelCase: thcMin, thcMax
    if (obj[`${prefix}Min`] != null && obj[`${prefix}Max`] != null) {
        return { min: Number(obj[`${prefix}Min`]), max: Number(obj[`${prefix}Max`]) };
    }
    // Check lowercase underscore
    if (obj[`${prefix}_min`] != null && obj[`${prefix}_max`] != null) {
        return { min: Number(obj[`${prefix}_min`]), max: Number(obj[`${prefix}_max`]) };
    }
    if (obj[prefix] && typeof obj[prefix] === 'object' && 'min' in obj[prefix]) {
        return { min: Number(obj[prefix].min), max: Number(obj[prefix].max) };
    }
    if (obj[`${prefix}_range`] && typeof obj[`${prefix}_range`] === 'string') {
        const match = obj[`${prefix}_range`].match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
        if (match) return { min: Number(match[1]), max: Number(match[2]) };
    }
    if (typeof obj[prefix] === 'number') {
        return { min: obj[prefix], max: obj[prefix] };
    }
    if (obj[`${prefix}_percent`] != null) {
        return { min: Number(obj[`${prefix}_percent`]), max: Number(obj[`${prefix}_percent`]) };
    }
    return { min: null, max: null };
}
