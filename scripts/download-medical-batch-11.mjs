import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_11_IMAGES = [
  { name: "Grape Galena", slug: "grape-galena" },
  { name: "Golden State Kush", slug: "golden-state-kush" },
  { name: "Chocolate Kush", slug: "chocolate-kush" },
  { name: "Munyunz", slug: "munyunz" },
  { name: "Pink Punch", slug: "pink-punch" },
  { name: "Scented Marker", slug: "scented-marker" },
  { name: "Sugar Cake", slug: "sugar-cake" },
  { name: "Facetz", slug: "facetz" },
  { name: "Gelato OG", slug: "gelato-og" },
  { name: "Lemonade Haze", slug: "lemonade-haze" },
  { name: "God Cherry Bud", slug: "god-cherry-bud" },
  { name: "Pineapple God", slug: "pineapple-god" },
  { name: "Facade", slug: "facade" },
  { name: "Alien Kush Mintz", slug: "alien-kush-mintz" },
  { name: "Cali Rain", slug: "cali-rain" },
  { name: "Liberty Haze", slug: "liberty-haze" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_11_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 1100}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
