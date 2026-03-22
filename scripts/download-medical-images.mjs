import { execSync } from 'child_process';
import fs from 'fs';

const MEDICAL_STRAINS = [
  { name: "Farm Gas", slug: "farm-gas" },
  { name: "Sourdough", slug: "sourdough" },
  { name: "Ghost Train Haze", slug: "ghost-train-haze" },
  { name: "Delahaze", slug: "delahaze" },
  { name: "Pink Kush", slug: "pink-kush" },
  { name: "Gastro Pop", slug: "gastro-pop" },
  { name: "Bling Blaow", slug: "bling-blaow" },
  { name: "Cap Junky", slug: "cap-junky" },
  { name: "Kush Mint", slug: "kush-mint" },
  { name: "Ice Cream Cake", slug: "ice-cream-cake" },
  { name: "Monkey Butter", slug: "monkey-butter" },
  { name: "Islander", slug: "islander" },
  { name: "Sweet Berry Kush", slug: "sweet-berry-kush" },
  { name: "Master Kush", slug: "master-kush" },
  { name: "Grape Gasoline", slug: "grape-gasoline" },
  { name: "Bubblegum Biscotti", slug: "bubblegum-biscotti" },
  { name: "Gorilla Glue #4", slug: "gorilla-glue-4" },
  { name: "Demecan Typ 1", slug: "typ-1" },
  { name: "Demecan Typ 2", slug: "typ-2" },
  { name: "Bedrocan", slug: "bedrocan" },
  { name: "White Widow", slug: "white-widow" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

MEDICAL_STRAINS.forEach((s, i) => {
  const dest = `./public/strains/${s.slug}.jpg`;
  
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 200}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o "${dest}" "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
