import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use environment variable

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_STRAINS = [
  { name: "Ghost Train Haze", brand: "Aurora", type: "sativa", avg_thc: 22.5, genetics: "Ghost OG x Neville's Wreck", indications: ["Schmerz", "Depression"], terpenes: [{name: "Terpinolene", percent: 0.8}, {name: "Myrcene", percent: 0.4}, {name: "Limonene", percent: 0.3}] },
  { name: "Delahaze", brand: "Aurora", type: "sativa", avg_thc: 23.0, genetics: "Mango Haze x California Lemon Skunk", indications: ["ADHS", "Erschöpfung"], terpenes: [{name: "Terpinolene", percent: 1.1}, {name: "Limonene", percent: 0.5}, {name: "Pinene", percent: 0.2}] },
  { name: "L.A. Confidential", brand: "Aurora", type: "indica", avg_thc: 21.0, genetics: "OG LA Affie x Afghani", indications: ["Schlafstörungen", "Spastik"], terpenes: [{name: "Myrcene", percent: 0.9}, {name: "Pinene", percent: 0.3}, {name: "Caryophyllene", percent: 0.2}] },
  { name: "Kush Mint", brand: "420 Pharma", type: "hybrid", avg_thc: 26.0, genetics: "Animal Mints x Bubba Kush", indications: ["Chronische Schmerzen", "Appetitlosigkeit"], terpenes: [{name: "Limonene", percent: 0.7}, {name: "Caryophyllene", percent: 0.6}, {name: "Linalool", percent: 0.2}] },
  { name: "Ice Cream Cake", brand: "420 Pharma", type: "indica", avg_thc: 23.5, genetics: "Wedding Cake x Gelato #33", indications: ["Schlaf", "Angst"], terpenes: [{name: "Limonene", percent: 0.8}, {name: "Caryophyllene", percent: 0.5}, {name: "Myrcene", percent: 0.4}] },
  { name: "Gorilla Glue #4", brand: "Cantourage", type: "hybrid", avg_thc: 23.0, genetics: "Sour Dubb x Chem Sis x Chocolate Diesel", indications: ["Stress", "Schmerzen"], terpenes: [{name: "Caryophyllene", percent: 0.9}, {name: "Myrcene", percent: 0.5}, {name: "Limonene", percent: 0.4}] },
  { name: "Bedrocan", brand: "Bedrocan", type: "sativa", avg_thc: 22.0, genetics: "Jack Herer", indications: ["Schmerz", "Übelkeit"], terpenes: [{name: "Terpinolene", percent: 0.7}, {name: "Myrcene", percent: 0.5}, {name: "Pinene", percent: 0.3}] },
  { name: "Pink Kush", brand: "Tilray", type: "indica", avg_thc: 21.0, genetics: "OG Kush variant", indications: ["Angst", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Limonene", percent: 0.4}, {name: "Caryophyllene", percent: 0.3}] },
  { name: "Master Kush", brand: "Tilray", type: "indica", avg_thc: 21.0, genetics: "Hindu Kush x Skunk #1", indications: ["Schmerz", "Entspannung"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Limonene", percent: 0.5}, {name: "Caryophyllene", percent: 0.4}] },
  { name: "Warlock", brand: "Tilray", type: "hybrid", avg_thc: 10.0, genetics: "Skunk x Afghani", indications: ["Angst", "Entzündungen"], terpenes: [{name: "Caryophyllene", percent: 0.6}, {name: "Myrcene", percent: 0.4}, {name: "Limonene", percent: 0.3}] }
];

async function importStrains() {
  console.log('--- Importing Medical Strains (Professional Format) ---');
  
  for (const s of MEDICAL_STRAINS) {
    const nameSlug = s.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const brandSlug = s.brand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const fullSlug = `${brandSlug}-${nameSlug}`;
    const imageUrl = `/strains/${nameSlug}.jpg`;
    
    console.log(`Upserting ${s.name} (${s.brand}) -> slug: ${fullSlug}...`);
    
    const { error } = await supabase.from('strains').upsert({
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
    
    if (error) console.error(`Error with ${s.name}:`, error.message);
  }
  
  console.log('DONE!');
}

importStrains();
