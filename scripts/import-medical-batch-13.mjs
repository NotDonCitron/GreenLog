import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_13 = [
  // Demecan Craft
  { name: "Magic Marker", brand: "Demecan", type: "hybrid", avg_thc: 28.0, genetics: "Permanent Marker #2", indications: ["Schmerz", "Stress"], terpenes: [{name: "Limonene", percent: 1.1}, {name: "Caryophyllene", percent: 0.8}] },
  { name: "Sky Pie", brand: "Demecan", type: "indica", avg_thc: 25.0, genetics: "Unknown Pie Cross", indications: ["Schlafstörungen", "Angst"], terpenes: [{name: "Myrcene", percent: 1.2}, {name: "Limonene", percent: 0.5}] },
  { name: "Black Marker", brand: "Demecan", type: "hybrid", avg_thc: 31.0, genetics: "Permanent Marker variant", indications: ["Schwere Schmerzen", "Insomnie"], terpenes: [{name: "Caryophyllene", percent: 1.3}, {name: "Myrcene", percent: 0.9}] },
  
  // Demecan Core
  { name: "Jelly Mints", brand: "Demecan", type: "hybrid", avg_thc: 28.0, genetics: "Unknown", indications: ["Stress", "Schmerz"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Caryophyllene", percent: 0.7}] },
  { name: "Grapes and Cream", brand: "Demecan", type: "hybrid", avg_thc: 25.0, genetics: "Grape Pie x Cookies and Cream", indications: ["Angstzustände", "Depression"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Linalool", percent: 0.4}] },
  
  // Good Supply (Tilray)
  { name: "Beach Crasher", brand: "Tilray", type: "hybrid", avg_thc: 25.0, genetics: "Wedding Crasher variant", indications: ["Stress", "Schmerz"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Caryophyllene", percent: 0.6}] },
  { name: "Sugar Cake", brand: "Tilray", type: "indica", avg_thc: 28.0, genetics: "Divorce Cake x Wedding Cake", indications: ["Schlaf", "Spastik"], terpenes: [{name: "Myrcene", percent: 1.1}, {name: "Caryophyllene", percent: 0.5}] },
  { name: "Wedding Pie", brand: "Tilray", type: "indica", avg_thc: 28.0, genetics: "Wedding Cake x Grape Pie", indications: ["Chronische Schmerzen", "Insomnie"], terpenes: [{name: "Myrcene", percent: 1.3}, {name: "Limonene", percent: 0.4}] },
  { name: "Lemon Hash Ghost", brand: "Tilray", type: "sativa", avg_thc: 22.0, genetics: "Ghost OG variant", indications: ["ADHS", "Depression"], terpenes: [{name: "Terpinolene", percent: 0.8}, {name: "Limonene", percent: 0.5}] },
  
  // Grünhorn
  { name: "Tiger Cake", brand: "Grünhorn", type: "indica", avg_thc: 30.0, genetics: "Layer Cake x The Menthol", indications: ["Schwerer Schmerz", "Schlaf"], terpenes: [{name: "Myrcene", percent: 1.4}, {name: "Caryophyllene", percent: 0.8}] },
  { name: "Afina", brand: "Grünhorn", type: "sativa", avg_thc: 22.0, genetics: "Jack Herer variant", indications: ["Depression", "Erschöpfung"], terpenes: [{name: "Terpinolene", percent: 0.9}, {name: "Pinene", percent: 0.4}] },
  
  // Trendy
  { name: "Apples and Bananas", brand: "Craft", type: "hybrid", avg_thc: 27.0, genetics: "[(Platinum Cookies x GDP) x Blue Power] x Gelati", indications: ["Schmerz", "Appetitlosigkeit"], terpenes: [{name: "Myrcene", percent: 1.0}, {name: "Limonene", percent: 0.7}] },
  { name: "RS11", brand: "Strong Drop", type: "hybrid", avg_thc: 26.0, genetics: "Pink Guava x OZ Kush", indications: ["Stress", "Depression"], terpenes: [{name: "Limonene", percent: 1.1}, {name: "Caryophyllene", percent: 0.6}] }
];

async function importBatch13() {
  console.log('--- Importing Medical Batch #13 (Final 200+) ---');
  for (const s of MEDICAL_BATCH_13) {
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

importBatch13();
