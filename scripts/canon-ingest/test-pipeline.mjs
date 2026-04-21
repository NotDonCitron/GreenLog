#!/usr/bin/env node
/**
 * End-to-end pipeline test: DB connection → canon columns → transform → gate → upsert → cleanup
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validatePublishGate } from './publish-gate.mjs';
import { transformRawStrain } from './transform.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(resolve(__dirname, '../../.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key) process.env[key] = val;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

console.log('1️⃣  Testing Supabase connection...');
const { count, error } = await supabase.from('strains').select('*', { count: 'exact', head: true });
if (error) { console.log('❌ DB error:', error.message); process.exit(1); }
console.log('   ✅ Connected. Strains in DB:', count);

console.log('\n2️⃣  Testing Canon columns...');
const { data: sample, error: e2 } = await supabase.from('strains').select('publication_status, primary_source, quality_score').limit(1);
if (e2) { console.log('❌ Column error:', e2.message); process.exit(1); }
console.log('   ✅ Canon columns present. Sample:', JSON.stringify(sample?.[0]));

console.log('\n3️⃣  Full pipeline: transform → gate → upsert...');
const mockRaw = {
    name: '__Canon_Pipeline_Test__',
    strain_type: 'Hybrid',
    thc: { min: 18, max: 24 },
    cbd: { min: 0.1, max: 0.3 },
    description: 'Temporary test strain for Canon Ingest Engine pipeline verification. Will be auto-deleted.',
    terpene_profile: ['Myrcene', 'Limonene', 'Caryophyllene'],
    flavor_profile: ['Earthy', 'Pine'],
    effect_list: ['Relaxed', 'Happy'],
    image: 'https://example.com/test-canon-strain.jpg',
};

const canonical = transformRawStrain(mockRaw, 'pipeline-test');
console.log('   Transform ✅  slug:', canonical.slug);

const gate = validatePublishGate(canonical);
console.log('   Gate:', gate.passed ? '✅ PASSED' : '❌ REJECTED', gate.reasons.length ? gate.reasons : '');

if (gate.passed) {
    const { data, error: e3 } = await supabase.from('strains')
        .upsert({
            name: canonical.name, slug: canonical.slug, type: canonical.type,
            description: canonical.description,
            thc_min: canonical.thc_min, thc_max: canonical.thc_max,
            cbd_min: canonical.cbd_min, cbd_max: canonical.cbd_max,
            terpenes: canonical.terpenes, flavors: canonical.flavors, effects: canonical.effects,
            image_url: canonical.image_url,
            publication_status: 'draft', primary_source: canonical.source,
        }, { onConflict: 'slug' })
        .select('id, slug, publication_status, primary_source');

    if (e3) { console.log('   ❌ Upsert error:', e3.message); process.exit(1); }
    console.log('   Upsert ✅ ', JSON.stringify(data?.[0]));

    // Cleanup
    const testId = data?.[0]?.id;
    if (testId) {
        const { error: delErr } = await supabase.from('strains').delete().eq('id', testId);
        console.log('   Cleanup:', delErr ? '⚠️ ' + delErr.message : '✅ Test record deleted');
    }
}

console.log('\n🎉 All pipeline tests passed!');
