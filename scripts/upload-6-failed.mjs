import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PUBLIC_STRAINS_DIR = path.join(process.cwd(), 'public', 'strains');

const slugs = ['dairy-queen', 'diamond-og', 'kosher-kush', 'middlefork', 'snowcap', 'space-queen'];

for (const slug of slugs) {
  const imgPath = path.join(PUBLIC_STRAINS_DIR, slug + '.jpg');
  console.log(`\n${slug}:`);

  if (!fs.existsSync(imgPath)) {
    console.log('  File not found');
    continue;
  }

  const stats = fs.statSync(imgPath);
  console.log(`  File size: ${(stats.size / 1024).toFixed(0)} KB`);

  const fileBuffer = fs.readFileSync(imgPath);
  const { data, error } = await supabase.storage
    .from('strains')
    .upload(slug + '.jpg', fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.log(`  Upload failed: ${error.message}`);
    continue;
  }

  const { data: urlData } = supabase.storage
    .from('strains')
    .getPublicUrl(slug + '.jpg');

  // Find strain by slug and update
  const { data: strain } = await supabase
    .from('strains')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (strain) {
    await supabase
      .from('strains')
      .update({ image_url: urlData.publicUrl })
      .eq('id', strain.id);
    console.log(`  DB updated: ${strain.name}`);
  }

  console.log(`  OK: ${urlData.publicUrl}`);
  await new Promise(r => setTimeout(r, 500));
}

console.log('\n=== All done ===');
