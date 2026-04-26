function readImagePublicBasePath(): string {
  const value = process.env.IMAGE_PUBLIC_BASE_PATH?.trim();
  return value && value.length > 0 ? value : "/media";
}

export const PUBLIC_MEDIA_BUCKETS = [
  "strains",
  "user-strains",
  "avatars",
  "org-logos",
  "grows",
] as const;

export type PublicMediaBucket = (typeof PUBLIC_MEDIA_BUCKETS)[number];

const publicBucketSet = new Set<string>(PUBLIC_MEDIA_BUCKETS);

export function isPublicMediaBucket(bucket: string): bucket is PublicMediaBucket {
  return publicBucketSet.has(bucket);
}

export function sanitizeObjectKey(key: string): string {
  const normalized = key
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("/");

  const parts = normalized.split("/");
  if (!normalized || parts.some((part) => part === "." || part === "..")) {
    throw new Error("Invalid object key");
  }

  return normalized;
}

function normalizedBasePath(): string {
  const basePath = readImagePublicBasePath();
  const path = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return path.replace(/\/+$/, "") || "/media";
}

export function buildMediaUrl(bucket: PublicMediaBucket, key: string): string {
  return `${normalizedBasePath()}/${bucket}/${sanitizeObjectKey(key)}`;
}

export function parseMediaPath(parts: string[]): { bucket: PublicMediaBucket; key: string } | null {
  const [bucket, ...keyParts] = parts;
  if (!bucket || !isPublicMediaBucket(bucket) || keyParts.length === 0) return null;

  try {
    return { bucket, key: sanitizeObjectKey(keyParts.join("/")) };
  } catch {
    return null;
  }
}

export function storagePathFromMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const base = normalizedBasePath();
  let pathname: string;

  if (value.startsWith("/")) {
    pathname = value;
  } else {
    try {
      pathname = new URL(value).pathname;
    } catch {
      return null;
    }
  }

  if (!pathname.startsWith(`${base}/`)) return null;
  const parsed = parseMediaPath(pathname.slice(base.length + 1).split("/"));
  return parsed ? `${parsed.bucket}/${parsed.key}` : null;
}
