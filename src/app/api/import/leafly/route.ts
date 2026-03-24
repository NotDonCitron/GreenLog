import { NextRequest, NextResponse } from "next/server";

const extractNames = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === "string") return item.trim();
    if (item && typeof item === "object") {
      if ("name" in item && typeof item.name === "string") return item.name.trim();
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
    let scrapedData: any = {};

    // 1. Primär: Next.js JSON Block
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const fullData = JSON.parse(nextDataMatch[1]);
        const strainData = fullData.props?.pageProps?.strain || fullData.props?.pageProps?.strainData || {};

        const getVal = (val: any) => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string') return parseFloat(val.replace('%', ''));
          if (val && typeof val === 'object') return val.avg || val.value || null;
          return null;
        };

        scrapedData = {
          name: strainData.name || "",
          type: (strainData.category || "hybrid").toLowerCase(),
          description: strainData.description || "",
          thc: getVal(strainData.thc),
          cbd: getVal(strainData.cbd),
          terpenes: extractNames(strainData.topTerpenes || strainData.terpenes || []),
          effects: extractNames(strainData.effects || []),
          image_url: strainData.imageUrl || strainData.heroImage || null,
        };
      } catch (e) {
        console.warn("JSON Parse Error, falling back to Meta Tags");
      }
    }

    // 2. Sekundär: Meta-Tags & Regex Fallback (Falls JSON fehlt oder unvollständig)
    if (!scrapedData.name || !scrapedData.thc) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
      const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
      
      if (!scrapedData.name) scrapedData.name = titleMatch ? titleMatch[1].split("|")[0].replace("Strain Information", "").trim() : "";
      if (!scrapedData.description) scrapedData.description = descMatch ? descMatch[1] : "";
      if (!scrapedData.image_url) scrapedData.image_url = imageMatch ? imageMatch[1] : null;

      // THC aus Description extrahieren (Leafly schreibt oft: "...contains X% THC")
      if (!scrapedData.thc && scrapedData.description) {
        const thcRegex = /(\d+(?:\.\d+)?)\s*%\s*thc/i;
        const match = scrapedData.description.match(thcRegex);
        if (match) scrapedData.thc = parseFloat(match[1]);
      }
    }

    return NextResponse.json(scrapedData);
  } catch (error: any) {
    console.error("Leafly Import Error:", error);
    return NextResponse.json({ error: "Fehler beim Importieren" }, { status: 500 });
  }
}
