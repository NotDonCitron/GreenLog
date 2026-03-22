import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MEDICAL_BATCH_8 = [
  // Adrexpharma
  { name: "Galax 24/1", brand: "Adrexpharma", type: "hybrid", avg_thc: 24.0, genetics: "Unknown Hybrid", indications: ["Schmerz", "Stress"], terpenes: [{name: "Myrcene", percent: 0.8}, {name: "Limonene", percent: 0.5}] },
  { name: "Bedrocan Alternative", brand: "Adrexpharma", type: "sativa", avg_thc: 22.0, genetics: "Jack Herer", indications: ["Übelkeit", "Appetitlosigkeit"], terpenes: [{name: "Terpinolene", percent: 0.7}, {name: "Pinene", percent: 0.4}] },
  
  // Re:Cannis
  { name: "Re:Cannis 22/1", brand: "Re:Cannis", type: "hybrid", avg_thc: 22.0, genetics: "Varying Cross", indications: ["Stress", "Depression"], terpenes: [{name: "Limonene", percent: 0.9}, {name: "Caryophyllene", percent: 0.6}] },
  
  // Cantourage (Additional partners)
  { name: "Fotmer T3h", brand: "Cantourage", type: "sativa", avg_thc: 22.0, genetics: "Unknown Sativa", indications: ["Erschöpfung", "Depression"], terpenes: [{name: "Terpinolene", percent: 1.1}, {name: "Myrcene", percent: 0.4}] },
  { name: "Together Pharma Glueberry", brand: "Cantourage", type: "hybrid", avg_thc: 24.0, genetics: "Glueberry OG", indications: ["Chronische Schmerzen", "Übelkeit"], terpenes: [{name: "Myrcene", percent: 0.9}, {name: "Caryophyllene", percent: 0.7}] },
  
  // Canopy / Tweed (Remaining)
  { name: "Tweed Houndstooth", brand: "Tweed", type: "sativa", avg_thc: 18.0, genetics: "Super Silver Haze variant", indications: ["ADHS", "Depression"], terpenes: [{name: "Myrcene", percent: 0.7}, {name: "Pinene", percent: 0.5}] },
  { name: "Tweed Penelope", brand: "Tweed", type: "hybrid", avg_thc: 10.0, genetics: "CBD/THC Balanced variant", indications: ["Angstzustände", "Entzündungen"], terpenes: [{name: "Myrcene", percent: 0.6}, {name: "Pinene", percent: 0.4}] },
  
  // 420 Pharma (Additional)
  { name: "PEX Plum Driver", brand: "420 Pharma", type: "hybrid", avg_thc: 27.0, genetics: "Sundae Driver variant", indications: ["Depression", "Schmerz"], terpenes: [{name: "Linalool", percent: 0.4}, {name: "Limonene", percent: 0.7}] },
  { name: "MSP Moonshine Purple", brand: "420 Pharma", type: "hybrid", avg_thc: 30.0, genetics: "Old Moonshine variant", indications: ["Stress", "Schlaf"], terpenes: [{name: "Limonene", percent: 1.0}, {name: "Caryophyllene", percent: 0.6}] },
  
  // Demecan (Additional)
  { name: "Demecan Typ 3", brand: "Demecan", type: "sativa", avg_thc: 22.0, genetics: "Luminarium variant", indications: ["ADHS", "Erschöpfung"], terpenes: [{name: "Terpinolene", percent: 0.8}, {name: "Pinene", percent: 0.3}] }
];

async function importBatch8() {
  console.log('--- Importing Medical Batch #8 ---');
  for (const s of MEDICAL_BATCH_8) {
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

importBatch8();
