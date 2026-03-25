import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_14 = [
  // Green Karat
  { name: "Pavé S1", brand: "Green Karat", type: "hybrid", avg_thc: 27.0, genetics: "The Menthol x Paris OG", indications: ["Schmerz", "Appetitlosigkeit"], terpenes: [{name: "Limonene", percent: 1.1}, {name: "Linalool", percent: 0.5}] },
  { name: "Modified Gas", brand: "Green Karat", type: "hybrid", avg_thc: 28.0, genetics: "First Class Funk x Grape Gasoline", indications: ["Schwere Schmerzen", "Insomnie"], terpenes: [{name: "Caryophyllene", percent: 1.2}, {name: "Myrcene", percent: 0.8}] },
  
  // LOT 420
  { name: "Platinum Pavé", brand: "LOT 420", type: "hybrid", avg_thc: 29.0, genetics: "Pavé variant", indications: ["Stress", "Depression"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Caryophyllene", percent: 0.7}] },
  { name: "Gelato 33 LOT", brand: "LOT 420", type: "hybrid", avg_thc: 25.0, genetics: "Sunset Sherbet x Thin Mint GSC", indications: ["Angst", "Chronischer Schmerz"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Myrcene", percent: 0.6}] },
  
  // Pure Sunfarms
  { name: "Purple Fog", brand: "Pure Sunfarms", type: "indica", avg_thc: 24.0, genetics: "Unknown Indica Cross", indications: ["Schlafstörungen", "Stress"], terpenes: [{name: "Myrcene", percent: 1.3}, {name: "Pinene", percent: 0.4}] },
  { name: "Alien Pebbles", brand: "Pure Sunfarms", type: "hybrid", avg_thc: 22.0, genetics: "Alien OG x Fruity Pebbles", indications: ["Übelkeit", "Depression"], terpenes: [{name: "Limonene", percent: 0.8}, {name: "Caryophyllene", percent: 0.5}] },
  { name: "Pink Kush PSF", brand: "Pure Sunfarms", type: "indica", avg_thc: 20.0, genetics: "OG Kush variant", indications: ["Schmerz", "Entspannung"], terpenes: [{name: "Myrcene", percent: 1.1}, {name: "Caryophyllene", percent: 0.6}] },
  
  // Avaay / Khalifa Kush
  { name: "Khalifa Kush", brand: "Avaay", type: "hybrid", avg_thc: 26.0, genetics: "OG Kush variant", indications: ["Stress", "Chronischer Schmerz"], terpenes: [{name: "Limonene", percent: 1.2}, {name: "Myrcene", percent: 0.7}] },
  
  // 420 Pharma / Compound Genetics
  { name: "Stay Puft", brand: "420 Pharma", type: "hybrid", avg_thc: 27.0, genetics: "Marshmallow OG x Grape Gas", indications: ["Schmerz", "Schlaf"], terpenes: [{name: "Caryophyllene", percent: 1.0}, {name: "Limonene", percent: 0.8}] },
  
  // Cantourage / Village Bloomery
  { name: "Village Bloomery Craft", brand: "Cantourage", type: "hybrid", avg_thc: 25.0, genetics: "Hand selected Craft Cross", indications: ["Angst", "Stress"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Linalool", percent: 0.4}] }
];

async function importBatch14() {
  console.log('--- Importing Medical Batch #14 (Craft Selection) ---');
  for (const s of MEDICAL_BATCH_14) {
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
      avg_cbd: s.avg_cbd || null,
      genetics: s.genetics,
      indications: s.indications,
      terpenes: s.terpenes,
      image_url: imageUrl,
      is_medical: true,
      description: `Premium Craft Medizinalcannabis von ${s.brand}. Genetik: ${s.genetics}. Indikationen: ${s.indications.join(', ')}.`
    }, { onConflict: 'slug' });
  }
  console.log('DONE!');
}

importBatch14();
