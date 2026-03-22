import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_5 = [
  // Cannamedical
  { name: "Creamy Kee’s", brand: "Cannamedical", type: "hybrid", avg_thc: 24.0, genetics: "Kee’s Old School Haze x Cupcake", indications: ["Depression", "Chronische Schmerzen"], terpenes: [{name: "Limonene", percent: 0.8}, {name: "Caryophyllene", percent: 0.6}, {name: "Myrcene", percent: 0.4}] },
  { name: "El Gringo", brand: "Cannamedical", type: "indica", avg_thc: 22.0, genetics: "Unknown Indica Cross", indications: ["Schlafstörungen", "Angst"], terpenes: [{name: "Myrcene", percent: 1.1}, {name: "Humulene", percent: 0.4}, {name: "Linalool", percent: 0.3}] },
  { name: "Ceres", brand: "Cannamedical", type: "sativa", avg_thc: 20.0, genetics: "Sativa dominant variant", indications: ["ADHS", "Fokus"], terpenes: [{name: "Terpinolene", percent: 0.7}, {name: "Pinene", percent: 0.5}, {name: "Limonene", percent: 0.3}] },
  
  // 420 Pharma
  { name: "Wedding Cake", brand: "420 Pharma", type: "hybrid", avg_thc: 25.0, genetics: "Triangle Kush x Animal Mints", indications: ["Schmerz", "Stress"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Caryophyllene", percent: 0.7}, {name: "Myrcene", percent: 0.4}] },
  { name: "Star Struck", brand: "420 Pharma", type: "hybrid", avg_thc: 24.0, genetics: "Stardawg x Unknown", indications: ["Depression", "Übelkeit"], terpenes: [{name: "Caryophyllene", percent: 0.8}, {name: "Myrcene", percent: 0.6}, {name: "Limonene", percent: 0.4}] },
  { name: "Spiced Earth Kush", brand: "420 Pharma", type: "indica", avg_thc: 27.0, genetics: "Unknown Kush variant", indications: ["Schwere Schmerzen", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Caryophyllene", percent: 0.6}, {name: "Humulene", percent: 0.3}] },
  
  // Cantourage
  { name: "Together", brand: "Cantourage", type: "hybrid", avg_thc: 20.0, genetics: "Varying Cross", indications: ["Stress", "Angst"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Limonene", percent: 0.5}, {name: "Pinene", percent: 0.2}] },
  { name: "Grow", brand: "Cantourage", type: "indica", avg_thc: 22.0, genetics: "Indica dominant", indications: ["Schlafstörungen", "Schmerz"], terpenes: [{name: "Myrcene", percent: 1.0}, {name: "Caryophyllene", percent: 0.5}, {name: "Linalool", percent: 0.3}] },
  
  // Demecan
  { name: "Demecan Typ 1", brand: "Demecan", type: "indica", avg_thc: 20.0, genetics: "Unknown German Cultivar", indications: ["Schmerz", "Spastik"], terpenes: [{name: "Myrcene", percent: 0.9}, {name: "Caryophyllene", percent: 0.5}, {name: "Limonene", percent: 0.3}] },
  { name: "Demecan Typ 2", brand: "Demecan", type: "hybrid", avg_thc: 18.0, genetics: "Unknown German Cultivar", indications: ["Stress", "ADHS"], terpenes: [{name: "Limonene", percent: 0.7}, {name: "Myrcene", percent: 0.5}, {name: "Pinene", percent: 0.3}] }
];

async function importBatch5() {
  console.log('--- Importing Medical Batch #5 ---');
  for (const s of MEDICAL_BATCH_5) {
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

importBatch5();
