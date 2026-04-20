"""
greenlog-leafly-scraper.py

Scrapes Leafly for strain data using browser-harness + Obscura.
ONLY imports strains with 100% complete data.

Usage:
    uv run bh greenlog-leafly-scraper.py          # full run
    uv run bh greenlog-leafly-scraper.py --dry    # dry run (no DB write)
    uv run bh greenlog-leafly-scraper.py --limit 50  # limit for testing
"""

import json
import subprocess
import sys
import time
from datetime import datetime

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SUPABASE_URL = "https://uwjyvvvykyueuxtdkscs.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3anl2dnZ5a3l1ZXV4dGRrc2NzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEwMTgwMSwiZXhwIjoyMDg5Njc3ODAxfQ.WFSRK9odYYJacA-aT5zM6mhQqhUrWj8jZXREdcb9VcI"

OBSCURA_BIN = "obscura"

DRY_RUN = "--dry" in sys.argv
LIMIT = None
for arg in sys.argv:
    if arg.startswith("--limit"):
        LIMIT = int(arg.split("=")[1])

# ---------------------------------------------------------------------------
# Leafly slug variants (MED/Brand names)
# ---------------------------------------------------------------------------
SLUG_MAPPING = {
    "sedamen": "pink-kush", "luminarium": "delahaze",
    "pedanios": "ghost-train-haze", "houndstooth": "super-lemon-haze",
    "penelope": "cbd-skunk-haze", "argaman": "cbd-critical-mass",
    "islander": "wappa", "monkey-butter": "monkey-grease",
    "farm-gas": "gmo-cookies", "sourdough": "wedding-cake",
    "typ-1": "master-kush", "typ-2": "warlock",
    "galax": "white-widow", "craft-emerald": "gsc",
    "tiger-eyez": "tiger-cake", "plum-driver": "plum-crazy",
    "bling-blaow": "glitter-bomb", "el-gringo": "gsc",
    "el-jefe": "el-jefe", "scotti": "wedding-cake",
    "ice-cream-cake-kush-mints": "ice-cream-cake",
    "kush-mint": "kush-mints", "gorilla-glue": "gorilla-glue-4",
    "gg4": "gorilla-glue-4", "london-pound-cake": "london-pound-cake-75",
    "sherbert": "sunset-sherbert", "pink-gas": "pink-kush",
    "goc": "gmo-cookies", "biscotti": "biscotti",
    "apples-and-bananas": "apples-and-bananas",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def obscura_eval(url, js_expr, timeout=45_000):
    """Run Obscura fetch with JS eval, return result or None."""
    import subprocess
    enc_url = url.replace('"', '\\"')
    enc_js = js_expr.replace('"', '\\"')
    cmd = f'{OBSCURA_BIN} fetch "{enc_url}" --eval "{enc_js}" --stealth -q --wait-until networkidle0'
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return result.stdout.strip()
    except:
        return None

def normalize_slug(name):
    """Normalize strain name to URL slug."""
    if not name:
        return ""
    base = name.lower().strip()
    if base in SLUG_MAPPING:
        return SLUG_MAPPING[base]
    return base.replace(" ", "-").replace("/", "-").replace("'", "").replace("&", "and").replace("ä", "a").replace("ö", "o").replace("ü", "u").replace("ß", "ss")

def slug_variants(name):
    """Generate URL slug variants for a strain."""
    base = normalize_slug(name)
    if not base:
        return []
    variants = set()
    variants.add(base)
    variants.add(base + "s")
    if base.endswith("s") and len(base) > 2:
        variants.add(base[:-1])
    variants.add(base.replace("-", ""))
    first = base.split("-")[0]
    if first and first != base:
        variants.add(first)
    return [v for v in variants if len(v) > 1]

def scrape_strain_from_leafly(slug, name):
    """Scrape a strain from Leafly using Obscura. Returns dict or None."""
    for variant in slug_variants(name):
        url = f"https://leafly.com/strains/{variant}"
        title = obscura_eval(url, "document.title")
        if not title or "404" in title or "Not Found" in title:
            continue

        raw = obscura_eval(url, "document.getElementById('__NEXT_DATA__')?.textContent || null")
        if not raw or raw == "null":
            continue

        try:
            data = json.loads(raw)
            strain = data.get("props", {}).get("pageProps", {}).get("strain")
            if not strain or not strain.get("name"):
                continue
            return parse_strain_data(strain, variant)
        except:
            continue
    return None

def parse_strain_data(strain, found_slug):
    """Parse Leafly strain JSON into GreenLog format."""
    # Terpenes: top 3 by score
    terps_raw = strain.get("terps", {}) or {}
    terps = []
    for key, val in terps_raw.items():
        if isinstance(val, dict) and val.get("name"):
            terps.append({
                "name": val["name"],
                "percent": round(float(val.get("score", 0.5) * 2), 1) or 0.5
            })
    terps = sorted(terps, key=lambda x: x["percent"], reverse=True)[:3]

    # Effects: top 5 by score
    effects_raw = strain.get("effects", {}) or {}
    effects = []
    for key, val in effects_raw.items():
        if isinstance(val, dict) and val.get("name"):
            effects.append(val["name"])
    effects = sorted(effects, key=lambda x: effects_raw.get(x, {}).get("score", 0), reverse=True)[:5]

    # Flavors: top 3 by score
    flavors_raw = strain.get("flavors", {}) or {}
    flavors = []
    for key, val in flavors_raw.items():
        if isinstance(val, dict) and val.get("name"):
            flavors.append(val["name"])
    flavors = sorted(flavors, key=lambda x: flavors_raw.get(x, {}).get("score", 0), reverse=True)[:3]

    # THC
    thc = strain.get("cannabinoids", {}).get("thc", {}).get("percentile50") or 0

    # Description
    description = strain.get("descriptionPlain") or ""
    if not description:
        html_desc = strain.get("description") or ""
        import re
        description = re.sub(r'<[^>]+>', '', html_desc).strip()

    # Type
    category = (strain.get("category") or "hybrid").lower()
    valid_types = ["indica", "sativa", "hybrid", "ruderalis"]
    if category not in valid_types:
        category = "hybrid"

    return {
        "name": strain.get("name", ""),
        "slug": found_slug,
        "type": category,
        "thc_min": round(thc - 2, 1) if thc else None,
        "thc_max": round(thc + 2, 1) if thc else None,
        "terpenes": terps if terps else None,
        "effects": effects if effects else None,
        "flavors": flavors if flavors else None,
        "description": description if len(description) >= 100 else None,
        "leafly_url": f"https://leafly.com/strains/{found_slug}",
    }

def is_complete(strain_data):
    """Check if strain has 100% complete data."""
    if not strain_data.get("name"):
        return False, "no name"
    if not strain_data.get("slug"):
        return False, "no slug"
    if not strain_data.get("thc_min") or strain_data.get("thc_min") <= 0:
        return False, "no valid THC"
    if not strain_data.get("terpenes") or len(strain_data["terpenes"]) < 3:
        return False, f"terpenes incomplete ({len(strain_data.get('terpenes') or [])})"
    if not strain_data.get("effects") or len(strain_data["effects"]) < 1:
        return False, "no effects"
    if not strain_data.get("flavors") or len(strain_data["flavors"]) < 1:
        return False, "no flavors"
    desc = strain_data.get("description") or ""
    if len(desc) < 100:
        return False, f"description too short ({len(desc)} chars)"
    bad_phrases = ["Die beliebte Sorte", "Medizinisches Cannabis von", "coming soon", "this strain"]
    if any(p.lower() in desc.lower() for p in bad_phrases):
        return False, "description is placeholder"
    return True, "complete"

# ---------------------------------------------------------------------------
# Supabase
# ---------------------------------------------------------------------------
def get_db_client():
    """Get Supabase service role client."""
    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    except ImportError:
        return None

def strain_exists_in_db(sb, slug):
    """Check if strain already exists in DB."""
    result = sb.table("strains").select("id").eq("slug", slug).maybe_single().execute()
    return result.data is not None

def insert_strain(sb, data):
    """Insert strain into DB."""
    if DRY_RUN:
        print(f"    [DRY] Would insert: {data['name']} ({data['slug']})")
        return True
    result = sb.table("strains").insert(data).execute()
    return bool(result.data)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("🌿 GREENLOG LEAFLY SCRAPER")
    print(f"   Mode: {'DRY RUN' if DRY_RUN else 'LIVE'}")
    print(f"   Limit: {LIMIT or 'unlimited'}\n")

    sb = get_db_client()
    if not sb:
        print("❌ Could not connect to Supabase. Install: pip install supabase")
        return

    # Load existing slugs from DB
    print("Loading existing strains from DB...")
    existing = set()
    page = 0
    while True:
        result = sb.table("strains").select("slug").eq("is_custom", False).range(page * 1000, (page+1)*1000-1).execute()
        if not result.data:
            break
        for s in result.data:
            existing.add(s["slug"])
        if len(result.data) < 1000:
            break
        page += 1

    print(f"   {len(existing)} strains already in DB\n")

    # Build list of strain names to scrape
    # Strategy: scrape all known cannabis strain names
    # For now: scrape from our SLUG_MAPPING + common strains + user input
    all_strains_to_scrape = set()

    # Add from SLUG_MAPPING
    for k, v in SLUG_MAPPING.items():
        all_strains_to_scrape.add(v)

    # Add common strains
    COMMON_STRAINS = [
        # Top popular
        "gorilla-glue-4", "gelato", "gsc", "wedding-cake", "gelato-33",
        "gg4", "gorilla-glue", "og-kush", "sour-diesel", "blue-dream",
        "northern-lights", "white- widow", "granddaddy-purple", "ak-47",
        "purple-haze", "cheese", "amnesia-haze", "jack-herer", "la-confidential",
        "pineapple-express", "dosi", "mimosa", "zombie-kush", "godfather-og",
        # Hybrids
        "gelato-41", "gelato-43", "biscotti", "peanut-butter-jelly",
        "peanut-butter-breath", "dosi-face", "mandarin-cookies",
        "gmo-cookies", "garlic-breath", "cherry-pie", "gushers",
        "runtz", "pink-runtz", "white-runtz", "blue-runtz",
        # Sativas
        "super-lemon-haze", "sour-diesel", "jack-herer", "tangie",
        "strawberry-ak", "moby-dick", "durban-poison", "malaise",
        # Indicas
        "purple-punch", "grape-og", "kush-mints", "motorbreath",
        "jealousy", "triangle-kush", "gmo", "forum-cookies",
        # New crosses
        "apple-tartz", "grape-cream-cake", "lbv-honeylime-gushers",
        "wonder-mintz", "animal-face", "marionberry", "ice-cream-cake",
        "biscotti", "ti", "lond", "sunset-sherbert", "papaya",
        "korean", "tropic-thunder", "cactus", "chemer", "laser",
        "pink-ghost", "ghost-kush", "mandarin-tang", "purple-gummy",
    ]
    for s in COMMON_STRAINS:
        all_strains_to_scrape.add(s)

    # Filter out already existing
    to_scrape = [s for s in all_strains_to_scrape if s not in existing]
    print(f"   {len(to_scrape)} new strains to scrape (excluding existing)\n")

    if LIMIT:
        to_scrape = to_scrape[:LIMIT]

    print(f"📋 Scraping {len(to_scrape)} strains from Leafly...\n")
    print(f"   Only strains with 100% complete data will be imported.\n")

    success = 0
    skipped = 0
    failed = 0

    for i, slug in enumerate(to_scrape):
        name = slug.replace("-", " ").replace("_", " ").title()
        print(f"[{i+1}/{len(to_scrape)}] {name}...", end=" ", flush=True)

        # Check if already in DB
        if strain_exists_in_db(sb, slug):
            print("⏭ already in DB")
            skipped += 1
            continue

        # Scrape from Leafly
        data = scrape_strain_from_leafly(slug, name)
        if not data:
            print("⚠️  Leafly not found")
            failed += 1
            time.sleep(1.5)
            continue

        # Check completeness
        complete, reason = is_complete(data)
        if not complete:
            print(f"⏭ incomplete: {reason}")
            failed += 1
            time.sleep(1.5)
            continue

        # Insert
        ok = insert_strain(sb, data)
        if ok:
            print(f"✅ imported ({data['thc_min']}-{data['thc_max']}% THC, {len(data['terpenes'])} terps)")
            success += 1
        else:
            print("❌ DB insert failed")
            failed += 1

        time.sleep(1.5)

    print(f"\n{'='*50}")
    print(f" SUMMARY")
    print(f"   ✅ Imported: {success}")
    print(f"   ⏭ Skipped (exists): {skipped}")
    print(f"   ⏭ Incomplete: {failed}")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    main()