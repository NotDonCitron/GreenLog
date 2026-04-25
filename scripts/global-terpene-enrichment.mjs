import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DEFAULT_PERCENT_SERIES = [0.9, 0.5, 0.3, 0.2, 0.1, 0.1];

function buildDeterministicPercentages(terpeneNames) {
  return terpeneNames.map((name, idx) => ({
    name,
    percent: DEFAULT_PERCENT_SERIES[idx] ?? 0.1,
  }));
}

async function enrichAll() {
  console.log('--- Global Terpene Enrichment ---');
  
  const { data: strains } = await supabase.from('strains').select('id, name, terpenes');
  
  if (!strains) return;

  for (const s of strains) {
    if (Array.isArray(s.terpenes) && s.terpenes.length > 0) {
      // Check if they are already objects
      const first = s.terpenes[0];
      if (typeof first === 'string') {
        console.log(`Converting ${s.name}...`);
        const newTerpenes = buildDeterministicPercentages(s.terpenes);
        
        await supabase.from('strains').update({ terpenes: newTerpenes }).eq('id', s.id);
      }
    }
  }
  
  console.log('DONE!');
}

enrichAll();
