import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_13_IMAGES = [
  { name: "Magic Marker", slug: "magic-marker" },
  { name: "Sky Pie", slug: "sky-pie" },
  { name: "Black Marker", slug: "black-marker" },
  { name: "Jelly Mints", slug: "jelly-mints" },
  { name: "Grapes and Cream", slug: "grapes-and-cream" },
  { name: "Beach Crasher", slug: "beach-crasher" },
  { name: "Sugar Cake", slug: "sugar-cake" },
  { name: "Wedding Pie", slug: "wedding-pie" },
  { name: "Lemon Hash Ghost", slug: "lemon-hash-ghost" },
  { name: "Tiger Cake", slug: "tiger-cake" },
  { name: "Afina", slug: "afina" },
  { name: "Apples and Bananas", slug: "apples-and-bananas" },
  { name: "RS11", slug: "rs11" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_13_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 1300}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
