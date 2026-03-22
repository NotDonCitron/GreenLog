import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ENRICH_DATA = {
  '420-pharma-bling-blaow': {
    terpenes: [
      { name: 'Limonene', percent: 0.9 },
      { name: 'Caryophyllene', percent: 0.7 },
      { name: 'Linalool', percent: 0.2 }
    ],
    manufacturer: '420 Pharma'
  },
  'aurora-farm-gas': {
    terpenes: [
      { name: 'Myrcene', percent: 1.1 },
      { name: 'Limonene', percent: 0.6 },
      { name: 'Caryophyllene', percent: 0.5 }
    ],
    manufacturer: 'Aurora'
  },
  'aurora-sourdough': {
    terpenes: [
      { name: 'Myrcene', percent: 0.8 },
      { name: 'Caryophyllene', percent: 0.6 },
      { name: 'Limonene', percent: 0.4 }
    ],
    manufacturer: 'Aurora'
  }
};

async function enrich() {
  console.log('--- Enriching Medical Data with Percentages ---');
  for (const [slug, data] of Object.entries(ENRICH_DATA)) {
    console.log(`Enriching ${slug}...`);
    await supabase.from('strains').update(data).eq('slug', slug);
  }
  console.log('DONE!');
}

enrich();
