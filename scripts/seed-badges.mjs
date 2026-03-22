import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const OFFICIAL_BADGES = [
  { name: "Genesis", description: "Deine allererste Sorte in der Collection geloggt.", rarity: "common", icon_name: "Leaf" },
  { name: "Indica Knight", description: "5 verschiedene Indica-Sorten gesammelt.", rarity: "rare", icon_name: "Moon" },
  { name: "Sativa Scout", description: "5 verschiedene Sativa-Sorten gesammelt.", rarity: "rare", icon_name: "Sun" },
  { name: "Terpene King", description: "Eine Sorte mit vollständigem Terpen-Profil bewertet.", rarity: "epic", icon_name: "FlaskConical" },
  { name: "High Flyer", description: "Eine Sorte mit über 25% THC geloggt.", rarity: "rare", icon_name: "Zap" },
  { name: "Pharma Specialist", description: "Deine erste medizinische Sorte aus der Apotheke geloggt.", rarity: "common", icon_name: "Database" }
];

async function seedBadges() {
  console.log('--- SEEDING OFFICIAL BADGES ---');
  
  for (const b of OFFICIAL_BADGES) {
    console.log(`Upserting Badge: ${b.name}...`);
    const { error } = await supabase.from('badges').upsert({
      name: b.name,
      description: b.description,
      rarity: b.rarity,
      icon_url: b.icon_name // We use the Lucide icon name as a reference
    }, { onConflict: 'name' });
    
    if (error) console.error(`Error with ${b.name}:`, error.message);
  }
  
  console.log('--- DONE ---');
}

seedBadges();
