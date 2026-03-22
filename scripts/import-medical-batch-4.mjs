import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_4 = [
  // enua
  { name: "Gogurtz", brand: "enua", type: "indica", avg_thc: 28.0, genetics: "Runtz x Cap Junky", indications: ["Schwere Schmerzen", "Insomnie"], terpenes: [{name: "Limonene", percent: 1.1}, {name: "Caryophyllene", percent: 0.8}, {name: "Linalool", percent: 0.4}] },
  { name: "Koko Cookies", brand: "enua", type: "hybrid", avg_thc: 25.0, genetics: "GMO x Fuel", indications: ["Übelkeit", "Appetitlosigkeit"], terpenes: [{name: "Caryophyllene", percent: 0.9}, {name: "Myrcene", percent: 0.7}, {name: "Humulene", percent: 0.3}] },
  
  // Adven / Curaleaf
  { name: "LA Sage", brand: "Curaleaf", type: "sativa", avg_thc: 22.0, genetics: "S.A.G.E. x Skunk #1", indications: ["Depression", "Erschöpfung"], terpenes: [{name: "Terpinolene", percent: 0.8}, {name: "Limonene", percent: 0.5}, {name: "Pinene", percent: 0.3}] },
  { name: "Sorbet", brand: "Curaleaf", type: "hybrid", avg_thc: 20.0, genetics: "Sunset Sherbet variant", indications: ["Stress", "Angstzustände"], terpenes: [{name: "Myrcene", percent: 0.7}, {name: "Limonene", percent: 0.6}, {name: "Caryophyllene", percent: 0.4}] },
  
  // Tilray
  { name: "Wappa", brand: "Tilray", type: "indica", avg_thc: 24.0, genetics: "Sweet Skunk variant", indications: ["Schmerz", "Spastik"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Caryophyllene", percent: 0.5}, {name: "Limonene", percent: 0.3}] },
  { name: "Headband", brand: "Tilray", type: "hybrid", avg_thc: 25.0, genetics: "OG Kush x Sour Diesel", indications: ["Migräne", "Schmerz"], terpenes: [{name: "Myrcene", percent: 0.9}, {name: "Limonene", percent: 0.7}, {name: "Caryophyllene", percent: 0.5}] },
  
  // Pedanios (Aurora)
  { name: "Sour Diesel", brand: "Pedanios", type: "sativa", avg_thc: 18.0, genetics: "91 Chemdawg x Super Skunk", indications: ["Depression", "ADHS"], terpenes: [{name: "Terpinolene", percent: 0.6}, {name: "Myrcene", percent: 0.4}, {name: "Pinene", percent: 0.3}] },
  { name: "Ghost Train Haze", brand: "Pedanios", type: "sativa", avg_thc: 22.0, genetics: "Ghost OG x Neville's Wreck", indications: ["Chronische Schmerzen", "Depression"], terpenes: [{name: "Terpinolene", percent: 1.0}, {name: "Limonene", percent: 0.5}, {name: "Myrcene", percent: 0.3}] },
  
  // Remexian
  { name: "Frosted Lemon Angel", brand: "Remexian", type: "hybrid", avg_thc: 22.0, genetics: "Unknown Hybrid", indications: ["Stress", "Depression"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Myrcene", percent: 0.5}, {name: "Caryophyllene", percent: 0.4}] },
  { name: "Grape Gasoline", brand: "Remexian", type: "indica", avg_thc: 31.0, genetics: "Grape Pie x Jet Fuel Gelato", indications: ["Schwere Schmerzen", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.3}, {name: "Caryophyllene", percent: 0.7}, {name: "Limonene", percent: 0.4}] }
];

async function importBatch4() {
  console.log('--- Importing Medical Batch #4 ---');
  for (const s of MEDICAL_BATCH_4) {
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

importBatch4();
