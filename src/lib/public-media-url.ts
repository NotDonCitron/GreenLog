const PUBLIC_MEDIA_PREFIX = "/media/";
const PUBLIC_MEDIA_STORAGE_ORIGIN = "https://storage.cannalog.fun";

const KNOWN_BUCKETS = ["strains", "user-strains", "avatars", "org-logos"];

function resolvePublicMediaPath(path: string): string {
  // If it starts with /media/, strip it
  if (path.startsWith(PUBLIC_MEDIA_PREFIX)) {
    const storagePath = path.slice(PUBLIC_MEDIA_PREFIX.length);
    return `${PUBLIC_MEDIA_STORAGE_ORIGIN}/${storagePath}`;
  }
  
  // If it starts with a leading slash, strip it for the storage URL
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${PUBLIC_MEDIA_STORAGE_ORIGIN}/${cleanPath}`;
}

/**
 * Resolves a media path to a full URL pointing to the public storage origin.
 * This is crucial for Vercel Previews where same-origin /media requests are blocked.
 */
export function resolvePublicMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Already an absolute URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // If it starts with /media/, it's definitely one of ours
  if (trimmed.startsWith(PUBLIC_MEDIA_PREFIX)) {
    return resolvePublicMediaPath(trimmed);
  }

  // Check if it starts with one of our known buckets (with or without leading slash)
  const pathToCheck = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  const startsWithBucket = KNOWN_BUCKETS.some(bucket => pathToCheck.startsWith(`${bucket}/`));

  if (startsWithBucket) {
    return resolvePublicMediaPath(trimmed);
  }

  // Fallback: if it's a relative path that looks like it belongs to us, try to resolve it anyway
  return trimmed;
}
