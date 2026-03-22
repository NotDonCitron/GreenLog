import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_9_IMAGES = [
  { name: "Slick Mintz", slug: "slick-mintz" },
  { name: "Strawberry Cake", slug: "strawberry-cake" },
  { name: "Slurricane", slug: "slurricane" },
  { name: "Dark Shadow Haze", slug: "dark-shadow-haze" },
  { name: "Purple Dog Bud", slug: "purple-dog-bud" },
  { name: "Kush Mintz Together", slug: "kush-mintz" },
  { name: "420 Natural Gorilla Glue", slug: "gorilla-glue" },
  { name: "420 Natural Wedding Cake", slug: "wedding-cake" },
  { name: "Pink Kush Typ 1", slug: "pink-kush-typ-1" },
  { name: "Delahaze Typ 2", slug: "delahaze-typ-2" },
  { name: "Ghost Train Haze Aurora", slug: "ghost-train-haze" },
  { name: "Ocean Grown Cookies", slug: "ocean-grown-cookies" },
  { name: "Amnesia Haze Cake", slug: "amnesia-haze-cake" },
  { name: "Ghost Train Haze Vayamed", slug: "ghost-train-haze-vayamed" },
  { name: "Fine Cookies", slug: "fine-cookies" },
  { name: "Mac 1 Bathera", slug: "mac-1-bathera" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_9_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 900}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
