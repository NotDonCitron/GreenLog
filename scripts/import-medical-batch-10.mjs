import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_10 = [
  // Spectrum Therapeutics (Canopy Growth)
  { name: "Red No 1", brand: "Spectrum", type: "indica", avg_thc: 20.0, genetics: "Afghan Kush", indications: ["Schmerz", "Spastik"], terpenes: [{name: "Myrcene", percent: 1.0}, {name: "Pinene", percent: 0.3}] },
  { name: "Red No 2", brand: "Spectrum", type: "sativa", avg_thc: 18.0, genetics: "Lemon Skunk", indications: ["Appetitlosigkeit", "Depression"], terpenes: [{name: "Limonene", percent: 0.8}, {name: "Caryophyllene", percent: 0.4}] },
  { name: "Blue", brand: "Spectrum", type: "hybrid", avg_thc: 10.0, avg_cbd: 10.0, genetics: "The Valley", indications: ["Angstzustände", "Entzündungen"], terpenes: [{name: "Myrcene", percent: 0.6}, {name: "Limonene", percent: 0.4}] },
  
  // Cannamedical
  { name: "Tangie Chem", brand: "Cannamedical", type: "sativa", avg_thc: 24.0, genetics: "Tangie x Chemdawg", indications: ["Erschöpfung", "Depression"], terpenes: [{name: "Limonene", percent: 1.1}, {name: "Myrcene", percent: 0.5}] },
  { name: "Banjo", brand: "Cannamedical", type: "hybrid", avg_thc: 22.0, genetics: "Boost x Tangelo", indications: ["Stress", "Schmerz"], terpenes: [{name: "Caryophyllene", percent: 0.9}, {name: "Limonene", percent: 0.6}] },
  { name: "Sky Berry Kush", brand: "Cannamedical", type: "indica", avg_thc: 25.0, genetics: "Skywalker OG x Blueberry", indications: ["Insomnie", "Chronische Schmerzen"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Caryophyllene", percent: 0.7}] },
  { name: "Polar Cookies", brand: "Cannamedical", type: "sativa", avg_thc: 28.0, genetics: "Unknown Cookies variant", indications: ["Schmerz", "Erschöpfung"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Caryophyllene", percent: 0.8}] },
  
  // Vayamed
  { name: "White Widow Vayamed", brand: "Vayamed", type: "hybrid", avg_thc: 18.0, genetics: "Brazilian Sativa x South Indian Indica", indications: ["Stress", "Angst"], terpenes: [{name: "Myrcene", percent: 0.7}, {name: "Caryophyllene", percent: 0.4}] },
  { name: "Equiposa", brand: "Vayamed", type: "hybrid", avg_thc: 10.0, avg_cbd: 10.0, genetics: "Unknown Balanced variant", indications: ["Angst", "Entzündungen"], terpenes: [{name: "Myrcene", percent: 0.6}, {name: "Pinene", percent: 0.3}] },
  
  // Adrexpharma (DrWatson & Wildlife)
  { name: "Tropical Blues", brand: "Adrexpharma", type: "hybrid", avg_thc: 24.0, genetics: "Unknown Hybrid", indications: ["Stress", "Depression"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Linalool", percent: 0.4}] },
  { name: "Tamarindo", brand: "Adrexpharma", type: "hybrid", avg_thc: 22.0, genetics: "Unknown Hybrid", indications: ["Übelkeit", "Schmerz"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Caryophyllene", percent: 0.5}] },
  { name: "Rainbow Fruits", brand: "Adrexpharma", type: "hybrid", avg_thc: 20.0, genetics: "Unknown Hybrid", indications: ["Angst", "Stress"], terpenes: [{name: "Limonene", percent: 0.7}, {name: "Myrcene", percent: 0.4}] },
  { name: "Blackberry Gelato", brand: "Adrexpharma", type: "hybrid", avg_thc: 25.0, genetics: "Blackberry x Gelato", indications: ["Schmerz", "Schlaf"], terpenes: [{name: "Caryophyllene", percent: 1.0}, {name: "Myrcene", percent: 0.8}] },
  { name: "Apes In Space", brand: "Adrexpharma", type: "hybrid", avg_thc: 27.0, genetics: "Falcon 9 x Grease Monkey", indications: ["Schwere Schmerzen", "Insomnie"], terpenes: [{name: "Caryophyllene", percent: 1.1}, {name: "Limonene", percent: 0.7}] },
  
  // Demecan
  { name: "Florida Kush", brand: "Demecan", type: "indica", avg_thc: 25.0, genetics: "LA Kush Cake x TK BX1", indications: ["Schlafstörungen", "Schmerz"], terpenes: [{name: "Limonene", percent: 1.2}, {name: "Caryophyllene", percent: 0.8}] },
  { name: "La Sage Demecan", brand: "Demecan", type: "sativa", avg_thc: 22.0, genetics: "S.A.G.E. x Skunk #1", indications: ["ADHS", "Depression"], terpenes: [{name: "Terpinolene", percent: 0.9}, {name: "Limonene", percent: 0.5}] }
];

async function importBatch10() {
  console.log('--- Importing Medical Batch #10 ---');
  for (const s of MEDICAL_BATCH_10) {
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
      description: `Premium Medizinalcannabis von ${s.brand}. Genetik: ${s.genetics}. Indikationen: ${s.indications.join(', ')}.`
    }, { onConflict: 'slug' });
  }
  console.log('DONE!');
}

importBatch10();
