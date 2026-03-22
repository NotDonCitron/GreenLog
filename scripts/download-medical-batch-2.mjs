import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_2_IMAGES = [
  { name: "Craft Emerald", slug: "craft-emerald" },
  { name: "Gas Face", slug: "gas-face" },
  { name: "Tiger Eyez", slug: "tiger-eyez" },
  { name: "Cap Junky", slug: "cap-junky" },
  { name: "Gastro Pop", slug: "gastro-pop" },
  { name: "Alien Mints", slug: "alien-mints" },
  { name: "Luminarium", slug: "luminarium" },
  { name: "Sedamen", slug: "sedamen" },
  { name: "Island Sweet Skunk", slug: "island-sweet-skunk" },
  { name: "Glitter Bomb", slug: "glitter-bomb" },
  { name: "Jack Herer", slug: "jack-herer" },
  { name: "Farm Gas", slug: "farm-gas" },
  { name: "Sourdough", slug: "sourdough" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_2_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 200}`; // Different lock for variety
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
