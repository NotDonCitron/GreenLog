/**
 * CannaLOG Social Content Generator
 *
 * Generiert Screenshots von echten App-Seiten + passende Prompts für
 * NotebookLM / Google Flow (Image/Video Generierung).
 *
 * Usage:
 *   node scripts/social-content-generator.mjs                    # Alle Pages
 *   node scripts/social-content-generator.mjs --page strains     # Nur Strains
 *   node scripts/social-content-generator.mjs --page collection  # Nur Collection
 *   node scripts/social-content-generator.mjs --list             # Verfügbare Pages
 *
 * Output: scripts/output/social-content-[date].md
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');

// Screenshots Configuration
const BASE_PORT = 3001;

const PAGES = [
  {
    id: 'strains-explore',
    name: 'Strain Explorer',
    url: `http://localhost:${BASE_PORT}/strains`,
    description: 'Strain-Datenbank mit 470+ Sorten',
    prompt_context: 'Strain-Datenbank für Cannabis-Social-Clubs. Zeigt Sorten mit THC/CBD-Werten, Genetik, Typ-Indikatoren.'
  },
  {
    id: 'collection',
    name: 'Meine Sammlung',
    url: `http://localhost:${BASE_PORT}/collection`,
    description: 'Private Sammlung mit eigenen Notizen',
    prompt_context: 'Persönliche Strain-Sammlung mit Notizen, Favoriten und Bewertungen.'
  },
  {
    id: 'organization-dashboard',
    name: 'Club Dashboard',
    url: `http://localhost:${BASE_PORT}/settings/organization`,
    description: 'Organisations-Verwaltung für Clubs',
    prompt_context: 'Dashboard für CSC-Organisationen: Member-Verwaltung, Rollen, Activities.'
  },
  {
    id: 'activity-feed',
    name: 'Activity Feed',
    url: `http://localhost:${BASE_PORT}/feed`,
    description: 'Social Feed mit Follower-Aktivitäten',
    prompt_context: 'Social Feed mit Strain-Aktivitäten, neuen Followern, Badges.'
  },
  {
    id: 'strain-detail',
    name: 'Strain Detail',
    url: `http://localhost:${BASE_PORT}/strains/gorilla-glue`,
    description: 'Einzelne Strain-Seite mit Details',
    prompt_context: 'Detailseite einer Cannabissorte mit Terpen-Profil, Bewertungen, Genetik.'
  },
  {
    id: 'badges',
    name: 'Badge Sammlung',
    url: `http://localhost:${BASE_PORT}/profile/badges`,
    description: 'Gamification mit 26 Badges',
    prompt_context: 'Gamification-System: 26 Badges für Community-Aktivitäten, Sammlungen, Reviews.'
  },
  {
    id: 'filter-panel',
    name: 'Strain Filter',
    url: `http://localhost:${BASE_PORT}/strains?s=hybrid&t=high`,
    description: 'Erweiterte Filter für Strain-Suche',
    prompt_context: 'Filter-System für Strain-Suche: THC/CBD Range, Terpene, Genetik, Wirkung.'
  },
];

// Prompt Templates für Image Generation (Google Flow / Imagen)
const IMAGE_PROMPTS = {
  'strains-explore': {
    twitter: `Minimalistisches Tech-Dashboard im Stil von CannaLOG: Dunkles Interface (#121212), grüne Akzente (#10B981), Grid aus Strain-Karten mit Glide Snow, Mandarin Cure, Ghost Train Haze. Clean, professionell, B2B. Keine Cannabis-Symbole.`,
    instagram: `Karussell-Cover: Dunkles Tech-Dashboard "470+ Strains" im CannaLOG-Stil. Cleanes UI-Design mit grünen Highlights. Professionell, deutsches Cannabis-B2B. Keine Pflanzen, keine Blätter.`,
    linkedin: `LinkedIn-Banner: Modernes Datenbank-Dashboard mit Strain-Informationen. CannaLOG Branding. Professionell, Tech, Pharma-Ästhetik. Dunkel (#121212) mit grün (#10B981). Keine Cannabis-Darstellung.`
  },
  'collection': {
    twitter: `Interface-Screenshot einer persönlichen Cannabis-Sammlung: Strain-Karten mit Notizen, Favoriten, THC-Werten. CannaLOG App. Dunkles Theme, grüne Akzente. Professionell, B2B.`,
    instagram: `Karussell-Slide: "Deine Sammlung" – Screenshots von CannaLOG Collection mit Strain-Notizen. Dunkles UI, grüne Highlights. Clean, privat, persönlich.`,
    linkedin: `LinkedIn-Banner: Private Sammlungs-Verwaltung für CSC-Mitglieder. Dashboard mit Strain-Favoriten und Notizen. Professionell, datenorientiert.`
  },
  'organization-dashboard': {
    twitter: `Club-Management Dashboard: Member-Liste, Rollen-Verwaltung, Aktivitäts-Feed. CannaLOG Organisations-Feature. Dunkles Interface, grüne Akzente. B2B-Tool für Cannabis-Clubs.`,
    instagram: `Karussell-Slide: CSC-Organisationsverwaltung mit Member-Rollen (Gründer, Admin, Member). Dunkles UI, professionell. Community-Management.`,
    linkedin: `LinkedIn-Banner: Organisation-Management für Cannabis-Social-Clubs. Member-Verwaltung, Rollen, Compliance. CannaLOG B2B-Plattform. Professionell.`
  },
  'activity-feed': {
    twitter: `Social Feed Interface: Follower-Aktivitäten, neue Strains, Badge-Errungenschaften. CannaLOG Feed. Dunkles Theme, grüne Highlights. Community-Features.`,
    instagram: `Karussell-Slide: Community-Aktivitäten auf CannaLOG – neue Follower, Strain-Bewertungen, Badges. Dunkles Interface, Social Feed Design.`,
    linkedin: `LinkedIn-Banner: Community-Feed für CSC-Mitglieder. Aktivitäts-Stream mit Strain-Updates. CannaLOG Social Features. Professionell.`
  },
  'strain-detail': {
    twitter: `Strain-Detailseite mit Terpen-Profil, THC/CBD-Werten, Genetik (Gorilla Glue). CannaLOG Interface. Dunkles UI, grüne Daten-Visualisierung. Keine Pflanzendarstellung.`,
    instagram: `Karussell-Slide: Detailansicht einer Cannabissorte mit Wirkung, Terpenen, Genetik. CannaLOG Strain-Karte. Clean, datenreich, professionell.`,
    linkedin: `LinkedIn-Banner: Strain-Datenbank mit detaillierten Cannabis-Sorteninformationen. Terpen-Profile, THC/CBD, Genetik. CannaLOG. Professionell, Pharma-Ästhetik.`
  },
  'badges': {
    twitter: `Gamification Interface mit 26 Badges für Community-Aktivitäten. CannaLOG Badge-System. Dunkles UI, grüne Checkmarks, Fortschritts-Anzeige. Professionell, B2B.`,
    instagram: `Karussell-Slide: Badge-Sammlung mit Achievements für Strain-Sammlungen, Reviews, Community. CannaLOG Gamification. Dunkel, grüne Akzente, clean.`,
    linkedin: `LinkedIn-Banner: Gamification für CSC-Community – Badges für aktive Mitglieder. CannaLOG. Professionell, dunkles Interface, grüne Highlights.`
  },
  'filter-panel': {
    twitter: `Filter-Interface für Cannabis-Strains: THC/CBD-Slider, Terpen-Auswahl, Genetik-Filter. CannaLOG Such-System. Dunkles UI, grüne Akzente. B2B-Datenbank.`,
    instagram: `Karussell-Slide: Erweiterte Strain-Suche mit Filtern für THC, CBD, Terpene, Wirkung. CannaLOG Filter-Panel. Clean, professionell, datenorientiert.`,
    linkedin: `LinkedIn-Banner: Strain-Datenbank mit intelligentem Filter-System für Cannabis-Clubs. CannaLOG. Professionell, Tech-Ästhetik, dunkles Interface.`
  }
};

// Video Prompt Templates
const VIDEO_PROMPTS = {
  intro: {
    prompt: `10-Sekunden Logo-Animation: CannaLOG Logo erscheint aus grünem Licht-Hintergrund, dann Fade zu dunklem Interface. Minimalistisch, professionell, Tech-B2B. Keine Cannabis-Symbole.`,
    duration: '10s',
    style: 'Clean Tech Logo Reveal'
  },
  strain_card_hover: {
    prompt: `5-Sekunden Hover-Animation einer Strain-Karte in CannaLOG: Karte hebt sich leicht an, grüner Glow-Effekt, zeigt "Mehr Infos" Button. Dunkles Interface. Professionell.`,
    duration: '5s',
    style: 'UI Interaction Animation'
  },
  collection_tour: {
    prompt: `15-Sekunden Cinematic Tour durch CannaLOG Collection: Langsames Scrollen durch Strain-Karten, Notizen-Overlay, Favoriten-Animationen. Dunkles UI, grüne Akzente. Professionell, B2B. Keine Pflanzen.`,
    duration: '15s',
    style: 'App Demo Tour'
  },
  badge_unlock: {
    prompt: `8-Sekunden Badge-Unlock Animation: Neues Badge erscheint mit grünem Glanz-Effekt, Fortschrittsbalken füllt sich. CannaLOG Gamification. Dunkel, grün, clean.`,
    duration: '8s',
    style: 'Achievement Animation'
  },
  organization_activity: {
    prompt: `12-Sekunden Dashboard-Animation: Organization-Member joined, Rolle wird zugewiesen, Activity-Feed zeigt neuen Event. CannaLOG Club-Management. Dunkles UI, grüne Highlights. Professionell.`,
    duration: '12s',
    style: 'Dashboard Activity Feed'
  }
};

// Posting Frequencies
const CONTENT_CALENDAR = {
  twitter: {
    frequency: '3x pro Woche',
    best_times: ['Mo 08:00', 'Mi 12:00', 'Fr 16:00'],
    posts_per_week: 3
  },
  instagram: {
    frequency: '2x pro Woche',
    best_times: ['Di 09:00', 'Do 18:00'],
    posts_per_week: 2
  },
  linkedin: {
    frequency: '1x pro Woche',
    best_times: ['Mi 08:00'],
    posts_per_week: 1
  }
};

async function captureScreenshots() {
  console.log('🎬 CannaLOG Social Content Generator\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // Login first if needed (check if age gate appears)
  console.log('📸 Screenshots werden generiert...\n');

  const results = [];

  for (const pageConfig of PAGES) {
    try {
      console.log(`  ▶ ${pageConfig.name}...`);
      await page.goto(pageConfig.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000); // Wait for animations

      const screenshotPath = join(OUTPUT_DIR, `screenshot-${pageConfig.id}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: pageConfig.id === 'strains-explore' ? false : false
      });

      results.push({
        id: pageConfig.id,
        name: pageConfig.name,
        screenshot: screenshotPath,
        url: pageConfig.url,
        prompt_context: pageConfig.prompt_context,
        image_prompts: IMAGE_PROMPTS[pageConfig.id] || {}
      });

      console.log(`    ✓ ${screenshotPath}`);
    } catch (error) {
      console.log(`    ✗ Fehler: ${error.message}`);
    }
  }

  await browser.close();
  return results;
}

function generatePromptFile(screenshots, outputPath) {
  let content = `# CannaLOG Social Media Content Guide
> Generiert: ${new Date().toISOString().split('T')[0]}
> Pages Screenshots: ${screenshots.length}

---\n\n`;

  // Screenshots Summary
  content += `## 📸 Screenshots\n\n`;
  for (const s of screenshots) {
    content += `### ${s.name}\n`;
    content += `- **Screenshot:** \`${s.screenshot}\`\n`;
    content += `- **URL:** ${s.url}\n`;
    content += `- **Kontext:** ${s.prompt_context}\n\n`;
  }

  // Image Prompts per Screenshot
  content += `---\n\n## 🎨 Image Generierung Prompts\n\n`;
  for (const s of screenshots) {
    content += `### ${s.name}\n\n`;
    const prompts = s.image_prompts;
    if (prompts.twitter) {
      content += `**Twitter/X:**\n`;
      content += `> ${prompts.twitter}\n\n`;
    }
    if (prompts.instagram) {
      content += `**Instagram:**\n`;
      content += `> ${prompts.instagram}\n\n`;
    }
    if (prompts.linkedin) {
      content += `**LinkedIn:**\n`;
      content += `> ${prompts.linkedin}\n\n`;
    }
    content += `---\n\n`;
  }

  // Video Prompts
  content += `## 🎬 Video Generierung Prompts\n\n`;
  for (const [id, v] of Object.entries(VIDEO_PROMPTS)) {
    content += `### ${id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
    content += `- **Dauer:** ${v.duration}\n`;
    content += `- **Stil:** ${v.style}\n`;
    content += `- **Prompt:**\n`;
    content += `> ${v.prompt}\n\n`;
  }

  // Content Calendar
  content += `## 📅 Content Kalender\n\n`;
  for (const [platform, cal] of Object.entries(CONTENT_CALENDAR)) {
    content += `### ${platform.charAt(0).toUpperCase() + platform.slice(1)}\n`;
    content += `- **Frequenz:** ${cal.frequency}\n`;
    content += `- **Beste Zeiten:** ${cal.best_times.join(', ')}\n`;
    content += `- **Posts/Woche:** ${cal.posts_per_week}\n\n`;
  }

  // Hashtags
  content += `---\n\n## #️⃣ Hashtag Empfehlungen\n\n`;
  const hashtags = {
    twitter: ['#CannaLOG', '#CSC', '#CannabisIndustry', '#B2B', '#Compliance', '#Tech', '#Digitalisierung'],
    instagram: ['CannaLOG', 'CannabisCommunity', 'CSCManagement', 'B2BPlatform', 'TechInnovation', 'Compliance'],
    linkedin: ['CannaLOG', 'CannabisIndustry', 'B2BPlatform', 'DigitalTransformation', 'CSC', 'Medizinalcannabis']
  };
  content += `**Twitter/X:** ${hashtags.twitter.join(' ')}\n\n`;
  content += `**Instagram:** ${hashtags.instagram.join(' ')}\n\n`;
  content += `**LinkedIn:** ${hashtags.linkedin.join(' ')}\n\n`;

  // CTA Templates
  content += `---\n\n## 📢 Call-to-Action Templates\n\n`;
  const ctas = [
    'Jetzt auf CannaLOG testen → [cannaLOG.de]',
    'Demo buchen: [cannaLOG.de/demo]',
    'Kostenlos starten: [cannaLOG.de]',
    'Mehr erfahren: [cannaLOG.de/features]',
    'Community beitreten: [cannaLOG.de/join]'
  ];
  ctas.forEach((cta, i) => {
    content += `${i + 1}. ${cta}\n`;
  });

  writeFileSync(outputPath, content, 'utf8');
  return outputPath;
}

function generatePromptForNotebookLM(screenshots) {
  let prompt = `# CannaLOG Social Media Content – Prompt für NotebookLM

## Über CannaLOG
CannaLOG ist eine B2B-Mandanten-Plattform für Cannabis-Social-Clubs (CSCs) und Apotheken in Deutschland.
- Strain-Datenbank (470+ Sorten)
- Private Sammlungen & Favoriten
- Organisations-Management
- Community-Features (Follower, Badges)
- Grow-Diary (max. 3 Pflanzen, KCanG § 9)

## KCanG Werbebeschränkungen
**VERBOTEN:** Cannabis-Werbung, Konsum-Darstellung, Gesundheitsversprechen, jugendaffine Ästhetik
**ERLAUBT:** Plattform-Features, Tech/Innovation, Compliance, Community

## Brand Guidelines
- **Farben:** Dunkel (#121212), Grün (#10B981), Akzent-Weiß
- **Stil:** Professionell, B2B, Tech, datenorientiert
- **Keine:** Cannabis-Pflanzen, Blätter, Rauch-Symbole

## Verfügbare Screenshots
`;

  screenshots.forEach((s, i) => {
    prompt += `${i + 1}. ${s.name} - ${s.screenshot}\n   Kontext: ${s.prompt_context}\n`;
  });

  prompt += `
## Meine Anfrage
Für JEDES der ${screenshots.length} Screenshots, generiere:

1. **1 Twitter/X Post** (max 280 Zeichen) mit passendem Image-Prompt
2. **1 Instagram Caption** mit passendem Karussell-Prompt (5 Slides)
3. **1 LinkedIn Text** mit passendem Banner-Prompt
4. **1 Video-Konzept** (5-15 Sek) falls sinnvoll

**Pro Post要有:**
- KCanG-konform
- CannaLOG Branding
- Passender CTA
- Plattform-spezifisches Format

## Output Format
Für jeden Screenshot:
\`\`\`
### [Screenshot Name]

**Twitter/X**
- Post: [Text]
- Image Prompt: [Prompt für Google Flow/Imagen]

**Instagram**
- Caption: [Text]
- Karussell Prompt: [5-Slide Beschreibung]

**LinkedIn**
- Post: [Text]
- Banner Prompt: [Banner Beschreibung]

${screenshots.map((s, i) => `## Screenshot ${i + 1}: ${s.name}
${s.prompt_context}`).join('\n\n')}
\`\`\`
`;

  return prompt;
}

// Main
const args = process.argv.slice(2);

if (args.includes('--list')) {
  console.log('\n📄 Verfügbare Pages:\n');
  PAGES.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.id})`);
    console.log(`     URL: ${p.url}`);
    console.log(`     ${p.description}\n`);
  });
  process.exit(0);
}

async function main() {
  // Ensure output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const outputFile = join(OUTPUT_DIR, `social-content-${date}.md`);
  const notebookPromptFile = join(OUTPUT_DIR, 'notebooklm-prompt.md');

  console.log('🎬 CannaLOG Social Content Generator\n');
  console.log('═══════════════════════════════════════════\n');

  // Capture screenshots
  const screenshots = await captureScreenshots();

  console.log('\n\n📝 Prompts werden generiert...\n');

  // Generate files
  const promptFile = generatePromptFile(screenshots, outputFile);
  const notebookLM = generatePromptForNotebookLM(screenshots);
  writeFileSync(notebookPromptFile, notebookLM, 'utf8');

  console.log(`  ✓ ${outputFile}`);
  console.log(`  ✓ ${notebookPromptFile}`);
  console.log('\n═══════════════════════════════════════════');
  console.log('\n✅ Fertig!\n');
  console.log('Nächste Schritte:');
  console.log('  1. Öffne NotebookLM und lade die Screenshots hoch');
  console.log('  2. Nutze den Prompt aus: output/notebooklm-prompt.md');
  console.log('  3. Generiere Content, dann hier in Claude Code umsetzen');
  console.log('\n  oder:');
  console.log('  4. Direkt Prompts aus: output/social-content-*.md nutzen');
}

main().catch(console.error);
