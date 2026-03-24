import { NextRequest, NextResponse } from "next/server";

const extractNames = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === "string") return item.trim();
    if (item && typeof item === "object") {
      if ("name" in item && typeof item.name === "string") return item.name.trim();
      if ("displayName" in item && typeof item.displayName === "string") return item.displayName.trim();
      if ("label" in item && typeof item.label === "string") return item.label.trim();
    }
    return "";
  }).filter(Boolean);
};

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || !url.includes("leafly.com/strains/")) {
      return NextResponse.json({ error: "Ungültige Leafly-URL" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    });

    if (!response.ok) throw new Error("Leafly konnte nicht geladen werden");

    const html = await response.text();
    let scrapedData: any = { terpenes: [], effects: [] };

    // 1. Primär: Next.js JSON Block
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const fullData = JSON.parse(nextDataMatch[1]);
        const strainData = fullData.props?.pageProps?.strain || fullData.props?.pageProps?.strainData || fullData.props?.pageProps?.initialStrain || {};

        const getVal = (val: any) => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            const m = val.match(/(\d+(?:\.\d+)?)/);
            return m ? parseFloat(m[1]) : null;
          }
          if (val && typeof val === 'object') return val.avg || val.value || val.average || null;
          return null;
        };

        scrapedData = {
          name: strainData.name || "",
          type: (strainData.category || "hybrid").toLowerCase(),
          description: strainData.description || "",
          thc: getVal(strainData.thc),
          cbd: getVal(strainData.cbd),
          terpenes: extractNames(strainData.topTerpenes || strainData.terpenes || strainData.flavors || []),
          effects: extractNames(strainData.feelings || strainData.effects || []),
          image_url: strainData.imageUrl || strainData.heroImage || null,
        };
      } catch (e) {}
    }

    // 2. Sekundär: Aggressives Full-Text Scraping (Falls JSON lückenhaft)
    
    // Name aus Title
    if (!scrapedData.name) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      scrapedData.name = titleMatch ? titleMatch[1].split("|")[0].replace("Strain Information", "").trim() : "";
    }

    // THC/CBD aus dem HTML Text extrahieren
    if (!scrapedData.thc) {
      const thcMatch = html.match(/(\d+(?:\.\d+)?)\s*%\s*thc/i);
      if (thcMatch) scrapedData.thc = parseFloat(thcMatch[1]);
    }
    if (!scrapedData.cbd) {
      const cbdMatch = html.match(/(\d+(?:\.\d+)?)\s*%\s*cbd/i);
      if (cbdMatch) scrapedData.cbd = parseFloat(cbdMatch[1]);
    }

    // Terpene/Flavors aus HTML finden (Suche nach Begriffen in Listen oder Buttons)
    const TASTE_KEYWORDS = ["earthy", "sweet", "citrus", "lemon", "pine", "berry", "spicy", "fruity", "diesel", "skunk", "pepper", "grape", "tropical"];
    TASTE_KEYWORDS.forEach(keyword => {
      if (html.toLowerCase().includes(`>${keyword}<`) || html.toLowerCase().includes(`"${keyword}"`)) {
        if (!scrapedData.terpenes.includes(keyword)) scrapedData.terpenes.push(keyword);
      }
    });

    // Effekte aus HTML finden
    const EFFECT_KEYWORDS = ["relaxed", "happy", "euphoric", "uplifted", "creative", "sleepy", "hungry", "focused", "energetic", "calm"];
    EFFECT_KEYWORDS.forEach(keyword => {
      if (html.toLowerCase().includes(`>${keyword}<`) || html.toLowerCase().includes(`"${keyword}"`)) {
        if (!scrapedData.effects.includes(keyword)) scrapedData.effects.push(keyword);
      }
    });

    return NextResponse.json(scrapedData);
  } catch (error: any) {
    console.error("Leafly Import Error:", error);
    return NextResponse.json({ error: "Fehler beim Importieren" }, { status: 500 });
  }
}
