import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_6_IMAGES = [
  { name: "Diamond Diamonds", slug: "diamond-diamonds" },
  { name: "Strawberry Cheesecake", slug: "strawberry-cheesecake" },
  { name: "Midnight Mimosa", slug: "midnight-mimosa" },
  { name: "Waffle Bites", slug: "waffle-bites" },
  { name: "Chatterbox", slug: "chatterbox" },
  { name: "Platinum OG", slug: "platinum-og" },
  { name: "Highlands", slug: "highlands" },
  { name: "Kush Cookies", slug: "kush-cookies" },
  { name: "Scotti's Cake", slug: "scottis-cake" },
  { name: "Wedding Cake Amici", slug: "wedding-cake-amici" },
  { name: "Lemon Pepper Punch Remexian", slug: "lemon-pepper-punch-remexian" },
  { name: "Chemdawg Remexian", slug: "chemdawg-remexian" },
  { name: "Gelonade Remexian", slug: "gelonade-remexian" },
  { name: "White Widow Remexian", slug: "white-widow-remexian" },
  { name: "Grape Gasoline Remexian", slug: "grape-gasoline-remexian" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_6_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 600}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
