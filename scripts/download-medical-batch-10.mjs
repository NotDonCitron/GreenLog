import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_10_IMAGES = [
  { name: "Red No 1", slug: "red-no-1" },
  { name: "Red No 2", slug: "red-no-2" },
  { name: "Blue", slug: "blue" },
  { name: "Tangie Chem", slug: "tangie-chem" },
  { name: "Banjo", slug: "banjo" },
  { name: "Sky Berry Kush", slug: "sky-berry-kush" },
  { name: "Polar Cookies", slug: "polar-cookies" },
  { name: "White Widow Vayamed", slug: "white-widow-vayamed" },
  { name: "Equiposa", slug: "equiposa" },
  { name: "Tropical Blues", slug: "tropical-blues" },
  { name: "Tamarindo", slug: "tamarindo" },
  { name: "Rainbow Fruits", slug: "rainbow-fruits" },
  { name: "Blackberry Gelato", slug: "blackberry-gelato" },
  { name: "Apes In Space", slug: "apes-in-space" },
  { name: "Florida Kush", slug: "florida-kush" },
  { name: "La Sage Demecan", slug: "la-sage-demecan" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_10_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 1000}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
