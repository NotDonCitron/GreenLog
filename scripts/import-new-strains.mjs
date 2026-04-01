/**
 * GreenLog — Import Strains aus strain-database.com
 * 
 * Nutzung: node scripts/import-new-strains.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Load env
const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function uploadImageFromUrl(imageUrl, strainSlug) {
  if (!imageUrl) return null;
  
  try {
    const ext = 'webp';
    const localPath = `/tmp/import-${strainSlug}.${ext}`;
    
    // Download
    execSync(`curl -sL "${imageUrl}" -A "Mozilla/5.0" -o "${localPath}" --max-time 20 2>/dev/null`);
    
    const fs = await import('fs');
    const stats = fs.statSync(localPath);
    if (stats.size < 5000) {
      fs.unlinkSync(localPath);
      return null;
    }
    
    // Upload to Supabase Storage
    const fileName = `strains/${strainSlug}.${ext}`;
    const fileBuffer = fs.readFileSync(localPath);
    
    const { error: uploadError } = await supabase.storage
      .from('strains')
      .upload(fileName, fileBuffer, { upsert: true, contentType: `image/${ext === 'webp' ? 'webp' : 'jpeg'}` });
    
    if (uploadError) {
      console.log(`      ❌ Upload failed: ${uploadError.message}`);
      fs.unlinkSync(localPath);
      return null;
    }
    
    const { data: urlData } = supabase.storage.from('strains').getPublicUrl(fileName);
    fs.unlinkSync(localPath);
    return urlData.publicUrl;
    
  } catch (err) {
    return null;
  }
}

async function strainExists(slug) {
  const { data } = await supabase
    .from('strains')
    .select('id, name')
    .eq('slug', slug)
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

async function upsertStrain(strain) {
  const existing = await strainExists(strain.slug);
  
  if (existing) {
    const { error } = await supabase
      .from('strains')
      .update({
        avg_thc: strain.avg_thc || null,
        avg_cbd: strain.avg_cbd || null,
        thc_min: strain.thc_min,
        thc_max: strain.thc_max,
        cbd_min: strain.cbd_min,
        cbd_max: strain.cbd_max,
        genetics: strain.genetics,
        image_url: strain.image_url,
        description: strain.description,
        // Don't override if not provided
      })
      .eq('id', existing.id);
    return { existing: true, error };
  } else {
    const { data, error } = await supabase
      .from('strains')
      .insert({
        name: strain.name,
        slug: strain.slug,
        type: strain.type,
        avg_thc: strain.avg_thc,
        avg_cbd: strain.avg_cbd,
        thc_min: strain.thc_min,
        thc_max: strain.thc_max,
        cbd_min: strain.cbd_min,
        cbd_max: strain.cbd_max,
        genetics: strain.genetics,
        image_url: strain.image_url,
        description: strain.description,
        source: 'strain-database.com',
      })
      .select('id')
      .single();
    return { existing: false, id: data?.id, error };
  }
}

async function main() {
  console.log('🌿 GreenLog — Import von strain-database.com\n');
  
  const strains = JSON.parse(readFileSync('./new-strains-strain-db.json', 'utf-8'));
  
  // Filter to only those with images
  const withImages = strains.filter(s => s.image_url);
  console.log(`📋 ${strains.length} Strains gefunden, ${withImages.length} mit Bild\n`);

  let imported = 0, updated = 0, skipped = 0, errors = 0;

  for (let i = 0; i < withImages.length; i++) {
    const s = withImages[i];
    process.stdout.write(`[${i+1}/${withImages.length}] ${s.name}... `);
    
    // Upload image
    let imageUrl = s.image_url;
    console.log('\n    📷 Lade Bild hoch...');
    imageUrl = await uploadImageFromUrl(s.image_url, s.slug);
    
    if (!imageUrl) {
      console.log(`    ⚠️ Kein Bild → überspringe\n`);
      skipped++;
      continue;
    }
    
    const result = await upsertStrain({ ...s, image_url: imageUrl });
    
    if (result.error) {
      console.log(`    ❌ Error: ${result.error.message}\n`);
      errors++;
    } else if (result.existing) {
      console.log(`    🔄 Updated`);
      updated++;
    } else {
      console.log(`    ✅ Importiert`);
      imported++;
    }
    
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n\n📊 ERGEBNISSE:`);
  console.log(`   ✅ Neu importiert: ${imported}`);
  console.log(`   🔄 Aktualisiert: ${updated}`);
  console.log(`   ⏭️  Übersprungen (kein Bild): ${skipped}`);
  console.log(`   ❌ Fehler: ${errors}`);
  
  if (imported + updated > 0) {
    console.log(`\n🎉 ${imported + updated} Strains mit Bildern importiert!`);
  }
}

main().catch(console.error);
