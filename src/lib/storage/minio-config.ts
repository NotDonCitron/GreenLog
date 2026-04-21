export interface MinioConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  forcePathStyle: boolean;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required MinIO environment variables: ${name}`);
  }
  return value;
}

export function getMinioConfigFromEnv(): MinioConfig {
  return {
    endpoint: readRequiredEnv("MINIO_ENDPOINT"),
    accessKeyId: readRequiredEnv("MINIO_ACCESS_KEY"),
    secretAccessKey: readRequiredEnv("MINIO_SECRET_KEY"),
    region: process.env.MINIO_REGION?.trim() || "eu-central-1",
    forcePathStyle: process.env.MINIO_FORCE_PATH_STYLE !== "false",
  };
}
