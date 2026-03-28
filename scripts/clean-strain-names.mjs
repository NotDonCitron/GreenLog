// scripts/clean-strain-names.mjs
// Removes farmer/brand prefix from strain names where name starts with "brand "
// Only affects non-custom strains
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanStrainNames() {
  console.log('Fetching strains with farmer prefix in name...\n');

  // Get all non-custom strains where name starts with brand + space
  const { data: strains, error } = await supabase
    .from('strains')
    .select('id, slug, name, brand')
    .eq('is_custom', false)
    .not('brand', 'is', null);

  if (error) {
    console.error('Error fetching strains:', error);
    return;
  }

  // Find strains where name starts with brand + " "
  const toUpdate = strains.filter(s =>
    s.brand && s.name && s.name.startsWith(s.brand + ' ')
  );

  console.log(`Found ${toUpdate.length} strains to clean\n`);

  if (toUpdate.length === 0) {
    console.log('No strains need cleaning. All names are already clean!');
    return;
  }

  // Show first 10 examples
  console.log('Examples (first 10):');
  for (const s of toUpdate.slice(0, 10)) {
    const newName = s.name.substring(s.brand.length + 1);
    console.log(`  "${s.name}" -> "${newName}"`);
  }
  if (toUpdate.length > 10) {
    console.log(`  ... and ${toUpdate.length - 10} more`);
  }
  console.log('');

  // Update each strain
  let successCount = 0;
  let errorCount = 0;

  for (const s of toUpdate) {
    const newName = s.name.substring(s.brand.length + 1);

    const { error: updateError } = await supabase
      .from('strains')
      .update({ name: newName })
      .eq('id', s.id);

    if (updateError) {
      console.error(`  Error updating ${s.slug}: ${updateError.message}`);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n========== SUMMARY ==========`);
  console.log(`Updated: ${successCount}`);
  console.log(`Errors:  ${errorCount}`);
  console.log(`=============================\n`);
}

cleanStrainNames().catch(console.error);
