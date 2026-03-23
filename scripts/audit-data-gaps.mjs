import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function audit() {
  console.log("📊 ANALYSIERE DATENBANK AUF LÜCKEN...");

  const { data: strains, error } = await supabase.from('strains').select('*');
  if (error) {
    console.error(error);
    return;
  }

  const stats = {
    total: strains.length,
    no_thc: 0,
    no_cbd: 0,
    no_genetics: 0,
    no_indications_med: 0,
    no_flavors: 0,
    no_terpenes: 0,
    short_description: 0,
    is_medical_count: 0,
    no_image: 0
  };

  const gapList = [];

  strains.forEach(st => {
    let hasGap = false;
    const gaps = [];

    if (st.is_medical) stats.is_medical_count++;

    if (!st.thc_min && !st.thc_max) {
      stats.no_thc++;
      gaps.push("THC");
      hasGap = true;
    }
    if (!st.cbd_min && !st.cbd_max) {
      stats.no_cbd++;
    }
    if (!st.genetics || st.genetics === 'Unbekannt') {
      stats.no_genetics++;
      gaps.push("Genetik");
      hasGap = true;
    }
    if (st.is_medical && (!st.indications || st.indications.length === 0)) {
      stats.no_indications_med++;
      gaps.push("Med-Indikationen");
      hasGap = true;
    }
    if (!st.flavors || st.flavors.length === 0) {
      stats.no_flavors++;
      gaps.push("Flavors");
      hasGap = true;
    }
    if (!st.terpenes || st.terpenes.length === 0) {
      stats.no_terpenes++;
      gaps.push("Terpene");
      hasGap = true;
    }
    if (!st.description || st.description.length < 50) {
      stats.short_description++;
      gaps.push("Beschreibung");
      hasGap = true;
    }
    if (!st.image_url) {
        stats.no_image++;
        gaps.push("Bild");
        hasGap = true;
    }

    if (hasGap) {
      gapList.push({ name: st.name, gaps: gaps.join(", ") });
    }
  });

  console.log("\n--- STATISTIK ---");
  console.log(`Gesamtanzahl Strains: ${stats.total}`);
  console.log(`Medizinische Strains: ${stats.is_medical_count}`);
  console.log(`Keine THC-Werte:      ${stats.no_thc}`);
  console.log(`Keine CBD-Werte:      ${stats.no_cbd}`);
  console.log(`Keine Genetik:        ${stats.no_genetics}`);
  console.log(`Keine Indikationen (MED): ${stats.no_indications_med}`);
  console.log(`Keine Flavors:        ${stats.no_flavors}`);
  console.log(`Keine Terpene:        ${stats.no_terpenes}`);
  console.log(`Kurze Beschreibung:   ${stats.short_description}`);
  console.log(`Kein Bild:            ${stats.no_image}`);

  console.log("\n--- TOP 20 STRAINS MIT MEISTEN LÜCKEN ---");
  console.table(gapList.slice(0, 20));

  if (gapList.length > 20) {
    console.log(`... und ${gapList.length - 20} weitere.`);
  }
}

audit();
