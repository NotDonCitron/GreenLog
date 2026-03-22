import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_12 = [
  // Huala
  { name: "Black Triangle", brand: "Huala", type: "indica", avg_thc: 22.0, genetics: "Triangle Kush x '88 G13 Hashplant", indications: ["Schmerz", "Kiefer-Entspannung"], terpenes: [{name: "Myrcene", percent: 1.0}, {name: "Pinene", percent: 0.4}] },
  { name: "Grape Face", brand: "Huala", type: "hybrid", avg_thc: 22.0, genetics: "Grape Ape x Face Off OG", indications: ["Stress", "Schmerz"], terpenes: [{name: "Caryophyllene", percent: 0.8}, {name: "Myrcene", percent: 0.6}] },
  
  // 420 Evolution
  { name: "Star Struck", brand: "420 Pharma", type: "sativa", avg_thc: 27.0, genetics: "Stardawg variant", indications: ["Depression", "Übelkeit"], terpenes: [{name: "Limonene", percent: 1.1}, {name: "Myrcene", percent: 0.5}] },
  { name: "Frozen Lemon Mints", brand: "420 Pharma", type: "sativa", avg_thc: 27.0, genetics: "Lemon Mints variant", indications: ["Fokus", "Erschöpfung"], terpenes: [{name: "Terpinolene", percent: 1.2}, {name: "Limonene", percent: 0.6}] },
  { name: "Peach Chementine", brand: "420 Pharma", type: "sativa", avg_thc: 30.0, genetics: "Peach variant x Chemdawg", indications: ["Depression", "Chronische Schmerzen"], terpenes: [{name: "Limonene", percent: 1.3}, {name: "Caryophyllene", percent: 0.7}] },
  
  // Cannatrek (Australia)
  { name: "Topaz", brand: "Cannatrek", type: "indica", avg_thc: 25.0, genetics: "Kush Cookies", indications: ["Schlafstörungen", "Schwere Schmerzen"], terpenes: [{name: "Caryophyllene", percent: 1.0}, {name: "Myrcene", percent: 0.8}] },
  { name: "Daylesford", brand: "Cannatrek", type: "indica", avg_thc: 20.0, genetics: "Death Bubba", indications: ["Insomnie", "Muskelspasmen"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Caryophyllene", percent: 0.6}] },
  
  // Vayamed
  { name: "Balanced Sweet Skunk", brand: "Vayamed", type: "hybrid", avg_thc: 10.0, avg_cbd: 10.0, genetics: "Sweet Skunk x Cannatonic", indications: ["Angst", "Entzündungen"], terpenes: [{name: "Myrcene", percent: 0.7}, {name: "Pinene", percent: 0.3}] },
  
  // Additional 420 Pharma
  { name: "Peach Chementine 30", brand: "420 Pharma", type: "sativa", avg_thc: 30.0, genetics: "Peach x Chemdawg", indications: ["Chronischer Schmerz", "Depression"], terpenes: [{name: "Limonene", percent: 1.4}, {name: "Myrcene", percent: 0.6}] },
  { name: "Ice Cream Cake Kush Mints", brand: "420 Pharma", type: "hybrid", avg_thc: 30.0, genetics: "Wedding Cake x Gelato 33 x Kush Mints", indications: ["Schmerz", "Schlaf"], terpenes: [{name: "Limonene", percent: 1.1}, {name: "Caryophyllene", percent: 0.9}] },
  
  // More Huala
  { name: "Alien Mints 27", brand: "Huala", type: "hybrid", avg_thc: 27.0, genetics: "Alien Cookies x Kush Mints", indications: ["Stress", "Angst"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Caryophyllene", percent: 0.7}] },
  { name: "Spiced Earth Kush", brand: "Huala", type: "indica", avg_thc: 27.0, genetics: "Unknown Kush", indications: ["Schmerz", "Entspannung"], terpenes: [{name: "Myrcene", percent: 1.1}, {name: "Humulene", percent: 0.4}] }
];

async function importBatch12() {
  console.log('--- Importing Medical Batch #12 ---');
  for (const s of MEDICAL_BATCH_12) {
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
      description: `Spezialisierte Medizinalcannabis-Blüten von ${s.brand}. Genetik: ${s.genetics}. Indikationen: ${s.indications.join(', ')}.`
    }, { onConflict: 'slug' });
  }
  console.log('DONE!');
}

importBatch12();
