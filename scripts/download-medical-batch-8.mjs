import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_8_IMAGES = [
  { name: "Galax 24/1", slug: "galax-24-1" },
  { name: "Bedrocan Alternative", slug: "bedrocan-alternative" },
  { name: "Re:Cannis 22/1", slug: "recannis-22-1" },
  { name: "Fotmer T3h", slug: "fotmer-t3h" },
  { name: "Together Pharma Glueberry", slug: "together-pharma-glueberry" },
  { name: "Tweed Houndstooth", slug: "tweed-houndstooth" },
  { name: "Tweed Penelope", slug: "tweed-penelope" },
  { name: "PEX Plum Driver", slug: "pex-plum-driver" },
  { name: "MSP Moonshine Purple", slug: "msp-moonshine-purple" },
  { name: "Demecan Typ 3", slug: "demecan-typ-3" }
];

if (!fs.existsSync('./public/strains')) {
  fs.mkdirSync('./public/strains', { recursive: true });
}

BATCH_8_IMAGES.forEach((s, i) => {
  const url = `https://loremflickr.com/600/800/cannabis,bud?lock=${i + 800}`;
  console.log(`Downloading ${s.name}...`);
  try {
    execSync(`curl.exe -L -o public/strains/${s.slug}.jpg "${url}"`);
    console.log(`✓ Saved ${s.slug}.jpg`);
  } catch (err) {
    console.error(`✗ Failed ${s.name}`);
  }
});
