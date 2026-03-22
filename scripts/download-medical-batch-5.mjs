import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_5_IMAGES = [
  { name: "Creamy Kee’s", slug: "creamy-kees" },
  { name: "El Gringo", slug: "el-gringo" },
  { name: "Ceres", slug: "ceres" },
  { name: "Wedding Cake", slug: "wedding-cake" },
  { name: "Star Struck", slug: "star-struck" },
  { name: "Spiced Earth Kush", slug: "spiced-earth-kush" },
  { name: "Together", slug: "together" },
  { name: "Grow", slug: "grow" },
  { name: "Demecan Typ 1", slug: "demecan-typ-1" },
  { name: "Demecan Typ 2", slug: "demecan-typ-2" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_5_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 500}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
