import { describe, it, expect, beforeAll } from 'vitest';

type PublishGateResult = { passed: boolean; reasons: string[] };
type PublishGateInput = {
    name: string;
    slug: string;
    type: string;
    description: string;
    thc_min: number | null;
    thc_max: number | null;
    cbd_min: number | null;
    cbd_max: number | null;
    terpenes: string[];
    flavors: string[];
    effects: string[];
    image_url: string;
    source: string;
};

let validatePublishGate: (input: PublishGateInput) => PublishGateResult;

beforeAll(async () => {
    const mod = await import('../../scripts/canon-ingest/publish-gate.mjs');
    validatePublishGate = mod.validatePublishGate;
});

function makeCompleteStrain(overrides: Partial<PublishGateInput> = {}): PublishGateInput {
    return {
        name: 'OG Kush',
        slug: 'og-kush',
        type: 'hybrid',
        description: 'A legendary strain known for its unique terpene profile and potent effects.',
        thc_min: 19,
        thc_max: 26,
        cbd_min: 0.1,
        cbd_max: 0.3,
        terpenes: ['myrcene', 'limonene'],
        flavors: ['earthy', 'pine'],
        effects: ['relaxed', 'happy'],
        image_url: 'https://example.com/og-kush.jpg',
        source: 'strain-compass',
        ...overrides,
    };
}

describe('Publish Gate Validator', () => {
    it('passes a complete record', () => {
        const result = validatePublishGate(makeCompleteStrain());
        expect(result.passed).toBe(true);
        expect(result.reasons).toHaveLength(0);
    });

    it('rejects missing name', () => {
        const result = validatePublishGate(makeCompleteStrain({ name: '' }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Missing name');
    });

    it('rejects missing slug', () => {
        const result = validatePublishGate(makeCompleteStrain({ slug: '' }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Missing slug');
    });

    it('rejects invalid type', () => {
        const result = validatePublishGate(makeCompleteStrain({ type: 'ruderalis' }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Invalid type');
    });

    it('rejects short description', () => {
        const result = validatePublishGate(makeCompleteStrain({ description: 'Too short' }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Description too short');
    });

    it('rejects missing THC data', () => {
        const result = validatePublishGate(makeCompleteStrain({ thc_min: null, thc_max: null }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Incomplete THC data');
    });

    it('rejects missing CBD data', () => {
        const result = validatePublishGate(makeCompleteStrain({ cbd_min: null, cbd_max: null }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Incomplete CBD data');
    });

    it('rejects fewer than 2 terpenes', () => {
        const result = validatePublishGate(makeCompleteStrain({ terpenes: ['myrcene'] }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Minimum 2 terpenes required');
    });

    it('rejects empty flavors', () => {
        const result = validatePublishGate(makeCompleteStrain({ flavors: [] }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Minimum 1 flavor required');
    });

    it('rejects empty effects', () => {
        const result = validatePublishGate(makeCompleteStrain({ effects: [] }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Minimum 1 effect required');
    });

    it('rejects missing image_url', () => {
        const result = validatePublishGate(makeCompleteStrain({ image_url: '' }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Missing image_url');
    });

    it('rejects non-http image_url', () => {
        const result = validatePublishGate(makeCompleteStrain({ image_url: 'data:image/png;base64,...' }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Missing image_url');
    });

    it('rejects missing source', () => {
        const result = validatePublishGate(makeCompleteStrain({ source: '' }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Missing source identifier');
    });

    it('collects all failure reasons in one pass', () => {
        const result = validatePublishGate({
            name: '',
            slug: '',
            type: '',
            description: '',
            thc_min: null,
            thc_max: null,
            cbd_min: null,
            cbd_max: null,
            terpenes: [],
            flavors: [],
            effects: [],
            image_url: '',
            source: '',
        });
        expect(result.passed).toBe(false);
        expect(result.reasons.length).toBeGreaterThanOrEqual(10);
    });

    it('counts unique terpenes only', () => {
        const result = validatePublishGate(makeCompleteStrain({ terpenes: ['myrcene', 'myrcene'] }));
        expect(result.passed).toBe(false);
        expect(result.reasons).toContain('Minimum 2 terpenes required');
    });
});
