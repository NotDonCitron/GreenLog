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

    // 1. Primär: Next.js JSON Block (Am sichersten)
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

    // 2. Sekundär: Meta-Tags & Regex Fallback (Gezielte Suche)
    if (!scrapedData.name || !scrapedData.thc) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
      const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
      
      if (!scrapedData.name) scrapedData.name = titleMatch ? titleMatch[1].split("|")[0].replace("Strain Information", "").trim() : "";
      if (!scrapedData.description) scrapedData.description = descMatch ? descMatch[1] : "";
      if (!scrapedData.image_url) scrapedData.image_url = imageMatch ? imageMatch[1] : null;

      if (!scrapedData.thc && scrapedData.description) {
        const thcMatch = scrapedData.description.match(/(\d+(?:\.\d+)?)\s*%\s*thc/i);
        if (thcMatch) scrapedData.thc = parseFloat(thcMatch[1]);
      }
    }

    // 3. Keyword-Erkennung nur, wenn JSON unvollständig war (Vorsichtige Suche)
    if (scrapedData.effects.length === 0) {
        const EFFECT_KEYWORDS = ["relaxed", "happy", "euphoric", "uplifted", "creative", "sleepy", "hungry", "focused", "energetic", "calm"];
        EFFECT_KEYWORDS.forEach(kw => {
            // Wir suchen nach dem Wort in Anführungszeichen (wie im JSON) oder in speziellen Containern
            if (html.includes(`"${kw}"`)) scrapedData.effects.push(kw);
        });
    }

    return NextResponse.json(scrapedData);
  } catch (error: any) {
    console.error("Leafly Import Error:", error);
    return NextResponse.json({ error: "Fehler beim Importieren" }, { status: 500 });
  }
}
