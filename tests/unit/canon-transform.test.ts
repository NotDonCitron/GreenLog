import { describe, it, expect, beforeAll } from 'vitest';

let slugify, normalizeType, transformRawStrain;

beforeAll(async () => {
    const mod = await import('../../scripts/canon-ingest/transform.mjs');
    slugify = mod.slugify;
    normalizeType = mod.normalizeType;
    transformRawStrain = mod.transformRawStrain;
});

describe('slugify', () => {
    it('converts name to URL-safe slug', () => {
        expect(slugify('OG Kush')).toBe('og-kush');
    });

    it('removes special characters', () => {
        expect(slugify('Girl Scout Cookies (GSC)')).toBe('girl-scout-cookies-gsc');
    });

    it('collapses multiple dashes', () => {
        expect(slugify('Blue - Dream')).toBe('blue-dream');
    });

    it('trims leading/trailing dashes', () => {
        expect(slugify(' --Purple Haze-- ')).toBe('purple-haze');
    });

    it('handles hash symbols', () => {
        expect(slugify('Strain #1')).toBe('strain-1');
    });
});

describe('normalizeType', () => {
    it('lowercases Indica', () => {
        expect(normalizeType('Indica')).toBe('indica');
    });

    it('normalizes Sativa', () => {
        expect(normalizeType('SATIVA')).toBe('sativa');
    });

    it('normalizes Hybrid', () => {
        expect(normalizeType('Hybrid')).toBe('hybrid');
    });

    it('returns null for unknown or empty types', () => {
        expect(normalizeType('ruderalis')).toBeNull();
        expect(normalizeType('')).toBeNull();
        expect(normalizeType(null)).toBeNull();
    });

    it('handles indica-dominant variants', () => {
        expect(normalizeType('Indica Dominant Hybrid')).toBe('indica');
    });

    it('handles sativa-dominant variants', () => {
        expect(normalizeType('Sativa Dominant')).toBe('sativa');
    });
});

describe('transformRawStrain', () => {
    it('transforms a raw API record to canonical shape', () => {
        const raw = {
            name: 'Blue Dream',
            strain_type: 'Sativa Dominant Hybrid',
            thc: { min: 17, max: 24 },
            cbd: { min: 0.1, max: 0.2 },
            description: 'A legendary West Coast strain combining the best of both worlds.',
            terpene_profile: ['Myrcene', 'Caryophyllene', 'Pinene'],
            flavor_profile: ['Berry', 'Sweet', 'Blueberry'],
            effect_list: ['Relaxed', 'Creative', 'Happy'],
            image: 'https://cdn.example.com/blue-dream.jpg',
        };

        const result = transformRawStrain(raw, 'strain-compass');

        expect(result.name).toBe('Blue Dream');
        expect(result.slug).toBe('blue-dream');
        expect(result.type.value).toBe('sativa');
        expect(result.thc_min.value).toBe(17);
        expect(result.thc_max.value).toBe(24);
        expect(result.cbd_min.value).toBe(0.1);
        expect(result.cbd_max.value).toBe(0.2);
        expect(result.terpenes.value).toEqual(['myrcene', 'caryophyllene', 'pinene']);
        expect(result.flavors.value).toEqual(['berry', 'sweet', 'blueberry']);
        expect(result.effects.value).toEqual(['relaxed', 'creative', 'happy']);
        expect(result.image_url.value).toBe('https://cdn.example.com/blue-dream.jpg');
        expect(typeof result.type.confidence).toBe('number');
        expect(result.source).toBe('strain-compass');
    });

    it('deduplicates terpenes', () => {
        const raw = {
            name: 'Test',
            terpene_profile: ['Myrcene', 'myrcene', 'MYRCENE', 'Limonene'],
        };
        const result = transformRawStrain(raw, 'test');
        expect(result.terpenes.value).toEqual(['myrcene', 'limonene']);
    });

    it('handles missing fields gracefully', () => {
        const raw = { name: 'Bare Minimum' };
        const result = transformRawStrain(raw, 'test');
        expect(result.name).toBe('Bare Minimum');
        expect(result.slug).toBe('bare-minimum');
        expect(result.type.value).toBeNull();
        expect(result.thc_min.value).toBeNull();
        expect(result.terpenes.value).toEqual([]);
        expect(result.flavors.value).toEqual([]);
        expect(result.effects.value).toEqual([]);
    });

    it('truncates description to 2000 chars', () => {
        const longDesc = 'A'.repeat(3000);
        const raw = { name: 'Long', description: longDesc };
        const result = transformRawStrain(raw, 'test');
        expect(result.description.value.length).toBe(2000);
    });

    it('extracts THC/CBD from flat values', () => {
        const raw = {
            name: 'Flat',
            thc_percent: 22,
            cbd_percent: 0.5,
        };
        const result = transformRawStrain(raw, 'test');
        expect(result.thc_min.value).toBe(22);
        expect(result.thc_max.value).toBe(22);
        expect(result.cbd_min.value).toBe(0.5);
        expect(result.cbd_max.value).toBe(0.5);
    });
});
