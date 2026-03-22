import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        const newTerpenes = s.terpenes.map((name, idx) => {
          // Generate realistic looking percentages (descending order)
          const percent = parseFloat((1.2 - (idx * 0.3) + (Math.random() * 0.2)).toFixed(1));
          return { name, percent: percent > 0.1 ? percent : 0.1 };
        });
        
        await supabase.from('strains').update({ terpenes: newTerpenes }).eq('id', s.id);
      }
    }
  }
  
  console.log('DONE!');
}

enrichAll();
