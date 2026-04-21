import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getMinioConfigFromEnv } from "@/lib/storage/minio-config";
import { buildMediaUrl, isPublicMediaBucket, sanitizeObjectKey } from "@/lib/storage/media";

let minioClient: S3Client | null = null;

function getMinioClient(): S3Client {
  if (minioClient) return minioClient;

  const config = getMinioConfigFromEnv();
  minioClient = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  });

  return minioClient;
}

export interface UploadResult {
  bucket: string;
  key: string;
  path: string;
  publicUrl: string | null;
}

export interface MinioObjectResult {
  body: Uint8Array;
  contentType: string;
  cacheControl: string;
  contentLength?: number;
  etag?: string;
}

async function bodyToUint8Array(body: unknown): Promise<Uint8Array> {
  if (!body) return new Uint8Array();

  if (body instanceof Uint8Array) return body;

  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return new Uint8Array(await body.arrayBuffer());
  }

  if (typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function") {
    return (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  }

  const stream = body as AsyncIterable<Uint8Array>;
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

export async function uploadToMinio(
  bucket: string,
  filename: string,
  file: Buffer | Uint8Array | Blob,
  contentType = "application/octet-stream",
  options: { upsert?: boolean; cacheControl?: string } = {}
): Promise<UploadResult> {
  const key = sanitizeObjectKey(filename);
  const client = getMinioClient();

  try {
    if (!options.upsert) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        throw new Error("Object already exists");
      } catch (error) {
        if (error instanceof Error && error.message === "Object already exists") throw error;
      }
    }

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        CacheControl: options.cacheControl || "public, max-age=31536000, immutable",
      })
    );

    const publicUrl = isPublicMediaBucket(bucket) ? buildMediaUrl(bucket, key) : null;
    return { bucket, key, path: `${bucket}/${key}`, publicUrl };
  } catch (error) {
    console.error("[MinIO] Upload failed:", error);
    throw error;
  }
}

export function getMinioPublicUrl(bucket: string, filename: string): string | null {
  const key = sanitizeObjectKey(filename);
  return isPublicMediaBucket(bucket) ? buildMediaUrl(bucket, key) : null;
}

export async function getSignedMinioUrl(
  bucket: string,
  filename: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: sanitizeObjectKey(filename),
  });
  return getSignedUrl(getMinioClient(), command, { expiresIn });
}

export async function getObjectFromMinio(bucket: string, filename: string): Promise<MinioObjectResult | null> {
  try {
    const response = await getMinioClient().send(
      new GetObjectCommand({ Bucket: bucket, Key: sanitizeObjectKey(filename) })
    );

    return {
      body: await bodyToUint8Array(response.Body),
      contentType: response.ContentType || "application/octet-stream",
      cacheControl: response.CacheControl || "public, max-age=31536000, immutable",
      contentLength: response.ContentLength,
      etag: response.ETag,
    };
  } catch (error) {
    const maybeError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (maybeError.name === "NoSuchKey" || maybeError.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function deleteFromMinio(bucket: string, filename: string): Promise<void> {
  await getMinioClient().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: sanitizeObjectKey(filename),
    })
  );
}

export function __resetMinioClientForTests() {
  minioClient = null;
}
