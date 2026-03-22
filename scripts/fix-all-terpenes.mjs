import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const LEGEND_TERPENES = {
  'godfather-og': ['Myrcene', 'Limonene', 'Caryophyllene'],
  'animal-face': ['Myrcene', 'Caryophyllene', 'Limonene'],
  'gmo-cookies': ['Caryophyllene', 'Myrcene', 'Limonene'],
  'gelato-33': ['Limonene', 'Caryophyllene', 'Myrcene'],
  'sour-diesel': ['Caryophyllene', 'Myrcene', 'Limonene'],
  'durban-poison': ['Terpinolene', 'Myrcene', 'Ocimene'],
  'white-widow': ['Myrcene', 'Caryophyllene', 'Pinene'],
  'og-kush': ['Myrcene', 'Limonene', 'Caryophyllene'],
  'jack-herer': ['Terpinolene', 'Caryophyllene', 'Pinene'],
  'purple-haze': ['Myrcene', 'Caryophyllene', 'Pinene'],
  'amnesia-haze': ['Myrcene', 'Limonene', 'Caryophyllene'],
  'blueberry': ['Myrcene', 'Caryophyllene', 'Pinene'],
  'gdp': ['Myrcene', 'Caryophyllene', 'Pinene'],
  'acapulco-gold': ['Myrcene', 'Caryophyllene', 'Limonene'],
  'skywalker-og': ['Myrcene', 'Limonene', 'Caryophyllene'],
  'green-crack': ['Myrcene', 'Caryophyllene', 'Limonene'],
  'bruce-banner': ['Myrcene', 'Caryophyllene', 'Limonene'],
  'northern-lights': ['Myrcene', 'Caryophyllene', 'Pinene'],
  'blue-dream-pro': ['Myrcene', 'Pinene', 'Caryophyllene'],
  'pineapple-express': ['Caryophyllene', 'Myrcene', 'Limonene']
};

async function fix() {
  console.log('--- Fixing All Terpenes ---');
  for (const [slug, terpenes] of Object.entries(LEGEND_TERPENES)) {
    console.log(`Updating ${slug}...`);
    await supabase.from('strains').update({ terpenes }).eq('slug', slug);
  }
  console.log('DONE!');
}

fix();
