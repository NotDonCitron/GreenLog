/**
 * CannaLOG Social Assets Generator
 *
 * Generiert Bilder (Imagen) und Videos (Veo) aus den Social Media Prompts.
 *
 * Usage:
 *   node scripts/generate-social-assets.mjs                    # Alle Assets
 *   node scripts/generate-social-assets.mjs --images          # Nur Bilder
 *   node scripts/generate-social-assets.mjs --videos          # Nur Videos
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output', 'generated-assets');

// Load env directly
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const API_KEY = envVars.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error('❌ GOOGLE_AI_API_KEY nicht gefunden in .env.local');
  process.exit(1);
}

// Image Prompts extrahiert aus dem Content
const IMAGE_PROMPTS = [
  {
    id: 'strain-explorer-twitter',
    platform: 'Twitter/X',
    prompt: 'Abstrakte Datenvisualisierung im Dark Mode (Hintergrund #121212). Leuchtend grüne (#10B981) Nodes und Verbindungen, die an ein digitales Netzwerk erinnern. Im Vordergrund ein unscharfes, minimalistisches UI-Element einer Suchleiste. Keine Cannabis-Pflanzen, keine Blätter, professioneller Tech-Stil.'
  },
  {
    id: 'strain-explorer-instagram',
    platform: 'Instagram',
    prompt: 'Karussell-Cover: Dark Mode Tech-Dashboard "470+ Strains" im CannaLOG-Stil. Cleanes UI-Design mit grünen Highlights. Professionell, deutsches Cannabis-B2B. Keine Pflanzen, keine Blätter.'
  },
  {
    id: 'strain-explorer-linkedin',
    platform: 'LinkedIn',
    prompt: 'Professionelles LinkedIn-Banner. Dunkler, texturierter B2B-Hintergrund (#121212). Auf der rechten Seite schwebende, isometrische UI-Kacheln aus dem Strain Explorer mit subtilem Leuchten in Grün (#10B981). Text "Präzision in jedem Datensatz." Keine Pflanzenmotive.'
  },
  {
    id: 'collection-twitter',
    platform: 'Twitter/X',
    prompt: 'Nahaufnahme eines modernen Smartphones auf dunklem Schreibtisch. Display zeigt eine aufgeräumte, dunkle App-Oberfläche mit grünen Highlights (#10B981). Tech-Vibe, minimalistisch, keine Blatt-Symbole.'
  },
  {
    id: 'collection-instagram',
    platform: 'Instagram',
    prompt: 'Karussell-Slide: "Deine Sammlung" – Interface mit Strain-Notizen. Dunkles UI, grüne Highlights. Clean, privat, persönlich. Professionell.'
  },
  {
    id: 'club-dashboard-twitter',
    platform: 'Twitter/X',
    prompt: 'Abstrakte Dashboard-Darstellung. Geometrische Formen (Rechtecke und Kreise), die Diagramme und Daten-Metriken im Dark Mode (#121212) repräsentieren. Leuchtend grüne (#10B981) Linien verbinden die Elemente.'
  },
  {
    id: 'activity-feed-twitter',
    platform: 'Twitter/X',
    prompt: 'Isometrische 3D-Darstellung von mehreren schwebenden Chat-Blasen oder Feed-Karten in einem geschlossenen, schützenden Ring. Tech-Design in Dunkelgrau und strahlendem CannaLOG-Grün.'
  },
  {
    id: 'strain-detail-twitter',
    platform: 'Twitter/X',
    prompt: 'Makro-Aufnahme einer abstrakten DNA-Helix aus grün (#10B981) leuchtenden digitalen Punkten auf tiefschwarzem Grund (#121212). Symbolisiert genetische Analyse und botanische Wissenschaft. Keine Blätter.'
  },
  {
    id: 'badges-twitter',
    platform: 'Twitter/X',
    prompt: 'Mehrere abstrakte, hexagonale digitale "Münzen" oder Medaillen, die im dunklen Raum schweben. Sie leuchten subtil weiß und grün (#10B981). Achievement/Gamification-Charakter.'
  },
  {
    id: 'filter-panel-twitter',
    platform: 'Twitter/X',
    prompt: 'Minimalistisches Interface-Element mit mehreren Schiebereglern (Slidern), die auf exakte Werte eingestellt sind. Dunkelgrauer Hintergrund (#121212) mit leuchtend grünen Akzenten (#10B981) auf den Slider-Knöpfen.'
  },
  {
    id: 'filter-panel-instagram',
    platform: 'Instagram',
    prompt: 'Karussell-Slide: Erweiterte Strain-Suche mit Filtern für THC, CBD, Terpene, Wirkung. CannaLOG Filter-Panel. Clean, professionell, datenorientiert. Dunkles UI.'
  }
];

// Video Prompts
const VIDEO_PROMPTS = [
  {
    id: 'strain-explorer-video',
    platform: 'Twitter/X',
    duration: '10s',
    prompt: 'Ein schnelles, flüssiges Screen-Recording. Ein Cursor tippt einen Suchbegriff in die Suchleiste des Strain Explorers ein. Sofort filtern sich hunderte minimalistische Kacheln in Millisekunden auf das exakte Ergebnis. Text-Overlay: "470+ Profile. Echtzeit-Suche." (Fokus auf Tech-Performance).'
  },
  {
    id: 'collection-video',
    platform: 'Instagram',
    duration: '8s',
    prompt: 'Minimalistische Animation: Eine abstrakte Ordner-Struktur. Ein Nutzer klickt auf ein Herz-Icon (Favorit), woraufhin ein Datensatz fließend in den persönlichen, verschlüsselten Ordner "Meine Sammlung" gleitet. Ein kleines Schloss-Icon schließt sich (Fokus auf Datenschutz).'
  },
  {
    id: 'club-dashboard-video',
    platform: 'Twitter/X',
    duration: '12s',
    prompt: 'Ein Mauszeiger navigiert über das Dashboard. Er klickt auf "Report exportieren (§ 26 KCanG)". Ein Ladebalken füllt sich blitzschnell grün (#10B981) auf 100%, gefolgt von einem Häkchen-Icon. Text: "Behörden-Reports in Sekunden."'
  },
  {
    id: 'badge-unlock-video',
    platform: 'Instagram',
    duration: '8s',
    prompt: 'Eine elegante "Unlock"-Animation. Ein abgedunkeltes, graues Hexagon dreht sich um die eigene Achse, leuchtet dann plötzlich in hellem Grün (#10B981) auf. Ein Glitzereffekt erscheint. Text: "Motivation für aktive Vereinsmitglieder."'
  },
  {
    id: 'filter-panel-video',
    platform: 'LinkedIn',
    duration: '10s',
    prompt: 'Ein flüssiges UI-Video. Zwei Schieberegler (THC und CBD) werden dynamisch verschoben. Im Hintergrund sieht man, wie sich die Anzahl der Suchergebnisse sofort in Echtzeit anpasst. Text: "Filtern in Echtzeit. Für punktgenaues Management."'
  }
];

// Ensure output directory
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// --- Imagen API (Image Generation) ---
async function generateImage(prompt, outputPath) {
  console.log(`\n🎨 Generiere Bild: ${outputPath}`);
  console.log(`   Prompt: ${prompt.substring(0, 80)}...`);

  try {
    // Google AI Studio Imagen API endpoint
    const response = await fetch(
      `https://imagegeneration.googleapis.com/v1/models/imagen-3.0-generate-002:predict?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          sampleCount: 1,
          aspectRatio: '16:9'
        })
      }
    );

    const data = await response.json();
    console.log(`   Response: ${JSON.stringify(data).substring(0, 300)}`);

    if (data.error) {
      console.log(`   ⚠️  API Error: ${data.error.message}`);
      return null;
    }

    if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
      const base64Image = data.predictions[0].bytesBase64Encoded;
      const { writeFileSync } = await import('fs');
      writeFileSync(outputPath, Buffer.from(base64Image, 'base64'));
      console.log(`   ✅ Gespeichert: ${outputPath}`);
      return outputPath;
    }

    console.log(`   ⚠️  Keine Bild-Daten in Response`);
    return null;
  } catch (error) {
    console.log(`   ❌ Fehler: ${error.message}`);
    return null;
  }
}

// --- Veo API (Video Generation) ---
async function generateVideo(prompt, duration, outputPath) {
  console.log(`\n🎬 Generiere Video: ${outputPath}`);
  console.log(`   Prompt: ${prompt.substring(0, 80)}...`);
  console.log(`   Dauer: ${duration}`);

  try {
    // Google AI Studio Veo API endpoint
    const response = await fetch(
      `https://videogen.googleapis.com/v1/models/veo-2.0-generate:predict?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          durationSeconds: parseInt(duration),
          aspectRatio: '16:9'
        })
      }
    );

    const data = await response.json();
    console.log(`   Response: ${JSON.stringify(data).substring(0, 300)}`);

    if (data.error) {
      console.log(`   ⚠️  API Error: ${data.error.message}`);
      return null;
    }

    if (data.predictions && data.predictions[0]) {
      const videoData = data.predictions[0];
      if (videoData.generatedVideo) {
        console.log(`   📹 Video generiert: ${videoData.generatedVideo}`);
        return videoData.generatedVideo;
      }
    }

    console.log(`   ⚠️  Keine Video-Daten in Response`);
    return null;
  } catch (error) {
    console.log(`   ❌ Fehler: ${error.message}`);
    return null;
  }
}

// --- Main ---
const args = process.argv.slice(2);

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('🎬 CannaLOG Social Assets Generator');
  console.log('═══════════════════════════════════════════');

  const runImages = !args.includes('--videos');
  const runVideos = !args.includes('--images');

  // Generate Images
  if (runImages) {
    console.log('\n📸 Bild-Generierung (Imagen)');
    console.log('───────────────────────────────────────────');

    for (const item of IMAGE_PROMPTS) {
      const outputPath = join(OUTPUT_DIR, `${item.id}.png`);
      await generateImage(item.prompt, outputPath);
      // Rate limiting - wait between calls
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Generate Videos
  if (runVideos) {
    console.log('\n🎥 Video-Generierung (Veo)');
    console.log('───────────────────────────────────────────');

    for (const item of VIDEO_PROMPTS) {
      const outputPath = join(OUTPUT_DIR, `${item.id}.mp4`);
      await generateVideo(item.prompt, item.duration, outputPath);
      // Rate limiting - wait between calls
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('✅ Fertig!');
  console.log(`📁 Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);
