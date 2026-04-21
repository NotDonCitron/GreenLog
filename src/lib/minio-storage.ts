import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'http://31.97.77.89:9000';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'greenlog';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'GreenLog2026Secure!';
const MINIO_REGION = process.env.MINIO_REGION || 'eu-central-1';
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || 'http://31.97.77.89:9000/strains';

const minioClient = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: MINIO_REGION,
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export async function uploadToMinio(
  bucket: string,
  filename: string,
  file: Buffer | Uint8Array | Blob,
  contentType: string = 'application/octet-stream',
  options: { upsert?: boolean; cacheControl?: string } = {}
): Promise<UploadResult> {
  const key = bucket + '/' + filename;
  
  try {
    if (options.upsert) {
      try {
        await minioClient.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        await minioClient.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      } catch {
        // File does not exist - that is fine
      }
    }

    await minioClient.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        CacheControl: options.cacheControl || '3600',
      })
    );

    const publicUrl = MINIO_PUBLIC_URL + '/' + bucket + '/' + filename;
    return { path: key, publicUrl };
  } catch (error) {
    console.error('[MinIO] Upload failed:', error);
    throw error;
  }
}

export function getMinioPublicUrl(bucket: string, filename: string): string {
  return MINIO_PUBLIC_URL + '/' + bucket + '/' + filename;
}

export async function getSignedMinioUrl(
  bucket: string,
  filename: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: bucket + '/' + filename,
  });
  return getSignedUrl(minioClient, command, { expiresIn });
}

export async function deleteFromMinio(bucket: string, filename: string): Promise<void> {
  await minioClient.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: bucket + '/' + filename,
    })
  );
}

export { minioClient };
