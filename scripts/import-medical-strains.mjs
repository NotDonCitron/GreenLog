import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_STRAINS = [
  // AURORA
  { name: "Farm Gas", brand: "Aurora", type: "indica", thc_min: 26, thc_max: 28, genetics: "GMO x Sour Diesel", indications: ["Schmerz", "Appetitlosigkeit"], terpenes: ["Myrcene", "Limonene", "Caryophyllene"] },
  { name: "Sourdough", brand: "Aurora", type: "indica", thc_min: 27, thc_max: 29, genetics: "Wedding Cake x Sour Diesel", indications: ["Schlafstörungen", "Stress"], terpenes: ["Myrcene", "Caryophyllene", "Limonene"] },
  { name: "Ghost Train Haze", brand: "Aurora", type: "sativa", thc_min: 22, thc_max: 25, genetics: "Ghost OG x Neville's Wreck", indications: ["Depression", "ADHS"], terpenes: ["Terpinolene", "Myrcene", "Limonene"] },
  { name: "Delahaze", brand: "Aurora", type: "sativa", thc_min: 22, thc_max: 24, genetics: "Mango Haze x Lemon Skunk", indications: ["Antriebslosigkeit"], terpenes: ["Terpinolene", "Limonene"] },
  { name: "Pink Kush", brand: "Aurora", type: "indica", thc_min: 20, thc_max: 24, genetics: "OG Kush variant", indications: ["Schlaf", "Schmerz"], terpenes: ["Myrcene", "Limonene"] },
  
  // 420 PHARMA (Evolution & Compound)
  { name: "Gastro Pop", brand: "420 Pharma", type: "hybrid", thc_min: 28, thc_max: 30, genetics: "Apples & Bananas x Grape Gas", indications: ["Chronische Schmerzen"], terpenes: ["Caryophyllene", "Limonene", "Myrcene"] },
  { name: "Bling Blaow", brand: "420 Pharma", type: "hybrid", thc_min: 28, thc_max: 30, genetics: "Glitter Bomb x Gastro Pop", indications: ["Schmerz", "Entzündung"], terpenes: ["Limonene", "Caryophyllene"] },
  { name: "Cap Junky", brand: "420 Pharma", type: "hybrid", thc_min: 24, thc_max: 26, genetics: "Alien Cookies x Kush Mints", indications: ["Stress", "Angst"], terpenes: ["Limonene", "Caryophyllene"] },
  { name: "Kush Mint", brand: "420 Pharma", type: "hybrid", thc_min: 25, thc_max: 27, genetics: "Animal Mints x Bubba Kush", indications: ["Schmerz"], terpenes: ["Limonene", "Caryophyllene"] },
  { name: "Ice Cream Cake", brand: "420 Pharma", type: "indica", thc_min: 22, thc_max: 25, genetics: "Wedding Cake x Gelato #33", indications: ["Schlaf"], terpenes: ["Limonene", "Myrcene"] },
  
  // TILRAY (Good Supply & Craft)
  { name: "Monkey Butter", brand: "Tilray", type: "indica", thc_min: 24, thc_max: 26, genetics: "GG4 x Peanut Butter Breath", indications: ["Schlaf", "Muskelentspannung"], terpenes: ["Myrcene", "Caryophyllene"] },
  { name: "Islander", brand: "Tilray", type: "indica", thc_min: 21, thc_max: 23, genetics: "Starfighter x Skywalker OG", indications: ["Schmerz"], terpenes: ["Myrcene", "Limonene"] },
  { name: "Sweet Berry Kush", brand: "Tilray", type: "indica", thc_min: 17, thc_max: 19, genetics: "Banana OG x Purple Punch", indications: ["Angst", "Stress"], terpenes: ["Limonene", "Myrcene"] },
  { name: "Master Kush", brand: "Tilray", type: "indica", thc_min: 20, thc_max: 22, genetics: "Hindu Kush x Skunk #1", indications: ["Entspannung"], terpenes: ["Myrcene"] },
  
  // CANTOURAGE
  { name: "Grape Gasoline", brand: "Cantourage", type: "hybrid", thc_min: 23, thc_max: 25, genetics: "Grape Pie x Jet Fuel Gelato", indications: ["Stress", "Schmerz"], terpenes: ["Limonene", "Myrcene"] },
  { name: "Bubblegum Biscotti", brand: "Cantourage", type: "indica", thc_min: 22, thc_max: 24, genetics: "Biscotti x Bubblegum", indications: ["Schlaf"], terpenes: ["Caryophyllene", "Limonene"] },
  { name: "Gorilla Glue #4", brand: "Cantourage", type: "hybrid", thc_min: 22, thc_max: 24, genetics: "Sour Dubb x Chem Sis", indications: ["Schmerz"], terpenes: ["Caryophyllene"] },
  
  // DEMECAN
  { name: "Typ 1", brand: "Demecan", type: "indica", thc_min: 28, thc_max: 31, genetics: "Bubba Kush variant", indications: ["Starke Schmerzen"], terpenes: ["Myrcene", "Limonene"] },
  { name: "Typ 2", brand: "Demecan", type: "hybrid", thc_min: 18, thc_max: 22, genetics: "Balanced Hybrid", indications: ["Spastik", "MS"], terpenes: ["Pinene", "Limonene"] },
  
  // BEDROCAN & OTHERS
  { name: "Bedrocan", brand: "Bedrocan", type: "sativa", thc_min: 22, thc_max: 22, genetics: "Jack Herer", indications: ["Schmerz", "Übelkeit"], terpenes: ["Terpinolene", "Myrcene", "Pinene"], is_medical: true },
  { name: "White Widow", brand: "Adven", type: "hybrid", thc_min: 18, thc_max: 20, genetics: "Brazilian Sativa x South Indian Indica", indications: ["Angst"], terpenes: ["Myrcene", "Caryophyllene"], is_medical: true }
];

async function importStrains() {
  console.log('--- MASS IMPORT: 2026 Medical Strains ---');
  for (const s of MEDICAL_STRAINS) {
    const nameSlug = s.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const brandSlug = s.brand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const fullSlug = `${brandSlug}-${nameSlug}`;
    const imageUrl = `/strains/${nameSlug}.jpg`;
    
    console.log(`Upserting: ${s.brand} ${s.name} (${fullSlug})`);
    const { error } = await supabase.from('strains').upsert({
      name: `${s.brand} ${s.name}`,
      slug: fullSlug,
      brand: s.brand,
      type: s.type,
      thc_min: s.thc_min,
      thc_max: s.thc_max,
      genetics: s.genetics,
      indications: s.indications,
      terpenes: s.terpenes,
      image_url: imageUrl,
      is_medical: true,
      description: `Medizinisches Cannabis von ${s.brand}. Genetik: ${s.genetics}. Indikationen: ${s.indications.join(', ')}.`
    }, { onConflict: 'slug' });
    
    if (error) console.error(`Error with ${s.name}:`, error.message);
  }
  console.log('--- IMPORT DONE ---');
}

importStrains();
