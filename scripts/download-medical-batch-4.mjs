import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_4_IMAGES = [
  { name: "Gogurtz", slug: "gogurtz" },
  { name: "Koko Cookies", slug: "koko-cookies" },
  { name: "LA Sage", slug: "la-sage" },
  { name: "Sorbet", slug: "sorbet" },
  { name: "Wappa", slug: "wappa" },
  { name: "Headband", slug: "headband" },
  { name: "Sour Diesel", slug: "sour-diesel" },
  { name: "Ghost Train Haze", slug: "ghost-train-haze" },
  { name: "Frosted Lemon Angel", slug: "frosted-lemon-angel" },
  { name: "Grape Gasoline", slug: "grape-gasoline" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_4_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 400}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
