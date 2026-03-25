import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_14_IMAGES = [
  { name: "Pavé S1", slug: "pave-s1" },
  { name: "Modified Gas", slug: "modified-gas" },
  { name: "Platinum Pavé", slug: "platinum-pave" },
  { name: "Gelato 33 LOT", slug: "gelato-33-lot" },
  { name: "Purple Fog", slug: "purple-fog" },
  { name: "Alien Pebbles", slug: "alien-pebbles" },
  { name: "Pink Kush PSF", slug: "pink-kush-psf" },
  { name: "Khalifa Kush", slug: "khalifa-kush" },
  { name: "Stay Puft", slug: "stay-puft" },
  { name: "Village Bloomery Craft", slug: "village-bloomery-craft" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_14_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 1400}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
