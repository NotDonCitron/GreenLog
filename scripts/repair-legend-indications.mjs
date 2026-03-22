import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const LEGEND_INDICATIONS = {
  'godfather-og': ['Schlafstörungen', 'Chronische Schmerzen', 'Stress'],
  'animal-face': ['Angstzustände', 'Depression', 'Appetitlosigkeit'],
  'gmo-cookies': ['Chronische Schmerzen', 'Entzündungen', 'Übelkeit'],
  'gelato-33': ['Stress', 'Depression', 'Muskelspasmen'],
  'sour-diesel': ['Erschöpfung', 'Depression', 'ADHS'],
  'durban-poison': ['Übelkeit', 'Erschöpfung', 'Migräne'],
  'white-widow': ['Schmerzen', 'Stress', 'Schlafstörungen'],
  'og-kush': ['Angstzustände', 'Schmerz', 'Schlaf'],
  'jack-herer': ['ADHS', 'Erschöpfung', 'Depression'],
  'purple-haze': ['Depression', 'Stress', 'Übelkeit'],
  'amnesia-haze': ['ADHS', 'Erschöpfung', 'Stress'],
  'blueberry': ['Schlafstörungen', 'Muskelkrämpfe', 'Angst'],
  'gdp': ['Insomnie', 'Schwere Schmerzen', 'Appetitlosigkeit'],
  'acapulco-gold': ['Depression', 'Erschöpfung', 'Stress'],
  'skywalker-og': ['Schlafstörungen', 'Chronische Schmerzen', 'Angst'],
  'green-crack': ['Erschöpfung', 'ADHS', 'Depression'],
  'bruce-banner': ['Erschöpfung', 'Schmerz', 'Stress'],
  'northern-lights': ['Schlafstörungen', 'Muskelspasmen', 'Angst'],
  'blue-dream-pro': ['Übelkeit', 'Depression', 'Schmerz'],
  'pineapple-express': ['Stress', 'Depression', 'Übelkeit']
};

async function repair() {
  console.log('--- Repairing Legend Indications ---');
  for (const [slug, indications] of Object.entries(LEGEND_INDICATIONS)) {
    console.log(`Updating ${slug}...`);
    await supabase.from('strains').update({ indications }).eq('slug', slug);
  }
  console.log('DONE!');
}

repair();
