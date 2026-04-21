import { NextResponse } from "next/server";

import { getObjectFromMinio } from "@/lib/minio-storage";
import { parseMediaPath } from "@/lib/storage/media";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const mediaPath = parseMediaPath(path || []);

  if (!mediaPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const object = await getObjectFromMinio(mediaPath.bucket, mediaPath.key);
  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Blob([object.body as BlobPart]), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": object.cacheControl,
      ...(object.contentLength ? { "Content-Length": String(object.contentLength) } : {}),
      ...(object.etag ? { ETag: object.etag } : {}),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
