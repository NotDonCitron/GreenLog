/**
 * GreenLog Canon Ingest — Publish Gate Validator
 * 
 * Strictly validates strain records per the Curated Strain Canon Design spec §4.
 * Only records passing 100% of checks proceed to the database.
 * 
 * @param {object} strain - Canonical strain object
 * @returns {{ passed: boolean, reasons: string[] }}
 */

const VALID_TYPES = ['indica', 'sativa', 'hybrid'];
const MIN_DESCRIPTION_LENGTH = 20;
const MIN_TERPENES = 2;
const MIN_FLAVORS = 1;
const MIN_EFFECTS = 1;

export function validatePublishGate(strain) {
    const reasons = [];

    // 1. Identity
    if (!strain.name || typeof strain.name !== 'string' || !strain.name.trim()) {
        reasons.push('Missing name');
    }

    if (!strain.slug || typeof strain.slug !== 'string' || !strain.slug.trim()) {
        reasons.push('Missing slug');
    }

    // 2. Classification
    if (!strain.type || !VALID_TYPES.includes(strain.type)) {
        reasons.push('Invalid type (must be indica, sativa, or hybrid)');
    }

    // 3. Content
    if (!strain.description || typeof strain.description !== 'string' || strain.description.trim().length < MIN_DESCRIPTION_LENGTH) {
        reasons.push('Description too short (min 20 chars)');
    }

    // 4. Potency — THC (need both min AND max)
    if (strain.thc_min == null || strain.thc_max == null || isNaN(Number(strain.thc_min)) || isNaN(Number(strain.thc_max))) {
        reasons.push('Incomplete THC data (need min and max)');
    }

    // 5. Potency — CBD (need both min AND max)
    if (strain.cbd_min == null || strain.cbd_max == null || isNaN(Number(strain.cbd_min)) || isNaN(Number(strain.cbd_max))) {
        reasons.push('Incomplete CBD data (need min and max)');
    }

    // 6. Chemical Profile — Terpenes (unique count)
    const uniqueTerpenes = new Set(Array.isArray(strain.terpenes) ? strain.terpenes.map(t => String(t).toLowerCase()) : []);
    if (uniqueTerpenes.size < MIN_TERPENES) {
        reasons.push('Minimum 2 terpenes required');
    }

    // 7. Chemical Profile — Flavors
    if (!Array.isArray(strain.flavors) || strain.flavors.length < MIN_FLAVORS) {
        reasons.push('Minimum 1 flavor required');
    }

    // 8. Chemical Profile — Effects
    if (!Array.isArray(strain.effects) || strain.effects.length < MIN_EFFECTS) {
        reasons.push('Minimum 1 effect required');
    }

    // 9. Media — image_url must be a valid HTTP URL
    if (!strain.image_url || typeof strain.image_url !== 'string' || !strain.image_url.startsWith('http')) {
        reasons.push('Missing image_url');
    }

    // 10. Provenance
    if (!strain.source || typeof strain.source !== 'string' || !strain.source.trim()) {
        reasons.push('Missing source identifier');
    }

    return {
        passed: reasons.length === 0,
        reasons,
    };
}
