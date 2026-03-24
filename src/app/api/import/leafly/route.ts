import { NextRequest, NextResponse } from "next/server";

const extractNames = (items: unknown): string[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        if ("name" in item && typeof item.name === "string") return item.name.trim();
        if ("label" in item && typeof item.label === "string") return item.label.trim();
      }
      return "";
    })
    .filter(Boolean);
};

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.includes("leafly.com/strains/")) {
      return NextResponse.json({ error: "Ungültige Leafly-URL" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) throw new Error("Leafly konnte nicht geladen werden");

    const html = await response.text();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

    let scrapedData: any = {};

    if (nextDataMatch) {
      const fullData = JSON.parse(nextDataMatch[1]);
      // Leafly nutzt oft pageProps.strain oder pageProps.strainData
      const strainData = fullData.props?.pageProps?.strain || fullData.props?.pageProps?.strainData || {};

      scrapedData = {
        name: strainData.name || "",
        type: (strainData.category || "hybrid").toLowerCase(),
        description: strainData.description || "",
        thc: strainData.thc?.avg || strainData.thc || "",
        cbd: strainData.cbd?.avg || strainData.cbd || "",
        terpenes: extractNames(strainData.topTerpenes || strainData.terpenes || []),
        effects: extractNames(strainData.effects || []),
        image_url: strainData.imageUrl || strainData.heroImage || null,
      };
    }

    // Fallback: Meta Tags (falls JSON fehlt)
    if (!scrapedData.name) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      scrapedData.name = titleMatch ? titleMatch[1].split("|")[0].replace("Strain Information", "").trim() : "";
    }

    return NextResponse.json(scrapedData);
  } catch (error: any) {
    console.error("Leafly Import Error:", error);
    return NextResponse.json({ error: "Fehler beim Importieren" }, { status: 500 });
  }
}
