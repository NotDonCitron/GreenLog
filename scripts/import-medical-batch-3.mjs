import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_3 = [
  // enua
  { name: "Cold Creek Kush", brand: "enua", type: "hybrid", avg_thc: 30.0, genetics: "MK Ultra x Chemdawg 91", indications: ["Schwere Schmerzen", "Insomnie"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Caryophyllene", percent: 0.8}, {name: "Limonene", percent: 0.4}] },
  { name: "Sweets", brand: "enua", type: "hybrid", avg_thc: 22.0, genetics: "Guava Gelato x Karma Sour Diesel BX2", indications: ["Stress", "Depression"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Caryophyllene", percent: 0.6}, {name: "Myrcene", percent: 0.3}] },
  { name: "Strawberry Pave", brand: "enua", type: "hybrid", avg_thc: 25.0, genetics: "Pave x Red Pop", indications: ["Angstzustände", "Schmerz"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Myrcene", percent: 0.5}, {name: "Linalool", percent: 0.3}] },
  
  // Remexian
  { name: "Lemon Pepper Punch", brand: "Remexian", type: "hybrid", avg_thc: 31.0, genetics: "Lemonhead x Purple Punch", indications: ["Chronische Schmerzen", "Depression"], terpenes: [{name: "Limonene", percent: 1.4}, {name: "Caryophyllene", percent: 0.7}, {name: "Pinene", percent: 0.3}] },
  { name: "Chemdawg", brand: "Remexian", type: "sativa", avg_thc: 33.0, genetics: "Nepalese x Thai", indications: ["ADHS", "Erschöpfung"], terpenes: [{name: "Caryophyllene", percent: 1.1}, {name: "Myrcene", percent: 0.8}, {name: "Limonene", percent: 0.5}] },
  { name: "Gelonade", brand: "Remexian", type: "hybrid", avg_thc: 27.0, genetics: "Lemon Tree x Gelato #41", indications: ["Stress", "Depression"], terpenes: [{name: "Limonene", percent: 1.2}, {name: "Caryophyllene", percent: 0.6}, {name: "Myrcene", percent: 0.2}] },
  
  // Peace Naturals
  { name: "Space Cake", brand: "Peace Naturals", type: "hybrid", avg_thc: 33.0, genetics: "GSC x Snow Lotus", indications: ["Schwere Schmerzen", "Spastik"], terpenes: [{name: "Myrcene", percent: 1.5}, {name: "Limonene", percent: 0.7}, {name: "Caryophyllene", percent: 0.5}] },
  { name: "GMO Cookies", brand: "Peace Naturals", type: "indica", avg_thc: 31.0, genetics: "Chemdawg x Girl Scout Cookies", indications: ["Insomnie", "Schmerz"], terpenes: [{name: "Caryophyllene", percent: 1.2}, {name: "Myrcene", percent: 0.9}, {name: "Limonene", percent: 0.4}] },
  { name: "Cocoa Bomba", brand: "Peace Naturals", type: "indica", avg_thc: 27.0, genetics: "Do-Si-Dos x PCG", indications: ["Angst", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.1}, {name: "Caryophyllene", percent: 0.6}, {name: "Linalool", percent: 0.3}] },
  
  // Cannamedical
  { name: "Mintwave", brand: "Cannamedical", type: "indica", avg_thc: 27.4, genetics: "Unknown Kush Variant", indications: ["Schmerz", "Entspannung"], terpenes: [{name: "Limonene", percent: 0.8}, {name: "Caryophyllene", percent: 0.7}, {name: "Myrcene", percent: 0.5}] },
  { name: "Jack Herer", brand: "Cannamedical", type: "sativa", avg_thc: 21.6, genetics: "Haze x Northern Lights", indications: ["ADHS", "Depression"], terpenes: [{name: "Terpinolene", percent: 0.9}, {name: "Pinene", percent: 0.4}, {name: "Myrcene", percent: 0.3}] },
  { name: "Royal Berry", brand: "Cannamedical", type: "indica", avg_thc: 19.0, genetics: "Berry White x Royal Kush", indications: ["Angst", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.0}, {name: "Limonene", percent: 0.4}, {name: "Caryophyllene", percent: 0.3}] },
  
  // 420 Pharma / Curaleaf
  { name: "Moonshine Purple", brand: "420 Pharma", type: "hybrid", avg_thc: 30.0, genetics: "Old Moonshine x Purple Punch", indications: ["Stress", "Schmerz"], terpenes: [{name: "Limonene", percent: 1.1}, {name: "Caryophyllene", percent: 0.6}, {name: "Myrcene", percent: 0.4}] },
  { name: "Plum Driver", brand: "420 Pharma", type: "hybrid", avg_thc: 27.0, genetics: "Sundae Driver variant", indications: ["Depression", "Angst"], terpenes: [{name: "Linalool", percent: 0.5}, {name: "Limonene", percent: 0.8}, {name: "Myrcene", percent: 0.4}] },
  { name: "MAC 1", brand: "420 Pharma", type: "hybrid", avg_thc: 25.0, genetics: "Alien Cookies x Colombian x Starfighter", indications: ["Appetitlosigkeit", "Stress"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Pinene", percent: 0.5}, {name: "Caryophyllene", percent: 0.4}] }
];

async function importBatch3() {
  console.log('--- Importing Medical Batch #3 ---');
  for (const s of MEDICAL_BATCH_3) {
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
      description: `Premium Medizinalcannabis von ${s.brand}. Genetik: ${s.genetics}. Indikationen: ${s.indications.join(', ')}.`
    }, { onConflict: 'slug' });
  }
  console.log('DONE!');
}

importBatch3();
