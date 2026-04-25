const PUBLIC_MEDIA_PREFIX = "/media/";
const PUBLIC_MEDIA_STORAGE_ORIGIN = "https://storage.cannalog.fun";

const KNOWN_BUCKETS = ["strains", "user-strains", "avatars", "org-logos", "grow-entry-photos"];

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

  // Bucket paths without a leading slash are storage keys. Leading-slash paths
  // are app routes/assets unless they use the explicit /media proxy prefix.
  const startsWithBucket = !trimmed.startsWith("/") && KNOWN_BUCKETS.some(bucket => trimmed.startsWith(`${bucket}/`));

  if (startsWithBucket) {
    return resolvePublicMediaPath(trimmed);
  }

  // S3 object keys from grow-entry-photos: user_id/grow_id/file.ext (no bucket prefix)
  // These are MinIO keys that need the grow-entry-photos bucket prepended
  if (!trimmed.startsWith("/") && !trimmed.startsWith("http") && trimmed.includes("/")) {
    const segments = trimmed.split("/");
    if (segments.length >= 3 && /^[0-9a-f]{8}-/i.test(segments[0])) {
      return resolvePublicMediaPath(`grow-entry-photos/${trimmed}`);
    }
  }

  return trimmed;
}
