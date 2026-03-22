import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_2 = [
  // DEMECAN
  { name: "Craft Emerald", brand: "Demecan", type: "hybrid", avg_thc: 24.5, genetics: "GMO x Gush Mints", indications: ["Schmerz", "Übelkeit"], terpenes: [{name: "Myrcene", percent: 0.9}, {name: "Limonene", percent: 0.6}, {name: "Caryophyllene", percent: 0.4}] },
  { name: "Gas Face", brand: "Demecan", type: "sativa", avg_thc: 26.0, genetics: "Face Off OG x Animal Mints", indications: ["Depression", "Antriebslosigkeit"], terpenes: [{name: "Limonene", percent: 1.2}, {name: "Caryophyllene", percent: 0.8}, {name: "Myrcene", percent: 0.3}] },
  { name: "Tiger Eyez", brand: "Demecan", type: "indica", avg_thc: 23.0, genetics: "Unknown Indica Cross", indications: ["Schlafstörungen", "Muskelspasmen"], terpenes: [{name: "Myrcene", percent: 1.1}, {name: "Humulene", percent: 0.4}, {name: "Linalool", percent: 0.3}] },
  
  // 420 PHARMA (Evolution & Compound)
  { name: "Cap Junky", brand: "420 Pharma", type: "hybrid", avg_thc: 25.0, genetics: "Alien Cookies x Kush Mints", indications: ["Chronischer Schmerz", "Stress"], terpenes: [{name: "Limonene", percent: 0.8}, {name: "Caryophyllene", percent: 0.7}, {name: "Myrcene", percent: 0.4}] },
  { name: "Gastro Pop", brand: "420 Pharma", type: "hybrid", avg_thc: 30.0, genetics: "Apples & Bananas x Grape Gas", indications: ["Appetitlosigkeit", "Schmerz"], terpenes: [{name: "Caryophyllene", percent: 1.0}, {name: "Limonene", percent: 0.9}, {name: "Myrcene", percent: 0.5}] },
  { name: "Alien Mints", brand: "420 Pharma", type: "hybrid", avg_thc: 20.0, genetics: "Alien Cookies x Kush Mints", indications: ["Angstzustände", "Übelkeit"], terpenes: [{name: "Limonene", percent: 0.7}, {name: "Caryophyllene", percent: 0.5}, {name: "Pinene", percent: 0.2}] },
  
  // AURORA
  { name: "Luminarium", brand: "Aurora", type: "sativa", avg_thc: 22.0, genetics: "Delahaze Variant", indications: ["ADHS", "Depression"], terpenes: [{name: "Terpinolene", percent: 0.9}, {name: "Limonene", percent: 0.4}, {name: "Myrcene", percent: 0.3}] },
  { name: "Sedamen", brand: "Aurora", type: "indica", avg_thc: 20.0, genetics: "Pink Kush Variant", indications: ["Chronische Schmerzen", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.3}, {name: "Caryophyllene", percent: 0.5}, {name: "Limonene", percent: 0.3}] },
  { name: "Island Sweet Skunk", brand: "Aurora", type: "sativa", avg_thc: 20.0, genetics: "Sweet Skunk x White Widow", indications: ["Erschöpfung", "Stress"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Pinene", percent: 0.4}, {name: "Terpinolene", percent: 0.3}] },
  
  // TWEED (Canopy Growth)
  { name: "Glitter Bomb", brand: "Tweed", type: "indica", avg_thc: 27.0, genetics: "Grape Gas x OGKB Blueberry Headband", indications: ["Schwere Schmerzen", "Insomnie"], terpenes: [{name: "Myrcene", percent: 1.4}, {name: "Caryophyllene", percent: 0.6}, {name: "Limonene", percent: 0.4}] },
  { name: "Jack Herer", brand: "Tweed", type: "sativa", avg_thc: 18.0, genetics: "Haze x Northern Lights #5 x Shiva Skunk", indications: ["Depression", "Fokus"], terpenes: [{name: "Terpinolene", percent: 0.7}, {name: "Pinene", percent: 0.5}, {name: "Myrcene", percent: 0.3}] },
  { name: "Farm Gas", brand: "Aurora", type: "hybrid", avg_thc: 27.0, genetics: "GMO x Black Cherry Punch", indications: ["Schmerz", "Appetitlosigkeit"], terpenes: [{name: "Myrcene", percent: 1.1}, {name: "Limonene", percent: 0.6}, {name: "Caryophyllene", percent: 0.5}] },
  { name: "Sourdough", brand: "Aurora", type: "indica", avg_thc: 29.0, genetics: "Wedding Cake x Sour Diesel", indications: ["Schlaf", "Spastik"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Caryophyllene", percent: 0.6}, {name: "Limonene", percent: 0.4}] }
];

async function importBatch2() {
  console.log('--- Importing Medical Batch #2 ---');
  for (const s of MEDICAL_BATCH_2) {
    const nameSlug = s.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const brandSlug = s.brand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const fullSlug = `${brandSlug}-${nameSlug}`;
    const imageUrl = `/strains/${nameSlug}.jpg`;
    
    console.log(`Upserting ${s.name} (${s.brand}) -> slug: ${fullSlug}...`);
    await supabase.from('strains').upsert({
      name: `${s.brand} ${s.name}`, 
      slug: fullSlug,
      brand: s.brand,
      type: s.type,
      avg_thc: s.avg_thc,
      genetics: s.genetics,
      indications: s.indications,
      terpenes: s.terpenes,
      image_url: imageUrl,
      is_medical: true,
      description: `Medizinisches Cannabis von ${s.brand}. Genetik: ${s.genetics}. Indikationen: ${s.indications.join(', ')}.`
    }, { onConflict: 'slug' });
  }
  console.log('DONE!');
}

importBatch2();
