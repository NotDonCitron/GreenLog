import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://uwjyvvvykyueuxtdkscs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY fehlt!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Hilfsfunktion zum Reinigen von HTML und Entities
function cleanLeaflyText(text) {
  if (!text) return "";
  return text
    .replace(/<[^>]*>?/gm, '') // Entfernt alle HTML Tags
    .replace(/&nbsp;/g, ' ')    // Entfernt geschützte Leerzeichen
    .replace(/&amp;/g, '&')     // Korrigiert & Zeichen
    .replace(/&quot;/g, '"')    // Korrigiert Anführungszeichen
    .replace(/&apos;/g, "'")    // Korrigiert Apostrophe
    .replace(/\s+/g, ' ')       // Entfernt doppelte Leerzeichen/Umbrüche
    .trim();
}

const MEGA_STRAIN_LIST = [
  "OG Kush", "Blue Dream", "Sour Diesel", "Girl Scout Cookies", "Northern Lights",
  "White Widow", "Jack Herer", "Granddaddy Purple", "Gorilla Glue #4", "Gelato",
  "Durban Poison", "Bubba Kush", "Wedding Cake", "Pineapple Express", "Green Crack",
  "AK-47", "Trainwreck", "Super Lemon Haze", "Blueberry", "Chemdawg",
  "Amnesia Haze", "Purple Haze", "Skywalker OG", "Super Silver Haze", "Strawberry Cough",
  "Bruce Banner", "Zkittlez", "Runtz", "Do-Si-Dos", "Sherbert",
  "Hindu Kush", "Skunk #1", "Afghan Kush", "Master Kush", "LA Confidential",
  "Death Star", "Headband", "Lemon Haze", "Tangie", "Ghost Train Haze",
  "Alaskan Thunder Fuck", "Maui Wowie", "Acapulco Gold", "Panama Red", "White Rhino",
  "Grape Ape", "Purple Punch", "Biscotti", "Ice Cream Cake", "Slurricane",
  "Animal Mints", "Apple Fritter", "Banana OG", "Berry White", "Blue Cheese",
  "Blue Cookies", "Cereal Milk", "Cherry Pie", "Cinderella 99", "Cookies and Cream",
  "Critical Mass", "Dutch Treat", "Fruity Pebbles", "Gary Payton", "Gelato #33",
  "Gelato #41", "GMO Cookies", "Grapefruit", "Gushers", "Holy Grail Kush",
  "Jet Fuel", "Jillybean", "Kush Mints", "Larry OG", "Lemon Cherry Gelato",
  "MAC", "Mimosa", "Motorbreath", "Oreoz", "Papaya",
  "Peanut Butter Breath", "Pink Runtz", "Platinum GSC", "Rainbow Belts", "SFV OG",
  "Snowcap", "Sour OG", "Space Queen", "Stardawg", "Sundae Driver",
  "Sunset Sherbet", "Tahoe OG", "Tangerine Dream", "Thin Mint GSC", "Tropicana Cookies",
  "UK Cheese", "White Fire OG", "White Runtz", "XJ-13", "Zookies",
  "Agent Orange", "Alien Dawg", "Banana Kush", "Blackberry Kush", "Blue City Diesel",
  "Bubble Gum", "Candy Land", "Chocolope", "Cinex", "Dirty Girl",
  "Double Dream", "Ewok", "Forbidden Fruit", "French Toast", "Georgia Pie",
  "Golden Goat", "Guava", "Incredible Hulk", "Island Sweet Skunk", "Jean Guy",
  "Khalifa Kush", "Lemonder", "Lodi Dodi", "Mendocino Purps", "Middlefork",
  "9 Pound Hammer", "Afghani", "Afgoo", "Aurora Indica", "Black Domina",
  "Blueberry Cheesecake", "Bubba Kush #5", "Critical Kush", "Dark Star", "Diamond OG",
  "El Jefe", "Enigma", "G13", "Godfather OG", "God's Gift",
  "Hash Plant", "Herijuana", "Ice", "Ingrid", "King Louis XIII",
  "Kosher Kush", "Lavender", "Mag Landrace", "MK Ultra", "Obama Kush",
  "Pink Kush", "Platinum OG", "Presidential OG", "Purple Kush", "Purple Urkle",
  "Ray Charles", "Romulan", "Sensi Star", "Shiva Skunk", "Skywalker",
  "Sugar Black Rose", "True OG", "Violator Kush", "White Berry", "Willy's Wonder",
  "Allen Wrench", "Amnesia", "Bay 11", "Blue Walker", "Brooklyn Mango",
  "Casey Jones", "Chernobyl", "Clementine", "Dr. Grinspoon", "Full Moon",
  "Ghost OG", "Grapefruit Haze", "Hawaiian", "Haze", "Island Pink",
  "Kali Mist", "Lamb's Bread", "Laughing Buddha", "Lemon Skunk", "Lucid Dream",
  "Moby Dick", "Mother's Helper", "NYC Diesel", "Outer Space", "Power Plant",
  "Quantum Kush", "Red Headed Stranger", "Schrom", "Silver Haze", "Sour Breath",
  "Sour Tangie", "Super Sour Diesel", "Thai", "Vortex", "Walter White"
];

