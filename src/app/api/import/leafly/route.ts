import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonSuccess, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import dns from "dns";
import net from "net";

const ADMIN_IDS = (process.env.NEXT_PUBLIC_APP_ADMIN_IDS || "").split(",").filter(Boolean);

const LEAFLY_HOSTS = new Set(["leafly.com", "www.leafly.com"]);

const PRIVATE_IP_RANGES = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^127\./,
    /^localhost$/i,
    /^::1$/,
    /^fe80:/i,
    /^fc00:/i,
    /^fd00:/i,
];

const isPrivateIp = (ip: string): boolean => {
    return PRIVATE_IP_RANGES.some((pattern) => pattern.test(ip));
};

const verifyLeaflyHost = async (hostname: string): Promise<boolean> => {
    if (!LEAFLY_HOSTS.has(hostname)) return false;

    try {
        const addresses = await dns.promises.resolve(hostname);
        return addresses.every((addr) => !isPrivateIp(addr));
    } catch {
        return false;
    }
};

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
            if ("name" in item && typeof (item as any).name === "string") return (item as any).name.trim();
            if ("displayName" in item && typeof (item as any).displayName === "string") return (item as any).displayName.trim();
            if ("label" in item && typeof (item as any).label === "string") return (item as any).label.trim();
        }
        return "";
    }).filter(Boolean);
};

const parseLeaflyUrl = (rawUrl: unknown): string | null => {
    if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
    try {
        const parsedUrl = new URL(rawUrl.trim());
        const isValidHost = LEAFLY_HOSTS.has(parsedUrl.hostname);
        const isValidPath = parsedUrl.pathname.startsWith("/strains/");
        if (!isValidHost || !isValidPath) return null;
        return parsedUrl.toString();
    } catch { return null; }
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

const uniqueNormalized = (values: string[]) =>
    Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export async function POST(req: NextRequest) {
    try {
        const auth = await authenticateRequest(req, getAuthenticatedClient);
        if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
        const { user } = auth;

        if (!ADMIN_IDS.includes(user.id)) {
            return jsonError("Forbidden", 403);
        }

        const body = await req.json();
        const url = parseLeaflyUrl(body?.url);

        if (!url) {
            return jsonError("Ungültige Leafly-URL", 400);
        }

        // SSRF protection: verify the resolved IP is not private/internal
        const parsedUrl = new URL(url);
        const hostVerified = await verifyLeaflyHost(parsedUrl.hostname);
        if (!hostVerified) {
            return jsonError("Host-Verifizierung fehlgeschlagen", 400);
        }

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
        });

        if (!response.ok) throw new Error("Leafly konnte nicht geladen werden");

        const html = await response.text();
        const lowerHtml = html.toLowerCase();
        const scrapedData: LeaflyImportResponse = {
            thc: null, cbd: null, terpenes: [], flavors: [], effects: [], image_url: null,
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
                    ...extractNames((strainData as any).topTerpenes || []),
                    ...extractNames((strainData as any).terpenes || []),
                ]);
                const extractedFlavors = uniqueNormalized([
                    ...extractNames((strainData as any).flavors || []),
                    ...extractNames((strainData as any).flavorProfiles || []),
                ]);
                const extractedEffects = uniqueNormalized([
                    ...extractNames((strainData as any).feelings || []),
                    ...extractNames((strainData as any).effects || []),
                    ...extractNames((strainData as any).topEffects || []),
                ]);

                scrapedData.name = typeof (strainData as any).name === "string" ? (strainData as any).name : "";
                scrapedData.type = typeof (strainData as any).category === "string"
                    ? (strainData as any).category.toLowerCase() : "hybrid";
                scrapedData.description = typeof (strainData as any).description === "string"
                    ? (strainData as any).description : "";
                scrapedData.thc = getNumericValue((strainData as any).thc);
                scrapedData.cbd = getNumericValue((strainData as any).cbd);
                scrapedData.terpenes = extractedTerpenes;
                scrapedData.flavors = extractedFlavors;
                scrapedData.effects = extractedEffects;
                scrapedData.image_url = typeof (strainData as any).imageUrl === "string"
                    ? (strainData as any).imageUrl
                    : typeof (strainData as any).heroImage === "string"
                        ? (strainData as any).heroImage : null;
            } catch (error) {
                console.error("Leafly __NEXT_DATA__ parse error:", error);
            }
        }

        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
        const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);

        if (!scrapedData.name) scrapedData.name = titleMatch
            ? titleMatch[1].split("|")[0].replace("Strain Information", "").trim() : "";
        if (!scrapedData.description) scrapedData.description = descMatch ? descMatch[1] : "";
        if (!scrapedData.image_url) scrapedData.image_url = imageMatch ? imageMatch[1] : null;

        if (scrapedData.thc === null && scrapedData.description) {
            const thcMatch = scrapedData.description.match(/(\d+(?:\.\d+)?)\s*%\s*thc/i);
            if (thcMatch) scrapedData.thc = Number.parseFloat(thcMatch[1]);
        }

        const TASTE_KEYWORDS = ["earthy", "sweet", "citrus", "lemon", "pine", "berry", "spicy", "fruity",
            "diesel", "skunk", "pepper", "grape", "tropical", "vanilla", "cheese", "mint", "coffee", "nutty"];
        TASTE_KEYWORDS.forEach((keyword) => {
            if (lowerHtml.includes(`>${keyword}<`) || lowerHtml.includes(`"${keyword}"`) || lowerHtml.includes(` ${keyword} `)) {
                if (!scrapedData.flavors.some((v) => v.toLowerCase() === keyword)) {
                    scrapedData.flavors.push(keyword);
                }
            }
        });

        const EFFECT_KEYWORDS = ["relaxed", "happy", "euphoric", "uplifted", "creative", "sleepy", "hungry",
            "focused", "energetic", "calm", "giggly", "talkative", "tingly"];
        EFFECT_KEYWORDS.forEach((keyword) => {
            if (lowerHtml.includes(`>${keyword}<`) || lowerHtml.includes(`"${keyword}"`) || lowerHtml.includes(` ${keyword} `)) {
                if (!scrapedData.effects.some((v) => v.toLowerCase() === keyword)) {
                    scrapedData.effects.push(keyword);
                }
            }
        });

        return jsonSuccess({
            ...scrapedData,
            terpenes: uniqueNormalized(scrapedData.terpenes),
            flavors: uniqueNormalized(scrapedData.flavors),
            effects: uniqueNormalized(scrapedData.effects),
        });

    } catch (error: unknown) {
        console.error("Leafly Import Error:", error);
        return jsonError("Fehler beim Importieren", 500);
    }
}
