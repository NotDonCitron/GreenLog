import { NextRequest } from "next/server";
import dns from "dns";
import { jsonError, jsonSuccess, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { buildDefaultSourceNotes, detectSourceWarnings } from "@/lib/strains/source-policy";

const ADMIN_IDS = (process.env.APP_ADMIN_IDS || process.env.NEXT_PUBLIC_APP_ADMIN_IDS || "")
  .split(",")
  .filter(Boolean);

const ALLBUD_HOSTS = new Set(["allbud.com", "www.allbud.com"]);

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

const STRAIN_TYPES = ["indica", "sativa", "hybrid", "ruderalis"] as const;
const FLAVOR_KEYWORDS = [
  "earthy",
  "sweet",
  "citrus",
  "lemon",
  "pine",
  "berry",
  "spicy",
  "fruity",
  "diesel",
  "grape",
  "tropical",
  "vanilla",
  "mint",
  "coffee",
];
const EFFECT_KEYWORDS = [
  "relaxed",
  "happy",
  "euphoric",
  "uplifted",
  "creative",
  "sleepy",
  "hungry",
  "focused",
  "energetic",
  "calm",
  "giggly",
  "talkative",
  "tingly",
];

type AllBudImportResponse = {
  name?: string;
  type?: string;
  description?: string;
  thc: number | null;
  cbd: number | null;
  terpenes: string[];
  flavors: string[];
  effects: string[];
  image_url: string | null;
  primary_source: "allbud";
  source_notes: string | null;
  source_warnings: string[];
};

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((pattern) => pattern.test(ip));
}

async function verifyAllBudHost(hostname: string): Promise<boolean> {
  if (!ALLBUD_HOSTS.has(hostname)) return false;

  try {
    const addresses = await dns.promises.resolve(hostname);
    return addresses.every((addr) => !isPrivateIp(addr));
  } catch {
    return false;
  }
}

function parseAllBudUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;

  try {
    const parsedUrl = new URL(rawUrl.trim());
    const isValidHost = ALLBUD_HOSTS.has(parsedUrl.hostname);
    const isValidPath = parsedUrl.pathname.startsWith("/marijuana-strains/");
    if (!isValidHost || !isValidPath) return null;
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(text: string): string {
  return decodeHtml(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function uniqueNormalized(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function findKeywords(html: string, keywords: string[]): string[] {
  const lower = html.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword));
}

function parseNumericRange(html: string, label: string): number | null {
  const pattern = new RegExp(`${label}[^\\d]*(\\d+(?:\\.\\d+)?)`, "i");
  const match = html.match(pattern);
  return match ? Number.parseFloat(match[1]) : null;
}

function parseType(html: string): string {
  const normalized = html.toLowerCase();
  for (const type of STRAIN_TYPES) {
    if (normalized.includes(`${type}-dominant`) || normalized.includes(` ${type} `)) {
      return type;
    }
  }
  return "hybrid";
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, getAuthenticatedClient);
    if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
    const { user } = auth;

    if (!ADMIN_IDS.includes(user.id)) {
      return jsonError("Forbidden", 403);
    }

    const body = await req.json();
    const url = parseAllBudUrl(body?.url);

    if (!url) {
      return jsonError("Ungültige AllBud-URL", 400);
    }

    const parsedUrl = new URL(url);
    const hostVerified = await verifyAllBudHost(parsedUrl.hostname);
    if (!hostVerified) {
      return jsonError("Host-Verifizierung fehlgeschlagen", 400);
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) throw new Error("AllBud konnte nicht geladen werden");

    const html = await response.text();
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
    const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
    const bodyMatch = html.match(/<div class="node__content"[^>]*>([\s\S]*?)<\/div>/i);

    const description = bodyMatch ? stripTags(bodyMatch[1]) : descMatch?.[1] ? decodeHtml(descMatch[1]) : "";
    const sourceNotes = buildDefaultSourceNotes("allbud");

    const scrapedData: AllBudImportResponse = {
      name: titleMatch ? decodeHtml(titleMatch[1].split("|")[0].replace("Marijuana Strain", "").trim()) : "",
      type: parseType(html),
      description,
      thc: parseNumericRange(html, "THC"),
      cbd: parseNumericRange(html, "CBD"),
      terpenes: [],
      flavors: uniqueNormalized(findKeywords(`${description} ${html}`, FLAVOR_KEYWORDS)),
      effects: uniqueNormalized(findKeywords(`${description} ${html}`, EFFECT_KEYWORDS)),
      image_url: imageMatch ? decodeHtml(imageMatch[1]) : null,
      primary_source: "allbud",
      source_notes: sourceNotes,
      source_warnings: detectSourceWarnings({
        primarySource: "allbud",
        imageUrl: imageMatch?.[1] ? decodeHtml(imageMatch[1]) : null,
        sourceNotes,
      }),
    };

    return jsonSuccess(scrapedData);
  } catch (error: unknown) {
    console.error("AllBud Import Error:", error);
    return jsonError("Fehler beim Importieren", 500);
  }
}