async function scrapeLeaflyData(strainName) {
  const slug = strainName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const url = `https://www.leafly.com/strains/${slug}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
    });

    if (!response.ok) throw new Error("Nicht gefunden");

    const html = await response.text();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    
    if (nextDataMatch) {
      const fullData = JSON.parse(nextDataMatch[1]);
      const strain = fullData.props?.pageProps?.strain || {};
      
      const cleanDescription = cleanLeaflyText(strain.description);

      const leaflyTerpenes = strain.topTerpenes || strain.terpenes || [];
      const formattedTerpenes = leaflyTerpenes.map((t) => ({ 
        name: t.name || t.terpene?.name, 
        percent: t.percent || null 
      })).filter((t) => t.name);

      const leaflyEffects = strain.effects;
      let formattedEffects = [];
      if (Array.isArray(leaflyEffects)) {
        formattedEffects = leaflyEffects.map(e => e.name).filter(Boolean);
      } else if (leaflyEffects && typeof leaflyEffects === 'object') {
        Object.values(leaflyEffects).forEach((group) => {
          if (Array.isArray(group)) {
            group.forEach(e => { if (e.name) formattedEffects.push(e.name); });
          }
        });
      }
      
      return {
        name: strain.name || strainName,
        type: (strain.category || "hybrid").toLowerCase(),
        description: cleanDescription || `Eine klassische Sorte: ${strainName}.`,
        avg_thc: strain.thc?.avg || null,
        terpenes: formattedTerpenes,
        effects: formattedEffects,
        genetics: strain.lineage?.displayName || "Unbekannt",
        slug: slug
      };
    }
  } catch (err) {}

  return {
    name: strainName,
    type: "hybrid",
    description: `Die beliebte Sorte ${strainName}. Daten von Leafly importiert.`,
    avg_thc: null,
    terpenes: [],
    effects: [],
    genetics: "Unbekannt",
    slug: slug
  };
}

async function downloadPlaceholderImage(slug) {
  const imgPath = `./public/strains/${slug}.jpg`;
  if (fs.existsSync(imgPath)) return `/strains/${slug}.jpg`;

  try {
    const seed = slug.length + (slug.charCodeAt(0) || 0);
    const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${seed}`;
    execSync(`curl.exe -L -s -o public/strains/${slug}.jpg "${url}"`);
    return `/strains/${slug}.jpg`;
  } catch (err) {
    return null;
  }
}

async function runImport() {
  console.log(`🚀 STARTE MEGA LEAFLY IMPORT (${MEGA_STRAIN_LIST.length} Strains)...`);
  
  if (!fs.existsSync('./public/strains')) {
    fs.mkdirSync('./public/strains', { recursive: true });
  }

  for (let i = 0; i < MEGA_STRAIN_LIST.length; i++) {
    const name = MEGA_STRAIN_LIST[i];
    process.stdout.write(`[${i + 1}/${MEGA_STRAIN_LIST.length}] Importiere ${name}... `);
    
    try {
      const data = await scrapeLeaflyData(name);
      const imageUrl = await downloadPlaceholderImage(data.slug);
      
      const { error } = await supabase.from('strains').upsert({
        name: data.name,
        slug: data.slug,
        type: data.type,
        avg_thc: data.avg_thc,
        description: data.description,
        terpenes: data.terpenes,
        effects: data.effects,
        genetics: data.genetics,
        image_url: imageUrl,
        is_medical: false
      }, { onConflict: 'slug' });

      if (error) throw error;
      process.stdout.write(`✅\n`);
    } catch (err) {
      process.stdout.write(`❌\n`);
    }
    
    // Pause um Rate-Limiting zu vermeiden
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n🏁 MEGA IMPORT BEENDET!`);
}

runImport();
