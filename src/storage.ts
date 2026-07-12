import { Client as MinioClient } from 'minio';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = Number(process.env.MINIO_PORT || 9000);
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || '';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || '';
export const MINIO_BUCKET = process.env.MINIO_BUCKET || 'gegcompeticoes-docs';

export const storageEnabled = Boolean(MINIO_ACCESS_KEY && MINIO_SECRET_KEY);

export const minioClient = storageEnabled
  ? new MinioClient({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: MINIO_USE_SSL,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    })
  : null;

export async function ensureBucket(): Promise<void> {
  if (!minioClient) return;
  const exists = await minioClient.bucketExists(MINIO_BUCKET).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(MINIO_BUCKET);
  }
}

export async function uploadDocument(objectKey: string, buffer: Buffer, mimeType: string): Promise<void> {
  if (!minioClient) throw new Error('Armazenamento de documentos não está configurado.');
  await minioClient.putObject(MINIO_BUCKET, objectKey, buffer, buffer.length, { 'Content-Type': mimeType });
}

export async function getDocumentDownloadUrl(objectKey: string): Promise<string> {
  if (!minioClient) throw new Error('Armazenamento de documentos não está configurado.');
  return minioClient.presignedGetObject(MINIO_BUCKET, objectKey, 5 * 60);
}
