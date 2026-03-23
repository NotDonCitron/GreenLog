import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function downloadImage(url, path) {
  try {
    execSync(`curl.exe -L -s -o "${path}" "${url}"`);
    return true;
  } catch (e) {
    return false;
  }
}

async function getLeaflyImage(slug) {
  const url = `https://www.leafly.com/strains/${slug}`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (response.ok) {
      const html = await response.text();
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
      if (nextDataMatch) {
        const fullData = JSON.parse(nextDataMatch[1]);
        const strain = fullData.props?.pageProps?.strain || {};
        return strain.nugImage || strain.flowerImagePng || null;
      }
    }
  } catch (e) {}
  return null;
}

async function run() {
  console.log("🖼️ PRÜFE STRAIN-BILDER...");
  
  if (!fs.existsSync('./public/strains')) {
    fs.mkdirSync('./public/strains', { recursive: true });
  }

  const { data: strains, error } = await supabase.from('strains').select('id, name, slug, image_url');
  if (error) {
    console.error(error);
    return;
  }

  const missing = strains.filter(s => {
    const localPath = `./public${s.image_url}`;
    return !s.image_url || !fs.existsSync(localPath);
  });

  console.log(`Gefunden: ${missing.length} Strains ohne Bild.`);

  for (let i = 0; i < missing.length; i++) {
    const s = missing[i];
    const targetPath = `./public/strains/${s.slug}.jpg`;
    const dbPath = `/strains/${s.slug}.jpg`;
    
    process.stdout.write(`[${i+1}/${missing.length}] Bild für ${s.name}... `);
    
    let success = false;
    // 1. Versuche Leafly (Original-Bild)
    const leaflyImg = await getLeaflyImage(s.slug);
    if (leaflyImg) {
      success = await downloadImage(leaflyImg, targetPath);
      if (success) process.stdout.write("📸 Leafly Original ");
    }
    
    // 2. Fallback (LoremFlickr)
    if (!success) {
      const seed = s.slug.length + (s.slug.charCodeAt(0) || 0);
      const placeholderUrl = `https://loremflickr.com/600/800/cannabis,bud?lock=${seed}`;
      success = await downloadImage(placeholderUrl, targetPath);
      if (success) process.stdout.write("🎨 Platzhalter ");
    }

    if (success) {
      await supabase.from('strains').update({ image_url: dbPath }).eq('id', s.id);
      process.stdout.write("✅\n");
    } else {
      process.stdout.write("❌ Fehler\n");
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log("🏁 FERTIG!");
}

run();
