import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3anl2dnZ5a3l1ZXV4dGRrc2NzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEwMTgwMSwiZXhwIjoyMDg5Njc3ODAxfQ.WFSRK9odYYJacA-aT5zM6mhQqhUrWj8jZXREdcb9VcI';
const strainCompassKey = 'sc_8fd6efef26dd1863d66129881d2e62290515b9de034ac8a6';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchStrains() {
  const response = await fetch('https://straincompass.com/api/strains?limit=100');
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data.strains || [];
}

async function importStrains() {
  console.log('Fetching strains from StrainCompass...');
  const strains = await fetchStrains();
  console.log(`Fetched ${strains.length} strains`);

  let imported = 0;
  for (const strain of strains) {
    // Check for duplicates by slug
    const { data: existing } = await supabase
      .from('strains')
      .select('id')
      .eq('slug', strain.slug);

    if (existing && existing.length > 0) {
      console.log(`Skipping duplicate: ${strain.name}`);
      continue;
    }

    const insertData = {
      name: strain.name,
      slug: strain.slug,
      type: strain.type.toLowerCase(),
      description: '', // API hat keine description
      thc_min: null,
      thc_max: strain.thcMax || null,
      cbd_min: null,
      cbd_max: strain.cbdMax || null,
      terpenes: strain.terpenes ? strain.terpenes.map(t => t.name) : [],
      flavors: strain.flavors ? strain.flavors.map(f => f.name) : [],
      effects: strain.effects ? strain.effects.map(e => e.name) : [],
      image_url: null, // API hat keine image_url
      publication_status: 'draft',
      primary_source: 'StrainCompass'
    };

    const { error } = await supabase.from('strains').insert(insertData);
    if (error) {
      console.error(`Error importing ${strain.name}:`, error.message);
    } else {
      imported++;
      console.log(`Imported: ${strain.name}`);
    }
  }

  console.log(`Successfully imported ${imported} strains`);
}

importStrains().catch(console.error);