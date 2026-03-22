import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_3_IMAGES = [
  { name: "Cold Creek Kush", slug: "cold-creek-kush" },
  { name: "Sweets", slug: "sweets" },
  { name: "Strawberry Pave", slug: "strawberry-pave" },
  { name: "Lemon Pepper Punch", slug: "lemon-pepper-punch" },
  { name: "Chemdawg", slug: "chemdawg" },
  { name: "Gelonade", slug: "gelonade" },
  { name: "Space Cake", slug: "space-cake" },
  { name: "GMO Cookies", slug: "gmo-cookies" },
  { name: "Cocoa Bomba", slug: "cocoa-bomba" },
  { name: "Mintwave", slug: "mintwave" },
  { name: "Jack Herer", slug: "jack-herer" },
  { name: "Royal Berry", slug: "royal-berry" },
  { name: "Moonshine Purple", slug: "moonshine-purple" },
  { name: "Plum Driver", slug: "plum-driver" },
  { name: "MAC 1", slug: "mac-1" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_3_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 300}`; // Different lock for variety
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
