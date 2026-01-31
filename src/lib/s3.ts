import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

// Initialize S3 client for Railway buckets
export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'https://storage.railway.app',
  region: process.env.S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: false, // Railway uses virtual-hosted style
})

const BUCKET = process.env.S3_BUCKET || ''
const PREFIX = 'plc-viewer' // Namespace for this app

/**
 * Generate SHA256 hash of file content for deduplication
 */
export function hashFile(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Upload a PLC file to S3
 */
export async function uploadFile(
  projectId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<{ key: string; hash: string; size: number }> {
  const hash = hashFile(fileBuffer)
  const ext = fileName.split('.').pop()?.toLowerCase() || 'bin'
  const key = `${PREFIX}/uploads/${projectId}/${hash}.${ext}`

  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    Metadata: {
      'original-filename': fileName,
      'project-id': projectId,
      'upload-date': new Date().toISOString(),
    },
  }))

  return {
    key,
    hash,
    size: fileBuffer.length,
  }
}

/**
 * Get a presigned URL for downloading a file
 */
export async function getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  })
  return getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }))
}

/**
 * Upload file for ML training dataset (with consent)
 */
export async function uploadForTraining(
  projectId: string,
  fileName: string,
  fileBuffer: Buffer,
  metadata: {
    fileType: 'l5x' | 'acd' | 'rss'
    processorType?: string
    anonymized?: boolean
  }
): Promise<{ key: string; hash: string }> {
  const hash = hashFile(fileBuffer)
  const key = `${PREFIX}/ml-training/${metadata.fileType}/${hash}.${metadata.fileType}`

  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: 'application/octet-stream',
    Metadata: {
      'file-type': metadata.fileType,
      'processor-type': metadata.processorType || 'unknown',
      'anonymized': metadata.anonymized ? 'true' : 'false',
      'source-project': projectId,
      'upload-date': new Date().toISOString(),
    },
  }))

  return { key, hash }
}
