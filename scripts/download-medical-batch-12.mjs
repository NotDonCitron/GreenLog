import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_12_IMAGES = [
  { name: "Black Triangle", slug: "black-triangle" },
  { name: "Grape Face", slug: "grape-face" },
  { name: "Star Struck", slug: "star-struck" },
  { name: "Frozen Lemon Mints", slug: "frozen-lemon-mints" },
  { name: "Peach Chementine", slug: "peach-chementine" },
  { name: "Topaz", slug: "topaz" },
  { name: "Daylesford", slug: "daylesford" },
  { name: "Balanced Sweet Skunk", slug: "balanced-sweet-skunk" },
  { name: "Peach Chementine 30", slug: "peach-chementine-30" },
  { name: "Ice Cream Cake Kush Mints", slug: "ice-cream-cake-kush-mints" },
  { name: "Alien Mints 27", slug: "alien-mints-27" },
  { name: "Spiced Earth Kush", slug: "spiced-earth-kush" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_12_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 1200}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
