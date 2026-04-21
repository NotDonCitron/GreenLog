/**
 * GreenLog Canon Ingest — StrainCompass Source Adapter
 * 
 * Fetches strain data from the StrainCompass API with pagination.
 * Configure via environment variables:
 *   - STRAIN_COMPASS_API_URL (default: https://api.straincompass.com/v1)
 *   - STRAIN_COMPASS_API_KEY
 * 
 * The adapter implements a standard interface:
 *   { name: string, fetchAll(limit): AsyncGenerator<RawStrain[]> }
 */

const DEFAULT_API_URL = 'https://straincompass.com/api';
const PAGE_SIZE = 100;

export const name = 'strain-compass';

/**
 * Fetch all strains from StrainCompass with pagination.
 * Yields batches (pages) of raw strain records.
 * 
 * @param {import('p-limit').LimitFunction} limiter - Concurrency limiter (unused for sequential pagination)
 * @yields {object[]} Batch of raw strain records
 */
export async function* fetchAll(limiter) {
    const baseUrl = process.env.STRAIN_COMPASS_API_URL || DEFAULT_API_URL;
    const apiKey = process.env.STRAIN_COMPASS_API_KEY;

    if (!apiKey) {
        console.warn(`  ⚠️  [${name}] No API key set (STRAIN_COMPASS_API_KEY). Skipping.`);
        return;
    }

    let page = 1;
    let hasMore = true;

    while (hasMore) {
        try {
            const url = `${baseUrl}/strains?page=${page}&limit=${PAGE_SIZE}`;
            console.log(`  📡 [${name}] Fetching page ${page}...`);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                    'User-Agent': 'GreenLog-Canon-Ingest/1.0',
                },
                signal: AbortSignal.timeout(30000),
            });

            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limited — wait and retry
                    const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
                    console.log(`  ⏳ [${name}] Rate limited. Retrying in ${retryAfter}s...`);
                    await new Promise(r => setTimeout(r, retryAfter * 1000));
                    continue;
                }
                console.error(`  ❌ [${name}] HTTP ${response.status}: ${response.statusText}`);
                break;
            }

            const body = await response.json();

            // Flexible response shape handling
            const strains = Array.isArray(body) ? body :
                Array.isArray(body.data) ? body.data :
                    Array.isArray(body.strains) ? body.strains :
                        Array.isArray(body.results) ? body.results : [];

            if (strains.length === 0) {
                hasMore = false;
                break;
            }

            // Map StrainCompass fields to our flexible raw shape
            const mapped = strains.map(s => ({
                name: s.name || s.strain_name,
                strain_type: s.type || s.strain_type || s.category,
                description: s.description || s.desc || s.about,
                thc: extractRange(s, 'thc'),
                cbd: extractRange(s, 'cbd'),
                terpene_profile: s.terpenes || s.terpene_profile || s.terps || [],
                flavor_profile: s.flavors || s.flavor_profile || s.aromas || [],
                effect_list: s.effects || s.effect_list || [],
                image: s.image_url || s.image || s.img || s.photo_url,
            }));

            yield mapped;
            page++;

            // Check if we've reached the last page
            const totalPages = body.total_pages || body.totalPages || body.pages;
            if (totalPages && page > totalPages) {
                hasMore = false;
            }

            // Respect rate limits
            await new Promise(r => setTimeout(r, 250));

        } catch (err) {
            if (err.name === 'TimeoutError' || err.name === 'AbortError') {
                console.error(`  ❌ [${name}] Request timeout on page ${page}`);
            } else {
                console.error(`  ❌ [${name}] Error on page ${page}: ${err.message}`);
            }
            break;
        }
    }
}

/**
 * Extract a min/max range from various API field patterns.
 */
function extractRange(obj, prefix) {
    // { thc_min, thc_max }
    if (obj[`${prefix}_min`] != null && obj[`${prefix}_max`] != null) {
        return { min: Number(obj[`${prefix}_min`]), max: Number(obj[`${prefix}_max`]) };
    }
    // { thc: { min, max } }
    if (obj[prefix] && typeof obj[prefix] === 'object' && 'min' in obj[prefix]) {
        return { min: Number(obj[prefix].min), max: Number(obj[prefix].max) };
    }
    // { thc_range: "18-24" }
    if (obj[`${prefix}_range`] && typeof obj[`${prefix}_range`] === 'string') {
        const match = obj[`${prefix}_range`].match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
        if (match) return { min: Number(match[1]), max: Number(match[2]) };
    }
    // { thc: 22 } (flat)
    if (typeof obj[prefix] === 'number') {
        return { min: obj[prefix], max: obj[prefix] };
    }
    // { thc_percent: 22 }
    if (obj[`${prefix}_percent`] != null) {
        return { min: Number(obj[`${prefix}_percent`]), max: Number(obj[`${prefix}_percent`]) };
    }
    return { min: null, max: null };
}
