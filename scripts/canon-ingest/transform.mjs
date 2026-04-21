/**
 * GreenLog Canon Ingest — Data Transformer
 * 
 * Normalizes raw API responses from any source into the canonical strain shape
 * expected by the Publish Gate and the Supabase strains table.
 */

/**
 * Generate a URL-safe slug from a strain name.
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .trim()
        .replace(/#/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Normalize strain type to one of: indica, sativa, hybrid.
 * Handles common variants like "Indica Dominant Hybrid".
 * @param {string|null} type
 * @returns {'indica'|'sativa'|'hybrid'}
 */
export function normalizeType(type) {
    if (!type || typeof type !== 'string') return 'hybrid';

    const lower = type.toLowerCase().trim();

    if (lower === 'indica' || lower.startsWith('indica')) return 'indica';
    if (lower === 'sativa' || lower.startsWith('sativa')) return 'sativa';
    if (lower === 'hybrid') return 'hybrid';

    return 'hybrid';
}

/**
 * Deduplicate and lowercase an array of strings.
 * @param {string[]|null|undefined} arr
 * @returns {string[]}
 */
function dedupeArray(arr) {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    const result = [];
    for (const item of arr) {
        const lower = String(item).toLowerCase().trim();
        if (lower && !seen.has(lower)) {
            seen.add(lower);
            result.push(lower);
        }
    }
    return result;
}

/**
 * Extract a numeric value, returning null if not a valid number.
 * @param {*} val
 * @returns {number|null}
 */
function toNumber(val) {
    if (val == null) return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
}

/**
 * Transform a raw API strain record into canonical GreenLog shape.
 * 
 * Supports flexible field naming from different API sources:
 *   - thc: { min, max } OR thc_percent (flat)
 *   - cbd: { min, max } OR cbd_percent (flat)
 *   - terpene_profile OR terpenes
 *   - flavor_profile OR flavors
 *   - effect_list OR effects
 *   - strain_type OR type
 *   - image OR image_url
 * 
 * @param {object} raw - Raw API record
 * @param {string} sourceName - Source adapter identifier
 * @returns {object} Canonical strain object
 */
export function transformRawStrain(raw, sourceName) {
    const name = (raw.name || '').trim();

    // THC — handle object { min, max } or flat value
    let thc_min = null, thc_max = null;
    if (raw.thc && typeof raw.thc === 'object') {
        thc_min = toNumber(raw.thc.min);
        thc_max = toNumber(raw.thc.max);
    } else if (raw.thc_min != null || raw.thc_max != null) {
        thc_min = toNumber(raw.thc_min);
        thc_max = toNumber(raw.thc_max);
    } else if (raw.thc_percent != null) {
        thc_min = toNumber(raw.thc_percent);
        thc_max = toNumber(raw.thc_percent);
    }

    // CBD — handle object { min, max } or flat value
    let cbd_min = null, cbd_max = null;
    if (raw.cbd && typeof raw.cbd === 'object') {
        cbd_min = toNumber(raw.cbd.min);
        cbd_max = toNumber(raw.cbd.max);
    } else if (raw.cbd_min != null || raw.cbd_max != null) {
        cbd_min = toNumber(raw.cbd_min);
        cbd_max = toNumber(raw.cbd_max);
    } else if (raw.cbd_percent != null) {
        cbd_min = toNumber(raw.cbd_percent);
        cbd_max = toNumber(raw.cbd_percent);
    }

    // Description — truncate to 2000 chars
    let description = (raw.description || '').trim();
    if (description.length > 2000) {
        description = description.slice(0, 2000);
    }

    return {
        name,
        slug: slugify(name),
        type: normalizeType(raw.strain_type || raw.type),
        description,
        thc_min,
        thc_max,
        cbd_min,
        cbd_max,
        terpenes: dedupeArray(raw.terpene_profile || raw.terpenes),
        flavors: dedupeArray(raw.flavor_profile || raw.flavors),
        effects: dedupeArray(raw.effect_list || raw.effects),
        image_url: (raw.image || raw.image_url || '').trim(),
        source: sourceName,
    };
}
