#!/usr/bin/env node
/**
 * Self-contained test runner for canon-ingest modules.
 * Run: node scripts/canon-ingest/test-runner.mjs
 */

import { validatePublishGate } from './publish-gate.mjs';
import { slugify, normalizeType, transformRawStrain } from './transform.mjs';

let pass = 0;
let fail = 0;

function assert(name, condition) {
    if (condition) {
        pass++;
        console.log(`  ✅ ${name}`);
    } else {
        fail++;
        console.log(`  ❌ ${name}`);
    }
}

function assertEq(name, actual, expected) {
    const eq = JSON.stringify(actual) === JSON.stringify(expected);
    if (!eq) {
        fail++;
        console.log(`  ❌ ${name}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
    } else {
        pass++;
        console.log(`  ✅ ${name}`);
    }
}

function makeStrain(overrides = {}) {
    return {
        name: 'OG Kush', slug: 'og-kush', type: 'hybrid',
        description: 'A legendary strain known for its unique terpene profile and potent effects.',
        thc_min: 19, thc_max: 26, cbd_min: 0.1, cbd_max: 0.3,
        terpenes: ['myrcene', 'limonene'], flavors: ['earthy'], effects: ['relaxed'],
        image_url: 'https://example.com/og-kush.jpg', source: 'test',
        ...overrides,
    };
}

// ── Publish Gate Tests ──────────────────────────────────────────────────
console.log('\n📋 Publish Gate Tests');
console.log('─'.repeat(40));

const r1 = validatePublishGate(makeStrain());
assert('Complete record passes', r1.passed === true && r1.reasons.length === 0);

const r2 = validatePublishGate(makeStrain({ name: '' }));
assert('Missing name rejected', r2.passed === false && r2.reasons.includes('Missing name'));

const r3 = validatePublishGate(makeStrain({ slug: '' }));
assert('Missing slug rejected', r3.passed === false && r3.reasons.includes('Missing slug'));

const r4 = validatePublishGate(makeStrain({ type: 'ruderalis' }));
assert('Invalid type rejected', r4.passed === false && r4.reasons.includes('Invalid type (must be indica, sativa, or hybrid)'));

const r5 = validatePublishGate(makeStrain({ description: 'Short' }));
assert('Short description rejected', r5.passed === false && r5.reasons.includes('Description too short (min 20 chars)'));

const r6 = validatePublishGate(makeStrain({ thc_min: null, thc_max: null }));
assert('Missing THC rejected', r6.passed === false && r6.reasons.includes('Incomplete THC data (need min and max)'));

const r7 = validatePublishGate(makeStrain({ cbd_min: null, cbd_max: null }));
assert('Missing CBD rejected', r7.passed === false && r7.reasons.includes('Incomplete CBD data (need min and max)'));

const r8 = validatePublishGate(makeStrain({ terpenes: ['myrcene'] }));
assert('1 terpene rejected', r8.passed === false && r8.reasons.includes('Minimum 2 terpenes required'));

const r9 = validatePublishGate(makeStrain({ terpenes: ['myrcene', 'myrcene'] }));
assert('Dupe terpenes rejected', r9.passed === false && r9.reasons.includes('Minimum 2 terpenes required'));

const r10 = validatePublishGate(makeStrain({ flavors: [] }));
assert('Empty flavors rejected', r10.passed === false && r10.reasons.includes('Minimum 1 flavor required'));

const r11 = validatePublishGate(makeStrain({ effects: [] }));
assert('Empty effects rejected', r11.passed === false && r11.reasons.includes('Minimum 1 effect required'));

const r12 = validatePublishGate(makeStrain({ image_url: '' }));
assert('Missing image rejected', r12.passed === false && r12.reasons.includes('Missing image_url'));

const r13 = validatePublishGate(makeStrain({ image_url: 'data:image/png;base64,...' }));
assert('Non-http image rejected', r13.passed === false && r13.reasons.includes('Missing image_url'));

const r14 = validatePublishGate(makeStrain({ source: '' }));
assert('Missing source rejected', r14.passed === false && r14.reasons.includes('Missing source identifier'));

const rAll = validatePublishGate({ name: '', slug: '', type: '', description: '', thc_min: null, thc_max: null, cbd_min: null, cbd_max: null, terpenes: [], flavors: [], effects: [], image_url: '', source: '' });
assert(`All-fail collects ${rAll.reasons.length} reasons (≥ 10)`, rAll.reasons.length >= 10);


// ── Transform Tests ────────────────────────────────────────────────────
console.log('\n📋 Transform Tests');
console.log('─'.repeat(40));

assertEq('slugify OG Kush', slugify('OG Kush'), 'og-kush');
assertEq('slugify GSC', slugify('Girl Scout Cookies (GSC)'), 'girl-scout-cookies-gsc');
assertEq('slugify collapse dashes', slugify('Blue - Dream'), 'blue-dream');
assertEq('slugify trim dashes', slugify(' --Purple Haze-- '), 'purple-haze');
assertEq('slugify hash', slugify('Strain #1'), 'strain-1');

assertEq('normalizeType Indica', normalizeType('Indica'), 'indica');
assertEq('normalizeType SATIVA', normalizeType('SATIVA'), 'sativa');
assertEq('normalizeType Hybrid', normalizeType('Hybrid'), 'hybrid');
assertEq('normalizeType unknown', normalizeType('ruderalis'), 'hybrid');
assertEq('normalizeType empty', normalizeType(''), 'hybrid');
assertEq('normalizeType null', normalizeType(null), 'hybrid');
assertEq('normalizeType indica dominant', normalizeType('Indica Dominant Hybrid'), 'indica');
assertEq('normalizeType sativa dominant', normalizeType('Sativa Dominant'), 'sativa');

const rawFull = {
    name: 'Blue Dream', strain_type: 'Sativa Dominant Hybrid',
    thc: { min: 17, max: 24 }, cbd: { min: 0.1, max: 0.2 },
    description: 'A legendary West Coast strain combining the best of both worlds.',
    terpene_profile: ['Myrcene', 'Caryophyllene', 'Pinene'],
    flavor_profile: ['Berry', 'Sweet', 'Blueberry'],
    effect_list: ['Relaxed', 'Creative', 'Happy'],
    image: 'https://cdn.example.com/blue-dream.jpg',
};
const t1 = transformRawStrain(rawFull, 'strain-compass');
assertEq('transform name', t1.name, 'Blue Dream');
assertEq('transform slug', t1.slug, 'blue-dream');
assertEq('transform type', t1.type, 'sativa');
assertEq('transform thc_min', t1.thc_min, 17);
assertEq('transform thc_max', t1.thc_max, 24);
assertEq('transform terpenes', t1.terpenes, ['myrcene', 'caryophyllene', 'pinene']);
assertEq('transform flavors', t1.flavors, ['berry', 'sweet', 'blueberry']);
assertEq('transform effects', t1.effects, ['relaxed', 'creative', 'happy']);
assertEq('transform source', t1.source, 'strain-compass');

const t2 = transformRawStrain({ name: 'Test', terpene_profile: ['Myrcene', 'myrcene', 'MYRCENE', 'Limonene'] }, 'test');
assertEq('transform dedup terpenes', t2.terpenes, ['myrcene', 'limonene']);

const t3 = transformRawStrain({ name: 'Bare Minimum' }, 'test');
assertEq('transform bare name', t3.name, 'Bare Minimum');
assertEq('transform bare type', t3.type, 'hybrid');
assert('transform bare thc null', t3.thc_min === null);
assertEq('transform bare terpenes', t3.terpenes, []);

const t4 = transformRawStrain({ name: 'Long', description: 'A'.repeat(3000) }, 'test');
assert('transform truncate desc', t4.description.length === 2000);

const t5 = transformRawStrain({ name: 'Flat', thc_percent: 22, cbd_percent: 0.5 }, 'test');
assertEq('transform flat thc_min', t5.thc_min, 22);
assertEq('transform flat thc_max', t5.thc_max, 22);
assertEq('transform flat cbd_min', t5.cbd_min, 0.5);
assertEq('transform flat cbd_max', t5.cbd_max, 0.5);


// ── Summary ────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(40));
console.log(`  Results: ${pass} passed, ${fail} failed`);
console.log('═'.repeat(40));
process.exit(fail > 0 ? 1 : 0);
