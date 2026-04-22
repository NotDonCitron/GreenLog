function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function parseUrl(value: string | null): URL | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    // Hard-cut legacy domain: never accept greenlog.app as active runtime site URL.
    if (host === "greenlog.app" || host.endsWith(".greenlog.app")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const fallbackSiteUrl = "https://green-log-two.vercel.app";
const configuredSiteUrl =
  readEnv("NEXT_PUBLIC_SITE_URL") ||
  readEnv("NEXT_PUBLIC_APP_URL") ||
  fallbackSiteUrl;

const parsedPublicSiteUrl = parseUrl(configuredSiteUrl) || new URL(fallbackSiteUrl);

export const PUBLIC_SITE_URL = parsedPublicSiteUrl.origin;
export const PUBLIC_SITE_HOST = parsedPublicSiteUrl.host;

const fallbackContactEmail = "admin@cannalog.fun";

export const CONTACT_EMAIL = readEnv("CONTACT_EMAIL") || fallbackContactEmail;
export const PRIVACY_EMAIL = readEnv("PRIVACY_EMAIL") || CONTACT_EMAIL;
export const SUPPORT_EMAIL = readEnv("SUPPORT_EMAIL") || CONTACT_EMAIL;
