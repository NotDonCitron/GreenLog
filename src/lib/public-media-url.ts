const PUBLIC_MEDIA_PREFIX = "/media/";

function readPublicSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "";

  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

export function resolvePublicMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith(PUBLIC_MEDIA_PREFIX)) return trimmed;

  const origin = readPublicSiteOrigin();
  return origin ? `${origin}${trimmed}` : trimmed;
}
