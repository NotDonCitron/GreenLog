import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_11 = [
  // Remexian
  { name: "Grape Galena", brand: "Remexian", type: "indica", avg_thc: 31.7, genetics: "OG Kush x Lost Sailor", indications: ["Schwere Schmerzen", "Insomnie"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Caryophyllene", percent: 0.8}] },
  { name: "Golden State Kush", brand: "Remexian", type: "indica", avg_thc: 33.0, genetics: "Unknown Kush variant", indications: ["Chronische Schmerzen", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.4}, {name: "Limonene", percent: 0.6}] },
  { name: "Chocolate Kush", brand: "Remexian", type: "indica", avg_thc: 27.0, genetics: "Mazar x Unknown Kush", indications: ["Spastik", "Schmerz"], terpenes: [{name: "Caryophyllene", percent: 0.9}, {name: "Myrcene", percent: 0.7}] },
  { name: "Munyunz", brand: "Remexian", type: "hybrid", avg_thc: 27.0, genetics: "Unknown Hybrid", indications: ["Stress", "Angst"], terpenes: [{name: "Limonene", percent: 1.1}, {name: "Caryophyllene", percent: 0.5}] },
  { name: "Pink Punch", brand: "Remexian", type: "hybrid", avg_thc: 24.0, genetics: "Pink Kush x Purple Punch", indications: ["Angst", "Depression"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Myrcene", percent: 0.4}] },
  
  // 420 Pharma
  { name: "Scented Marker", brand: "420 Pharma", type: "indica", avg_thc: 33.0, genetics: "Permanent Marker x Unknown", indications: ["Schwere Schmerzen", "Insomnie"], terpenes: [{name: "Caryophyllene", percent: 1.2}, {name: "Limonene", percent: 0.8}] },
  
  // Demecan
  { name: "Sugar Cake", brand: "Demecan", type: "hybrid", avg_thc: 31.0, genetics: "Divorce Cake x Wedding Cake", indications: ["Schmerz", "Appetitlosigkeit"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Caryophyllene", percent: 0.7}] },
  { name: "Facetz", brand: "Demecan", type: "hybrid", avg_thc: 25.0, genetics: "Unknown Hybrid", indications: ["Stress", "Angst"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Myrcene", percent: 0.5}] },
  { name: "Gelato OG", brand: "Demecan", type: "indica", avg_thc: 22.0, genetics: "Gelato x OG Kush", indications: ["Schlafstörungen", "Schmerz"], terpenes: [{name: "Myrcene", percent: 1.1}, {name: "Limonene", percent: 0.4}] },
  
  // enua
  { name: "Lemonade Haze", brand: "enua", type: "sativa", avg_thc: 30.0, genetics: "Lemon Skunk x Super Silver Haze variant", indications: ["ADHS", "Erschöpfung"], terpenes: [{name: "Terpinolene", percent: 1.3}, {name: "Limonene", percent: 0.6}] },
  { name: "God Cherry Bud", brand: "enua", type: "indica", avg_thc: 22.0, genetics: "God Bud x Cherry Pie", indications: ["Schmerz", "Übelkeit"], terpenes: [{name: "Myrcene", percent: 0.9}, {name: "Caryophyllene", percent: 0.5}] },
  { name: "Pineapple God", brand: "enua", type: "hybrid", avg_thc: 29.0, genetics: "God Bud x Pineapple variant", indications: ["Stress", "Depression"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Limonene", percent: 0.5}] },
  
  // Cantourage
  { name: "Facade", brand: "Cantourage", type: "hybrid", avg_thc: 30.0, genetics: "Unknown Premium Cross", indications: ["Schwere Schmerzen", "Stress"], terpenes: [{name: "Limonene", percent: 1.1}, {name: "Caryophyllene", percent: 0.8}] },
  { name: "Alien Kush Mintz", brand: "Cantourage", type: "hybrid", avg_thc: 28.0, genetics: "Alien Kush x Kush Mints", indications: ["Schmerz", "Angst"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Caryophyllene", percent: 0.7}] },
  { name: "Cali Rain", brand: "Cantourage", type: "hybrid", avg_thc: 25.0, genetics: "Unknown Cali Cross", indications: ["Depression", "Stress"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Limonene", percent: 0.6}] },
  { name: "Liberty Haze", brand: "Cantourage", type: "sativa", avg_thc: 22.0, genetics: "G13 x Chem Dawg 91", indications: ["ADHS", "Depression"], terpenes: [{name: "Terpinolene", percent: 0.9}, {name: "Limonene", percent: 0.4}] }
];

async function importBatch11() {
  console.log('--- Importing Medical Batch #11 ---');
  for (const s of MEDICAL_BATCH_11) {
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
      description: `Medizinisches Cannabis von ${s.brand} (Release 2026). Genetik: ${s.genetics}. Indikationen: ${s.indications.join(', ')}.`
    }, { onConflict: 'slug' });
  }
  console.log('DONE!');
}

importBatch11();
