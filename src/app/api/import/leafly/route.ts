import { NextRequest, NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

type LeaflyImportResponse = {
  name?: string;
  type?: string;
  description?: string;
  thc: number | null;
  cbd: number | null;
  terpenes: string[];
  flavors: string[];
  effects: string[];
  image_url: string | null;
};

const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null;

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

const parseLeaflyUrl = (rawUrl: unknown) => {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return null;
  }

  try {
    const parsedUrl = new URL(rawUrl.trim());
    const isValidHost = parsedUrl.hostname === "leafly.com" || parsedUrl.hostname === "www.leafly.com";
    const isValidPath = parsedUrl.pathname.startsWith("/strains/");

    if (!isValidHost || !isValidPath) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

const getNumericValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const match = value.match(/(\d+(?:\.\d+)?)/);
    return match ? Number.parseFloat(match[1]) : null;
  }

  if (value && typeof value === "object") {
    const valueRecord = value as Record<string, unknown>;
    return getNumericValue(valueRecord.avg ?? valueRecord.value ?? valueRecord.average ?? null);
  }

  return null;
};

const uniqueNormalized = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = parseLeaflyUrl(body?.url);

    if (!url) {
      return NextResponse.json({ error: "Ungültige Leafly-URL" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    });

    if (!response.ok) throw new Error("Leafly konnte nicht geladen werden");

    const html = await response.text();
    const lowerHtml = html.toLowerCase();
    const scrapedData: LeaflyImportResponse = {
      thc: null,
      cbd: null,
      terpenes: [],
      flavors: [],
      effects: [],
      image_url: null,
    };

    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const fullData = JSON.parse(nextDataMatch[1]) as unknown;
        const propsData = isRecord(fullData) && isRecord(fullData.props) ? fullData.props : null;
        const pagePropsData = propsData && isRecord(propsData.pageProps) ? propsData.pageProps : null;
        const strainData = pagePropsData && isRecord(pagePropsData.strain)
          ? pagePropsData.strain
          : pagePropsData && isRecord(pagePropsData.strainData)
            ? pagePropsData.strainData
            : pagePropsData && isRecord(pagePropsData.initialStrain)
              ? pagePropsData.initialStrain
              : {};

        const extractedTerpenes = uniqueNormalized([
          ...extractNames(strainData.topTerpenes || []),
          ...extractNames(strainData.terpenes || []),
        ]);

        const extractedFlavors = uniqueNormalized([
          ...extractNames(strainData.flavors || []),
          ...extractNames(strainData.flavorProfiles || []),
        ]);

        const extractedEffects = uniqueNormalized([
          ...extractNames(strainData.feelings || []),
          ...extractNames(strainData.effects || []),
          ...extractNames(strainData.topEffects || []),
        ]);

        scrapedData.name = typeof strainData.name === "string" ? strainData.name : "";
        scrapedData.type = typeof strainData.category === "string" ? strainData.category.toLowerCase() : "hybrid";
        scrapedData.description = typeof strainData.description === "string" ? strainData.description : "";
        scrapedData.thc = getNumericValue(strainData.thc);
        scrapedData.cbd = getNumericValue(strainData.cbd);
        scrapedData.terpenes = extractedTerpenes;
        scrapedData.flavors = extractedFlavors;
        scrapedData.effects = extractedEffects;
        scrapedData.image_url = typeof strainData.imageUrl === "string"
          ? strainData.imageUrl
          : typeof strainData.heroImage === "string"
            ? strainData.heroImage
            : null;
      } catch (error) {
        console.error("Leafly __NEXT_DATA__ parse error:", error);
      }
    }

    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
    const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);

    if (!scrapedData.name) scrapedData.name = titleMatch ? titleMatch[1].split("|")[0].replace("Strain Information", "").trim() : "";
    if (!scrapedData.description) scrapedData.description = descMatch ? descMatch[1] : "";
    if (!scrapedData.image_url) scrapedData.image_url = imageMatch ? imageMatch[1] : null;

    if (scrapedData.thc === null && scrapedData.description) {
      const thcMatch = scrapedData.description.match(/(\d+(?:\.\d+)?)\s*%\s*thc/i);
      if (thcMatch) scrapedData.thc = Number.parseFloat(thcMatch[1]);
    }

    const TASTE_KEYWORDS = ["earthy", "sweet", "citrus", "lemon", "pine", "berry", "spicy", "fruity", "diesel", "skunk", "pepper", "grape", "tropical", "vanilla", "cheese", "mint", "coffee", "nutty"];
    TASTE_KEYWORDS.forEach((keyword) => {
      if (lowerHtml.includes(`>${keyword}<`) || lowerHtml.includes(`"${keyword}"`) || lowerHtml.includes(` ${keyword} `)) {
        if (!scrapedData.flavors.some((value) => value.toLowerCase() === keyword)) {
          scrapedData.flavors.push(keyword);
        }
      }
    });

    const EFFECT_KEYWORDS = ["relaxed", "happy", "euphoric", "uplifted", "creative", "sleepy", "hungry", "focused", "energetic", "calm", "giggly", "talkative", "tingly"];
    EFFECT_KEYWORDS.forEach((keyword) => {
      if (lowerHtml.includes(`>${keyword}<`) || lowerHtml.includes(`"${keyword}"`) || lowerHtml.includes(` ${keyword} `)) {
        if (!scrapedData.effects.some((value) => value.toLowerCase() === keyword)) {
          scrapedData.effects.push(keyword);
        }
      }
    });

    return NextResponse.json({
      ...scrapedData,
      terpenes: uniqueNormalized(scrapedData.terpenes),
      flavors: uniqueNormalized(scrapedData.flavors),
      effects: uniqueNormalized(scrapedData.effects),
    });
  } catch (error: unknown) {
    console.error("Leafly Import Error:", error);
    return NextResponse.json({ error: "Fehler beim Importieren" }, { status: 500 });
  }
}
