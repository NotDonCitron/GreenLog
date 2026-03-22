import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_6 = [
  // Avaay
  { name: "Diamond Diamonds", brand: "Avaay", type: "hybrid", avg_thc: 27.0, genetics: "Unknown", indications: ["Schmerz", "Stress"], terpenes: [{name: "Myrcene", percent: 1.0}, {name: "Limonene", percent: 0.6}] },
  { name: "Strawberry Cheesecake", brand: "Avaay", type: "indica", avg_thc: 34.0, genetics: "Chronic x White Widow x Cheese", indications: ["Schwere Schmerzen", "Insomnie"], terpenes: [{name: "Myrcene", percent: 1.4}, {name: "Caryophyllene", percent: 0.8}] },
  { name: "Midnight Mimosa", brand: "Avaay", type: "hybrid", avg_thc: 27.0, genetics: "Mimosa x Unknown", indications: ["Depression", "Angst"], terpenes: [{name: "Limonene", percent: 1.2}, {name: "Linalool", percent: 0.4}] },
  { name: "Waffle Bites", brand: "Avaay", type: "hybrid", avg_thc: 28.0, genetics: "Cereal Milk x Dosidos", indications: ["Stress", "Schmerz"], terpenes: [{name: "Myrcene", percent: 0.9}, {name: "Caryophyllene", percent: 0.7}] },
  { name: "Chatterbox", brand: "Avaay", type: "hybrid", avg_thc: 30.0, genetics: "Unknown", indications: ["Soziale Angst", "Depression"], terpenes: [{name: "Limonene", percent: 1.1}, {name: "Pinene", percent: 0.4}] },
  
  // Canopy / Spectrum / Tweed
  { name: "Platinum OG", brand: "Canopy", type: "indica", avg_thc: 28.0, genetics: "Master Kush x OG Kush", indications: ["Schwere Schmerzen", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Caryophyllene", percent: 0.6}] },
  { name: "Highlands", brand: "Spectrum", type: "indica", avg_thc: 22.0, genetics: "Afghan Kush variant", indications: ["Spastik", "Schmerz"], terpenes: [{name: "Myrcene", percent: 1.0}, {name: "Pinene", percent: 0.3}] },
  { name: "Kush Cookies", brand: "Canopy", type: "indica", avg_thc: 25.0, genetics: "GMO x OG Kush", indications: ["Insomnie", "Schmerz"], terpenes: [{name: "Caryophyllene", percent: 0.9}, {name: "Myrcene", percent: 0.7}] },
  
  // Diverse / Craft
  { name: "Scotti's Cake", brand: "Grünhorn", type: "hybrid", avg_thc: 26.0, genetics: "Biscotti x Gelato 41", indications: ["Schmerz", "Appetitlosigkeit"], terpenes: [{name: "Limonene", percent: 0.8}, {name: "Caryophyllene", percent: 0.7}] },
  { name: "Wedding Cake Amici", brand: "Amici", type: "hybrid", avg_thc: 27.0, genetics: "Triangle Kush x Animal Mints", indications: ["Stress", "Schmerz"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Myrcene", percent: 0.5}] },
  { name: "Lemon Pepper Punch Remexian", brand: "Remexian", type: "hybrid", avg_thc: 31.0, genetics: "Purple Punch x Lemonhead", indications: ["Schmerz", "Depression"], terpenes: [{name: "Limonene", percent: 1.3}, {name: "Caryophyllene", percent: 0.6}] },
  { name: "Chemdawg Remexian", brand: "Remexian", type: "sativa", avg_thc: 33.0, genetics: "Nepalese x Thai", indications: ["ADHS", "Erschöpfung"], terpenes: [{name: "Caryophyllene", percent: 1.1}, {name: "Myrcene", percent: 0.8}] },
  { name: "Gelonade Remexian", brand: "Remexian", type: "hybrid", avg_thc: 27.0, genetics: "Lemon Tree x Gelato 41", indications: ["Stress", "Depression"], terpenes: [{name: "Limonene", percent: 1.2}, {name: "Caryophyllene", percent: 0.5}] },
  { name: "White Widow Remexian", brand: "Remexian", type: "hybrid", avg_thc: 15.0, genetics: "Brazilian Sativa x South Indian Indica", indications: ["Stress", "Schmerz"], terpenes: [{name: "Myrcene", percent: 0.7}, {name: "Pinene", percent: 0.4}] },
  { name: "Grape Gasoline Remexian", brand: "Remexian", type: "indica", avg_thc: 31.0, genetics: "Grape Pie x Jet Fuel Gelato", indications: ["Schmerz", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Caryophyllene", percent: 0.6}] }
];

async function importBatch6() {
  console.log('--- Importing Medical Batch #6 ---');
  for (const s of MEDICAL_BATCH_6) {
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

importBatch6();
