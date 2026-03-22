import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_7 = [
  // Cannamedical
  { name: "El Jefe", brand: "Cannamedical", type: "indica", avg_thc: 24.0, genetics: "Abusive OG x Rare Dankness #1", indications: ["Schwere Schmerzen", "Insomnie"], terpenes: [{name: "Myrcene", percent: 1.1}, {name: "Caryophyllene", percent: 0.7}] },
  { name: "Pink Gas", brand: "Cannamedical", type: "indica", avg_thc: 27.0, genetics: "Bubba Kush variant", indications: ["Schlaf", "Spastik"], terpenes: [{name: "Myrcene", percent: 1.3}, {name: "Limonene", percent: 0.5}] },
  { name: "Ghost Train Haze CM", brand: "Cannamedical", type: "sativa", avg_thc: 22.0, genetics: "Ghost OG x Neville's Wreck", indications: ["ADHS", "Depression"], terpenes: [{name: "Terpinolene", percent: 0.9}, {name: "Pinene", percent: 0.4}] },
  
  // Four 20 Pharma
  { name: "Buckin' Runtz", brand: "420 Pharma", type: "hybrid", avg_thc: 28.0, genetics: "Jet Fuel Gelato x Runtz", indications: ["Stress", "Schmerz"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Caryophyllene", percent: 0.8}] },
  { name: "Plum Driver Pro", brand: "420 Pharma", type: "hybrid", avg_thc: 27.0, genetics: "Sundae Driver x Purple Punch", indications: ["Angst", "Depression"], terpenes: [{name: "Linalool", percent: 0.6}, {name: "Limonene", percent: 0.7}] },
  
  // Avaay
  { name: "Black Krush", brand: "Avaay", type: "indica", avg_thc: 21.0, genetics: "Blackberry Kush x Unknown", indications: ["Schlafstörungen", "Angst"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Caryophyllene", percent: 0.5}] },
  { name: "Peyote Critical", brand: "Avaay", type: "indica", avg_thc: 23.0, genetics: "Peyote Purple x Critical Kush", indications: ["Schmerz", "Entspannung"], terpenes: [{name: "Myrcene", percent: 1.0}, {name: "Limonene", percent: 0.4}] },
  
  // Grünhorn
  { name: "GOC", brand: "Grünhorn", type: "hybrid", avg_thc: 24.0, genetics: "Glueberry OG", indications: ["Schmerz", "Appetitlosigkeit"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Caryophyllene", percent: 0.6}] },
  { name: "MAC Grünhorn", brand: "Grünhorn", type: "hybrid", avg_thc: 25.0, genetics: "Alien Cookies x Colombian x Starfighter", indications: ["Stress", "Depression"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Pinene", percent: 0.5}] },
  
  // Peace Naturals
  { name: "Wedding Cake PN", brand: "Peace Naturals", type: "hybrid", avg_thc: 31.0, genetics: "Triangle Kush x Animal Mints", indications: ["Schwere Schmerzen", "Insomnie"], terpenes: [{name: "Limonene", percent: 1.2}, {name: "Caryophyllene", percent: 0.9}] },
  { name: "GMO PN", brand: "Peace Naturals", type: "indica", avg_thc: 31.0, genetics: "Chemdawg x Girl Scout Cookies", indications: ["Insomnie", "Schmerz"], terpenes: [{name: "Caryophyllene", percent: 1.4}, {name: "Myrcene", percent: 1.0}] },
  
  // Tilray
  { name: "Tilray THC25 Master Kush", brand: "Tilray", type: "indica", avg_thc: 25.0, genetics: "Hindu Kush x Skunk #1", indications: ["Schmerz", "Schlaf"], terpenes: [{name: "Myrcene", percent: 0.9}, {name: "Limonene", percent: 0.5}] },
  { name: "Tilray THC22 Headband", brand: "Tilray", type: "hybrid", avg_thc: 22.0, genetics: "OG Kush x Sour Diesel", indications: ["Angst", "Stress"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Limonene", percent: 0.6}] },
  
  // Pedanios (Aurora)
  { name: "Pedanios 16/1 Tangerine Dream", brand: "Pedanios", type: "sativa", avg_thc: 16.0, genetics: "G13 x Afghan x Neville's A5 Haze", indications: ["Depression", "Erschöpfung"], terpenes: [{name: "Limonene", percent: 0.7}, {name: "Myrcene", percent: 0.4}] },
  { name: "Aurora Typ 1 Island Sweet Skunk", brand: "Aurora", type: "sativa", avg_thc: 20.0, genetics: "Sweet Skunk x White Widow", indications: ["ADHS", "Depression"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Pinene", percent: 0.4}] }
];

async function importBatch7() {
  console.log('--- Importing Medical Batch #7 ---');
  for (const s of MEDICAL_BATCH_7) {
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

importBatch7();
