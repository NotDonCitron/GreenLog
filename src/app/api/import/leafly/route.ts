import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.includes("leafly.com/strains/")) {
      return NextResponse.json(
        { error: "Ungültige Leafly-URL" },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error("Leafly konnte nicht geladen werden");
    }

    const html = await response.text();

    // Extrahiere Daten via Regex (einfacher als Cheerio für den Anfang)
    // Leafly nutzt oft "__NEXT_DATA__" für den State
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    
    let scrapedData: any = {};
    
    if (nextDataMatch) {
      const fullData = JSON.parse(nextDataMatch[1]);
      const strainData = fullData.props?.pageProps?.strain || {};
      
      scrapedData = {
        name: strainData.name || "",
        type: (strainData.category || "hybrid").toLowerCase(),
        description: strainData.description || "",
        thc: strainData.thc?.avg || "",
        terpenes: strainData.topTerpenes?.map((t: any) => t.name) || [],
        effects: strainData.effects?.map((e: any) => e.name) || [],
      };
    } else {
      // Fallback: Einfaches Titel-Scraping
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      scrapedData.name = titleMatch ? titleMatch[1].split("|")[0].trim() : "";
    }

    return NextResponse.json(scrapedData);
  } catch (error: any) {
    console.error("Leafly Import Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Importieren der Daten" },
      { status: 500 }
    );
  }
}
