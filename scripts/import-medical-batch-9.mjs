import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_9 = [
  // enua
  { name: "Slick Mintz", brand: "enua", type: "hybrid", avg_thc: 25.0, genetics: "Animal Mints x SinMint Cookies", indications: ["Stress", "Schmerz"], terpenes: [{name: "Limonene", percent: 0.8}, {name: "Caryophyllene", percent: 0.6}] },
  { name: "Strawberry Cake", brand: "enua", type: "indica", avg_thc: 24.0, genetics: "Strawberry Cough x Wedding Cake", indications: ["Angst", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.1}, {name: "Limonene", percent: 0.4}] },
  { name: "Slurricane", brand: "enua", type: "indica", avg_thc: 22.0, genetics: "Do-Si-Dos x Purple Punch", indications: ["Schlafstörungen", "Spastik"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Caryophyllene", percent: 0.5}] },
  { name: "Dark Shadow Haze", brand: "enua", type: "sativa", avg_thc: 22.0, genetics: "Grape Ape x Nevil's Wreck", indications: ["ADHS", "Depression"], terpenes: [{name: "Terpinolene", percent: 0.9}, {name: "Pinene", percent: 0.3}] },
  
  // Cantourage
  { name: "Purple Dog Bud", brand: "Cantourage", type: "hybrid", avg_thc: 20.0, genetics: "Chemdawg 91 x Purple Urkle", indications: ["Stress", "Schmerz"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Caryophyllene", percent: 0.6}] },
  { name: "Kush Mintz Together", brand: "Cantourage", type: "hybrid", avg_thc: 25.0, genetics: "Animal Mints x Bubba Kush", indications: ["Chronische Schmerzen", "Appetitlosigkeit"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Caryophyllene", percent: 0.7}] },
  
  // 420 Pharma (Additional)
  { name: "420 Natural Gorilla Glue", brand: "420 Pharma", type: "hybrid", avg_thc: 22.0, genetics: "Sour Dubb x Chem Sis x Chocolate Diesel", indications: ["Stress", "Schmerzen"], terpenes: [{name: "Caryophyllene", percent: 0.9}, {name: "Myrcene", percent: 0.5}] },
  { name: "420 Natural Wedding Cake", brand: "420 Pharma", type: "hybrid", avg_thc: 25.0, genetics: "Triangle Kush x Animal Mints", indications: ["Schmerz", "Appetitlosigkeit"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Caryophyllene", percent: 0.6}] },
  
  // Aurora
  { name: "Pink Kush Typ 1", brand: "Aurora", type: "indica", avg_thc: 20.0, genetics: "OG Kush variant", indications: ["Angst", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.3}, {name: "Limonene", percent: 0.4}] },
  { name: "Delahaze Typ 2", brand: "Aurora", type: "sativa", avg_thc: 22.0, genetics: "Mango Haze x California Lemon Skunk", indications: ["ADHS", "Erschöpfung"], terpenes: [{name: "Terpinolene", percent: 1.1}, {name: "Limonene", percent: 0.5}] },
  { name: "Pedanios 22/1 Ghost Train Haze", brand: "Aurora", type: "sativa", avg_thc: 22.0, genetics: "Ghost OG x Neville's Wreck", indications: ["Schmerz", "Depression"], terpenes: [{name: "Terpinolene", percent: 1.0}, {name: "Myrcene", percent: 0.4}] },
  
  // Avaay
  { name: "Ocean Grown Cookies", brand: "Avaay", type: "hybrid", avg_thc: 24.0, genetics: "OG Kush x GSC", indications: ["Stress", "Schmerz"], terpenes: [{name: "Myrcene", percent: 0.9}, {name: "Limonene", percent: 0.6}] },
  { name: "Amnesia Haze Cake", brand: "Avaay", type: "sativa", avg_thc: 22.0, genetics: "Amnesia Haze x Wedding Cake", indications: ["Erschöpfung", "Depression"], terpenes: [{name: "Terpinolene", percent: 0.8}, {name: "Limonene", percent: 0.5}] },
  
  // Vayamed
  { name: "Ghost Train Haze Vayamed", brand: "Vayamed", type: "sativa", avg_thc: 20.0, genetics: "Ghost OG x Neville's Wreck", indications: ["ADHS", "Schmerz"], terpenes: [{name: "Terpinolene", percent: 0.9}, {name: "Myrcene", percent: 0.3}] },
  
  // Bathera
  { name: "Fine Cookies", brand: "Bathera", type: "hybrid", avg_thc: 25.0, genetics: "Unknown Cookies Cross", indications: ["Stress", "Angst"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Caryophyllene", percent: 0.6}] },
  { name: "Mac 1 Bathera", brand: "Bathera", type: "hybrid", avg_thc: 25.0, genetics: "Alien Cookies x Colombian x Starfighter", indications: ["Appetitlosigkeit", "Schmerz"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Pinene", percent: 0.4}] }
];

async function importBatch9() {
  console.log('--- Importing Medical Batch #9 ---');
  for (const s of MEDICAL_BATCH_9) {
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

importBatch9();
