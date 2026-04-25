const PUBLIC_MEDIA_PREFIX = "/media/";
const PUBLIC_MEDIA_STORAGE_ORIGIN = "https://storage.cannalog.fun";

function resolvePublicMediaPath(path: string): string {
  const storagePath = path.slice(PUBLIC_MEDIA_PREFIX.length);
  return `${PUBLIC_MEDIA_STORAGE_ORIGIN}/${storagePath}`;
}

export function resolvePublicMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith(PUBLIC_MEDIA_PREFIX)) return trimmed;

  return resolvePublicMediaPath(trimmed);
}
