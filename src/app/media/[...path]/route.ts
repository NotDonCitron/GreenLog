import { NextResponse } from "next/server";

import { getObjectFromMinio } from "@/lib/minio-storage";
import { parseMediaPath } from "@/lib/storage/media";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const SUPABASE_STORAGE_BASE = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public`
  : "";

const ALT_EXTENSIONS = ["jpg", "png", "webp", "gif"];

function extFromKey(key: string): string | null {
  const match = key.match(/\.([a-z0-9]+)$/i);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

function keyWithExt(key: string, ext: string): string {
  const dot = key.lastIndexOf(".");
  const base = dot > 0 ? key.slice(0, dot) : key;
  return `${base}.${ext}`;
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const ALLOWED_CONTENT_TYPES = new Set(Object.values(CONTENT_TYPES));

function safeContentType(reported: string | undefined, key: string): string {
  if (reported && ALLOWED_CONTENT_TYPES.has(reported)) return reported;
  const ext = extFromKey(key);
  return CONTENT_TYPES[ext || ""] || "application/octet-stream";
}

async function fetchFromSupabase(
  bucket: string,
  key: string
): Promise<{ response: Response; url: string } | null> {
  if (!SUPABASE_STORAGE_BASE) {
    console.warn("[media] SUPABASE_STORAGE_BASE is empty, skipping Supabase fallback");
    return null;
  }
  const url = `${SUPABASE_STORAGE_BASE}/${bucket}/${key}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.warn(`[media] Supabase ${url} → ${res.status}`);
      return null;
    }
    return { response: res, url };
  } catch (err) {
    console.warn(`[media] Supabase fetch error for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const mediaPath = parseMediaPath(path || []);

  if (!mediaPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { bucket, key } = mediaPath;
  const requestedExt = extFromKey(key);

  const minioKeys = [key];
  if (requestedExt) {
    for (const alt of ALT_EXTENSIONS) {
      if (alt !== requestedExt) minioKeys.push(keyWithExt(key, alt));
    }
  }

  for (const tryKey of minioKeys) {
    try {
      const object = await getObjectFromMinio(bucket, tryKey);
      if (object) {
        return new NextResponse(new Blob([object.body as BlobPart]), {
          status: 200,
          headers: {
            "Content-Type": safeContentType(object.contentType, tryKey),
            "Cache-Control": object.cacheControl,
            ...(object.contentLength
              ? { "Content-Length": String(object.contentLength) }
              : {}),
            ...(object.etag ? { ETag: object.etag } : {}),
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    } catch (err) {
      console.warn(`[media] MinIO error for ${bucket}/${tryKey}:`, err instanceof Error ? err.message : String(err));
    }
  }

  const supaKeys = [key];
  if (requestedExt) {
    for (const alt of ALT_EXTENSIONS) {
      if (alt !== requestedExt) supaKeys.push(keyWithExt(key, alt));
    }
  }

  for (const tryKey of supaKeys) {
    const result = await fetchFromSupabase(bucket, tryKey);
    if (result) {
      const body = await result.response.arrayBuffer();
      const ext = extFromKey(tryKey);
      const contentType = CONTENT_TYPES[ext || ""] || "application/octet-stream";
      return new NextResponse(new Blob([body]), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(body.byteLength),
          "X-Content-Type-Options": "nosniff",
          "X-Fallback-Source": "supabase-storage",
        },
      });
    }
  }

  console.error(`[media] All sources exhausted for ${bucket}/${key}`);
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
