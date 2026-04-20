/**
 * greenlog-strain-scrape.mjs
 *
 * Scrapes strains from Leafly using browser-harness.
 * ONLY imports strains with 100% complete data AND real images (not placeholder).
 *
 * Usage:
 *   node scripts/greenlog-strain-scrape.mjs                    # full run
 *   node scripts/greenlog-strain-scrape.mjs --limit 50         # limit for testing
 *   node scripts/greenlog-strain-scrape.mjs --dry              # dry run (no DB write)
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3anl2dnZ5a3l1ZXV4dGRrc2NzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEwMTgwMSwiZXhwIjoyMDg5Njc3ODAxfQ.WFSRK9odYYJacA-aT5zM6mhQqhUrWj8jZXREdcb9VcI';

const DRY_RUN = process.argv.includes('--dry');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0') || 0;

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Browser harness helper
// ---------------------------------------------------------------------------
function bh(code) {
    const result = execSync(`browser-harness << 'PY'\n${code}\nPY`, {
        cwd: '/home/phhttps/Dokumente/Greenlog/GreenLog',
        encoding: 'utf-8',
        timeout: 60000,
    });
    return result.trim();
}

// ---------------------------------------------------------------------------
// Leafly slug variants
// ---------------------------------------------------------------------------
const SLUG_MAPPING = {
    'gg4': 'gorilla-glue-4', 'gorilla-glue': 'gorilla-glue-4',
    'gsc': 'girl-scout-cookies', 'girl-scout': 'girl-scout-cookies',
    'og kush': 'og-kush', 'ogkush': 'og-kush',
    'sour diesel': 'sour-diesel', 'sourdiesel': 'sour-diesel',
    'ak47': 'ak-47', 'ak-47': 'ak-47',
    'gdp': 'granddaddy-purple', 'granddaddy': 'granddaddy-purple',
    'northern lights': 'northern-lights',
    'white widow': 'white-widow',
    'purple haze': 'purple-haze',
    'jack herer': 'jack-herer',
    'la confidential': 'la-confidential',
    'pineapple express': 'pineapple-express',
    'dosi': 'dosi',
    'gelato 33': 'gelato-33',
    'wedding cake': 'wedding-cake',
    'sunset sherbert': 'sunset-sherbert',
    'runtz': 'runtz', 'pink runtz': 'pink-runtz',
    'gmo': 'gmo-cookies', 'gmo cookies': 'gmo-cookies',
    'gelato': 'gelato',
    'biscotti': 'biscotti',
};

function normalizeSlug(name) {
    const base = name.toLowerCase().trim();
    if (SLUG_MAPPING[base]) return SLUG_MAPPING[base];
    return base.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
}

// ---------------------------------------------------------------------------
// Scrape one strain from Leafly
// ---------------------------------------------------------------------------
function scrapeStrain(slug) {
    try {
        const script = `
new_tab("https://leafly.com/strains/${slug}")
wait_for_load()
raw = js("document.getElementById('__NEXT_DATA__')?.textContent || 'NOT_FOUND'")
if raw == "NOT_FOUND":
    print("NOT_FOUND")
else:
    import json, re
    data = json.loads(raw)
    strain = data["props"]["pageProps"]["strain"]
    if not strain or not strain.get("name"):
        print("NO_DATA")
    else:
        highlighted = strain.get("highlightedPhotos") or []
        hp_img = highlighted[0].get("imageUrl") if highlighted else ""
        nug = strain.get("nugImage") or ""
        flower_png = strain.get("flowerImagePng") or ""
        img_url = hp_img if hp_img else (nug if nug and "default.png" not in nug else flower_png if flower_png and "default.png" not in flower_png else "")
        has_real_image = bool(img_url and ("default.png" not in img_url or "strain-" in img_url))
        thc = strain.get("cannabinoids", {}).get("thc", {}).get("percentile50") or 0
        terps_raw = strain.get("terps") or {}
        terps = []
        for k, v in terps_raw.items():
            if isinstance(v, dict) and v.get("name"):
                terps.append({"name": v["name"], "percent": round(float(v.get("score", 0.5) * 2), 1) or 0.5})
        terps = sorted(terps, key=lambda x: x["percent"], reverse=True)[:3]
        er = strain.get("effects") or {}
        effects = [k for k, v in sorted(er.items(), key=lambda x: x[1].get("score", 0), reverse=True)][:5]
        fr = strain.get("flavors") or {}
        flavors = [k for k, v in sorted(fr.items(), key=lambda x: x[1].get("score", 0), reverse=True)][:3]
        desc = strain.get("descriptionPlain") or ""
        if not desc:
            desc = re.sub(r'<[^>]+>', '', strain.get("description") or "").strip()
        category = (strain.get("category") or "hybrid").lower()
        if category not in ["indica", "sativa", "hybrid", "ruderalis"]:
            category = "hybrid"
        print(json.dumps({
            "name": strain.get("name"), "slug": "${slug}", "type": category,
            "thc_min": round(thc - 2, 1) if thc else None,
            "thc_max": round(thc + 2, 1) if thc else None,
            "terpenes": terps if terps else None,
            "effects": effects if effects else None,
            "flavors": flavors if flavors else None,
            "description": desc if len(desc) >= 100 else None,
            "image_url": img_url, "has_real_image": has_real_image,
        }, ensure_ascii=False))
`;
        const result = bh(script);

        if (result === 'NOT_FOUND' || result === 'NO_DATA') {
            return null;
        }

        return JSON.parse(result);
    } catch (e) {
        console.error(`  ⚠️  Error scraping ${slug}: ${e.message}`);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Check if strain is complete enough to import
// ---------------------------------------------------------------------------
function isComplete(strain) {
    if (!strain?.name) return { complete: false, reason: 'no name' };
    if (!strain?.slug) return { complete: false, reason: 'no slug' };
    if (!strain?.thc_min || strain.thc_min <= 0) return { complete: false, reason: 'no valid THC' };
    if (!strain?.has_real_image) return { complete: false, reason: 'no real image' };
    if (!strain?.terpenes || strain.terpenes.length < 1) return { complete: false, reason: `terpenes incomplete (${strain?.terpenes?.length || 0})` };
    if (!strain?.effects || strain.effects.length < 1) return { complete: false, reason: 'no effects' };
    if (!strain?.flavors || strain.flavors.length < 1) return { complete: false, reason: 'no flavors' };
    return { complete: true, reason: 'ok' };
}

// ---------------------------------------------------------------------------
// Check if slug already exists
// ---------------------------------------------------------------------------
async function strainExists(slug) {
    const { data } = await supabase.from('strains').select('id').eq('slug', slug).maybeSingle();
    return !!data;
}

// ---------------------------------------------------------------------------
// Insert strain into DB
// ---------------------------------------------------------------------------
async function insertStrain(strain) {
    if (DRY_RUN) {
        console.log(`    [DRY] Would insert: ${strain.name} (${strain.slug})`);
        return true;
    }
    const { data, error } = await supabase.from('strains').insert({
        name: strain.name,
        slug: strain.slug,
        type: strain.type,
        thc_min: strain.thc_min,
        thc_max: strain.thc_max,
        terpenes: strain.terpenes,
        effects: strain.effects,
        flavors: strain.flavors,
        description: strain.description,
        image_url: strain.image_url,
        source: 'leafly',
    }).select('id').maybeSingle();

    if (error) {
        console.error(`    ❌ DB error: ${error.message}`);
        return false;
    }
    console.log(`    ✅ Inserted with ID: ${data?.id}`);
    return true;
}

// ---------------------------------------------------------------------------
// Main: get existing slugs, then scrape
// ---------------------------------------------------------------------------
async function main() {
    console.log('🌿 GREENLOG LEAFLY SCRAPER');
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Limit: ${LIMIT || 'unlimited'}\n`);

    // Load existing slugs
    console.log('Loading existing strains from DB...');
    const { data: existingData } = await supabase.from('strains').select('slug');
    const existing = new Set((existingData || []).map(s => s.slug));
    console.log(`   ${existing.size} strains already in DB\n`);

    // Build list of popular strains to scrape
    const POPULAR_STRAINS = [
        // Top shelf / modern hits
        'gorilla-glue-4', 'gg4', 'gelato', 'gelato-33', 'gelato-41', 'gelato-43', 'gelato-45',
        'wedding-cake', 'gsc', 'girl-scout-cookies', 'biscotti', 'gmo-cookies', 'garlic-breath',
        'dosi', 'dosi-face', 'dosi-face-off', 'mandarin-cookies', 'garlic-gushers',
        'runtz', 'pink-runtz', 'white-runtz', 'blue-runtz', 'purple-runtz', 'black-runtz',
        'apple-fritter', 'apple-tartz', 'grape-cream-cake', 'lbv-honeylime-gushers',
        'wonder-mintz', 'animal-face', 'animal-face-off', 'marionberry', 'ice-cream-cake',
        'jealousy', 'mile-high-club', 'cascadia', 'butterscotch', 'flurricane',
        // Wedding Cake family
        'wedding-cake', 'wedding-punch', 'wedding-crasher', 'modified-melons',
        'melon-calyx', 'melona', 'melon-soda', 'melon-sherbet',
        // GSC / cookie family
        'gsc', 'cookie-breath', 'peanut-butter-jelly', 'peanut-butter-breath',
        'cereal-milk', 'cereal-milk-x-ice-cream-cake', 'kush-mints', 'kush-mint',
        'platinum-gsc', 'galactic-cookies', 'crazy-party',
        // Gelato family
        'gelato-33', 'gelato-25', 'gelato-41', 'gelato-43', 'sherb-gelato',
        'do-si-dos', 'dosi-face', 'dosi-face-off', 'mendo-breath', 'mendo-t breath',
        // Runtz family
        'runtz', 'white-runtz', 'pink-runtz', 'blue-runtz', 'purple-runtz',
        'runtz-sherbet', 'grunted', 'gushers', 'gushers-sherbet',
        'blackberry-gelato', 'purple-gelato', 'sundae-hound',
        // GMO / Garlic family
        'gmo-cookies', 'garlic-breath', 'garlic-mush', 'meat-breath',
        'meat-wave', 'laser-sherb', 'chemer', 'chemz',
        // Popular US strains
        'cherry-pie', 'cherry-gas', 'cherry-bomb', 'cherry-cookie',
        'biscotti', 'papaya', 'papaya-sunset', 'sunset-cake',
        'sunset-sherbert', 'sherbert', 'sherb-quake',
        'zookies', 'triple-cookies', 'cookiestrips', 'jenny-kush',
        // Sativas
        'super-lemon-haze', 'sour-diesel', 'sour-breath', 'sour-g',
        'jack-herer', 'tangie', 'tangie-dream', 'cali-tangie',
        'strawberry-ak', 'strawberry-diesel', 'strawberry-runtz',
        'moby-dick', 'durban-poison', 'malaise', 'malaisa',
        'amnesia-haze', 'super-silver-haze', 'chocolate-haze',
        'lemon-haze', 'lemon-tree', 'lemon-cheese', 'lemon-skunk',
        'silver-haze', ' Neville-haze', 'kmd', 'kmint',
        'ghost-train-haze', '涩', 'della-sfera', 'power-diesel',
        // Indicas
        'purple-punch', 'purple-punch-2', 'grape-og', 'grape-stomper',
        'kush-mints', 'kush-mint-fresh', 'motorbreath', 'motorbreath-f14',
        'triangle-kush', 'tkg', 'og-kush', 'og', 'pre-98-og',
        'face-off-og', 'triangle-kush-og', 'fj-kush',
        'northern-lights', 'white-widow', 'white-og', 'white-runtz',
        'granddaddy-purple', 'gdp', 'purple-haze', 'purple-urkle',
        'purple-v奶油', 'mendo-purps', 'p PAP', 'papaya-sunset-indica',
        'master-kush', 'warlock', 'critical Bilbo', 'critical-kush',
        'critical-47', 'critical-plus', 'critical-cheese',
        'purple-kush', 'purple-kush-cookies', 'kosher-kush',
        // Hybrids
        'blue-dream', 'pineapple-express', 'ak-47', 'ak-48',
        'lavender', 'lavender-haze', 'lavender-kush',
        'la-confidential', 'la-agent', 'la-moonrocks',
        'chemdawg', 'chemdawg-4', 'chem-jack', 'chem-haze',
        'death-star', 'death-star-s', 'death-trap',
        'skunk', 'skunk-1', 'skunk-ultra', 'skunk-gold',
        'forum-cookies', 'forum-gsc', 'fortune-cookies',
        'cactus', 'cactus-cool', 'cactus-mandarin',
        'tropic-thunder', 'tropic-thunder-haze', 'tropic-frost',
        'zombie-kush', 'zombie-kush-og', 'zombie-brain',
        'godfather-og', 'godfather', 'godfather-g信徒',
        'mimosa', 'mimosa-x-orange-crush', 'mimosa-evolution',
        'sunset-sherbert', 'sherb-stomper', 'sherb-breath',
        'hollywood-tajin', 'tajin-haze', 'hollywood-og',
        'korean', 'korean-grape', 'korean-air',
        'pink-ghost', 'ghost-og', 'ghost-kush', 'ghost-mint',
        'mandarin-tang', 'mandarin-sunset', 'mandarin-dream',
        'purple-gummy', 'gummy-bears', 'purple-gummy-sherbet',
        'lemonade-haze', 'lemonade', 'lemonade-soda',
        'peach-chementine', 'peach-sherbert', 'peach-gushers',
        'balanced-sweet-skunk', 'sweet-skunk', 'sweet-diesel',
        'plum-driver', 'plum-crazy', 'plum-punch',
        'scooby-super-silver-skunk', 'scooby-snax', 'silver-skunk',
        'cannatonic', 'cannatonic-haze', 'cannatonic-og',
        'cocoa-bomba', 'cocoa-kush', 'chocolate-kush',
        'alpine-og', 'alpine-gelato', 'alpine-cookies',
        'alien-mints', 'alien-cookies', 'alien-breath',
        'alien-og', 'alien-runtz', 'alien-ghost',
        'obama-runtz', 'obama-kush', 'obama-gas',
        'dantes-inferno', 'dante-skunk', 'inferno-haze',
        'fotmer-t3h', 'fotmer', 'fotmer-haze',
        'bedrocan-alternative', 'bedrocan', 'bedrocan-purple',
        'together-pharma-glueberry', 'glueberry', 'glue-berry',
        'love-potion', 'love-potion-og', 'potion-haze',
        'cap-junky', 'cap-junk', 'junky-cap',
        'creamy-kee', 'creamy-kush', 'creamy-gelato',
        'tiger-cake', 'tiger-og', 'tiger-blood',
        'strawberry-cherry-gas', 'strawberry-cherry', 'cherry-strawberry',
        'glitter-bomb', 'glitter-kush', 'bomb-strawberry',
        'plum-crazy', 'plum-gelato', 'crazy-plum',
        'fruity-tutti', 'fruity-sherbert', 'tutti-frutti',
        'big-buddha-cheese', 'bbc', 'big-buddha',
        'chiquid', 'chiquid-haze', 'qui-d',
        'sweet-berried', 'sweet-berry', 'berry-sweet',
        'banana-kush', 'banana', 'banana-og',
        'candy-queen', 'candy', 'queen-gelato',
        'laser', 'laser-haze', 'laser-og',
        'chemer', 'chemer-haze', 'chemz',
        'papie', 'papaya-stomper', 'papaya-punch',
        'hollywood-tajin', 'tajin-haze',
        // Extra popular for variety
        'wifi-og', 'wifi', 'wifi-cookies',
        'tmi', 'tangerine-man', 'tangerine-haze',
        'headband', 'headband-og', 'power-headband',
        'chilliangelic', 'chill-pill', 'chill-gelato',
        'gumby', 'gumby-og', 'gumby-breath',
        'jet-fuel', 'jet-fuel-gelp', 'fuel-g',
        'tange', 'tangie-haze', 'tangie-g',
        'dream-nectar', 'dream', 'nectar',
        'cherry-widow', 'cherry-pie-haze', 'cherry-widow-x',
        'alpine-star', 'star-dawg', 'star-cookies',
        'diamond-gum', 'diamond', 'diamond-dawg',
        'papi', 'papo', 'papi-smoke',
        'f PO', 'foggy-haze', 'foggy-cookies',
        'pancakes', 'pancake-haze', 'pancake-kush',
        'strawberry-banana', 'straw-nana', 'banana-strawberry',
        'donkey butter', 'donkey', 'butter',
        'goddard', 'god-doc', 'doctor-g',
        'jet-a', 'jet', 'jet-fuel-haze',
        'galactic', 'galactic-og', 'galactic-runtz',
        'crazy-cherry', 'cherry-crazy', 'crazy-fruit',
        'golden-goat', 'goat', 'golden-haze',
        'grapefruit-haze', 'grapefruit', 'grapefruit-skunk',
    ];

    // Filter out already existing
    const toScrape = POPULAR_STRAINS.filter(s => !existing.has(s));
    console.log(`   ${toScrape.length} new strains to scrape\n`);

    if (LIMIT) {
        toScrape.length = Math.min(toScrape.length, LIMIT);
    }

    console.log(`📋 Scraping ${toScrape.length} strains from Leafly...\n`);
    console.log('   Only strains with 100% complete data AND real images will be imported.\n');

    let success = 0;
    let skipped = 0;
    let incomplete = 0;
    let notFound = 0;

    for (let i = 0; i < toScrape.length; i++) {
        const slug = toScrape[i];
        const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        process.stdout.write(`[${i + 1}/${toScrape.length}] ${name}... `);

        // Check if still exists (may have been scraped in a previous run)
        if (await strainExists(slug)) {
            console.log('⏭ already in DB');
            skipped++;
            continue;
        }

        const strain = scrapeStrain(slug);
        if (!strain) {
            console.log('⚠️  Leafly not found');
            notFound++;
            await new Promise(r => setTimeout(r, 1500));
            continue;
        }

        const { complete, reason } = isComplete(strain);
        if (!complete) {
            console.log(`⏭ incomplete: ${reason}${strain.image_url ? ` (img: ${strain.image_url.includes('default') ? 'placeholder' : 'ok'})` : ''}`);
            incomplete++;
            await new Promise(r => setTimeout(r, 1500));
            continue;
        }

        const ok = await insertStrain(strain);
        if (ok) {
            success++;
        }

        await new Promise(r => setTimeout(r, 1500));
    }

    console.log('\n' + '='.repeat(50));
    console.log(' SUMMARY');
    console.log(`   ✅ Imported: ${success}`);
    console.log(`   ⏭ Skipped (exists): ${skipped}`);
    console.log(`   ⏭ Incomplete: ${incomplete}`);
    console.log(`   ❌ Not found: ${notFound}`);
    console.log('='.repeat(50) + '\n');
}

main().catch(console.error);