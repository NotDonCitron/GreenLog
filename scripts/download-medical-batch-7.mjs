import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_7_IMAGES = [
  { name: "El Jefe", slug: "el-jefe" },
  { name: "Pink Gas", slug: "pink-gas" },
  { name: "Ghost Train Haze CM", slug: "ghost-train-haze-cm" },
  { name: "Buckin Runtz", slug: "buckin-runtz" },
  { name: "Plum Driver Pro", slug: "plum-driver-pro" },
  { name: "Black Krush", slug: "black-krush" },
  { name: "Peyote Critical", slug: "peyote-critical" },
  { name: "GOC", slug: "goc" },
  { name: "MAC Grünhorn", slug: "mac-grunhorn" },
  { name: "Wedding Cake PN", slug: "wedding-cake-pn" },
  { name: "GMO PN", slug: "gmo-pn" },
  { name: "Tilray Master Kush", slug: "tilray-thc25-master-kush" },
  { name: "Tilray Headband", slug: "tilray-thc22-headband" },
  { name: "Pedanios Tangerine Dream", slug: "pedanios-16-1-tangerine-dream" },
  { name: "Aurora Island Sweet Skunk", slug: "aurora-typ-1-island-sweet-skunk" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_7_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 700}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
