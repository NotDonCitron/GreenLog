import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3anl2dnZ5a3l1ZXV4dGRrc2NzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEwMTgwMSwiZXhwIjoyMDg5Njc3ODAxfQ.WFSRK9odYYJacA-aT5zM6mhQqhUrWj8jZXREdcb9VcI';
const leefiiKey = 'lf_live_eaj0idj94wamcdeczdw1rpightr692ix';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchStrains() {
  const response = await fetch('https://leefii.com/api/v1/strains?limit=100', {
    headers: {
      'X-API-Key': leefiiKey,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data.data || [];
}

async function importStrains() {
  console.log('Fetching strains from Leefii...');
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

    const validTypes = ['indica', 'sativa', 'hybrid'];
    const strainType = strain.type.toLowerCase();
    if (!validTypes.includes(strainType)) {
      console.log(`Skipping ${strain.name}: invalid type ${strain.type}`);
      return;
    }

    const insertData = {
      name: strain.name,
      slug: strain.slug,
      type: strainType,
      description: strain.description || '',
      thc_min: null,
      thc_max: strain.thc || null,
      cbd_min: null,
      cbd_max: strain.cbd || null,
      terpenes: [], // API hat keine terpenes?
      flavors: strain.flavors || [],
      effects: strain.effects || [],
      image_url: null, // API hat keine image_url
      publication_status: 'draft',
      primary_source: 'Leefii'
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