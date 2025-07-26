import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

// Cloudflare R2 configuration
const R2_CONFIG = {
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
}

const r2Client = new S3Client(R2_CONFIG)

// Bucket configuration
const DOCUMENTS_BUCKET = process.env.R2_DOCUMENTS_BUCKET || 'magellan-documents'
// const THUMBNAILS_BUCKET = process.env.R2_THUMBNAILS_BUCKET || 'magellan-thumbnails'

export interface UploadResult {
  key: string
  url: string
  size: number
  contentType: string
  etag: string
}

export interface SignedUrlOptions {
  expiresIn?: number // seconds, default 3600 (1 hour)
  fileName?: string // for download filename
  contentDisposition?: 'inline' | 'attachment'
}

/**
 * Generate a secure file key for R2 storage
 */
export function generateFileKey(
  applicationId: string,
  fileName: string,
  prefix: string = 'documents'
): string {
  const timestamp = Date.now()
  const randomId = crypto.randomBytes(8).toString('hex')
  // const fileExtension = fileName.split('.').pop()
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 100) // Limit filename length
  
  return `${prefix}/${applicationId}/${timestamp}-${randomId}-${sanitizedName}`
}

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadToR2(
  file: File | Buffer,
  key: string,
  options: {
    contentType?: string
    metadata?: Record<string, string>
    bucket?: string
  } = {}
): Promise<UploadResult> {
  try {
    const bucket = options.bucket || DOCUMENTS_BUCKET
    const contentType = options.contentType || 'application/octet-stream'
    
    let body: Buffer
    let size: number
    
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      body = Buffer.from(arrayBuffer)
      size = file.size
    } else {
      body = file
      size = file.length
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: {
        'upload-timestamp': Date.now().toString(),
        ...options.metadata,
      },
      // Security headers
      ServerSideEncryption: 'AES256',
      // Cache control for efficient delivery
      CacheControl: 'max-age=31536000', // 1 year
    })

    const result = await r2Client.send(command)
    
    return {
      key,
      url: `https://${bucket}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`,
      size,
      contentType,
      etag: result.ETag || '',
    }
  } catch (error) {
    console.error('Error uploading to R2:', error)
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate a signed URL for secure file access
 */
export async function generateSignedUrl(
  key: string,
  options: SignedUrlOptions = {}
): Promise<string> {
  try {
    const {
      expiresIn = 3600,
      fileName,
      contentDisposition = 'inline'
    } = options

    const command = new GetObjectCommand({
      Bucket: DOCUMENTS_BUCKET,
      Key: key,
      ResponseContentDisposition: fileName 
        ? `${contentDisposition}; filename="${fileName}"`
        : undefined,
    })

    const signedUrl = await getSignedUrl(r2Client, command, {
      expiresIn,
    })

    return signedUrl
  } catch (error) {
    console.error('Error generating signed URL:', error)
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(
  key: string,
  bucket: string = DOCUMENTS_BUCKET
): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    await r2Client.send(command)
  } catch (error) {
    console.error('Error deleting from R2:', error)
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if a file exists in R2
 */
export async function fileExistsInR2(
  key: string,
  bucket: string = DOCUMENTS_BUCKET
): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    await r2Client.send(command)
    return true
  } catch {
    return false
  }
}

/**
 * Get file metadata from R2
 */
export async function getFileMetadata(
  key: string,
  bucket: string = DOCUMENTS_BUCKET
): Promise<{
  size: number
  lastModified: Date
  contentType: string
  metadata: Record<string, string>
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const result = await r2Client.send(command)
    
    return {
      size: result.ContentLength || 0,
      lastModified: result.LastModified || new Date(),
      contentType: result.ContentType || 'application/octet-stream',
      metadata: result.Metadata || {},
    }
  } catch (error) {
    console.error('Error getting file metadata:', error)
    return null
  }
}

/**
 * Generate thumbnail for images and PDFs
 */
export async function generateThumbnail(
  originalKey: string,
  contentType: string
): Promise<string | null> {
  try {
    // For now, we'll return null to indicate no thumbnail generated
    // This can be extended with actual thumbnail generation logic
    // using libraries like sharp for images or pdf2pic for PDFs
    
    if (contentType.startsWith('image/')) {
      // TODO: Implement image thumbnail generation
      // const thumbnailKey = `thumbnails/${originalKey.replace(/\.[^.]+$/, '.webp')}`
      // ... thumbnail generation logic
      return null
    }
    
    if (contentType === 'application/pdf') {
      // TODO: Implement PDF thumbnail generation
      // const thumbnailKey = `thumbnails/${originalKey.replace(/\.[^.]+$/, '.jpg')}`
      // ... PDF thumbnail generation logic
      return null
    }
    
    return null
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    return null
  }
}

/**
 * Batch delete multiple files
 */
export async function batchDeleteFromR2(
  keys: string[],
  bucket: string = DOCUMENTS_BUCKET
): Promise<void> {
  try {
    // R2 supports batch delete, but for simplicity we'll delete individually
    // This can be optimized with DeleteObjectsCommand for better performance
    const deletePromises = keys.map(key => deleteFromR2(key, bucket))
    await Promise.all(deletePromises)
  } catch (error) {
    console.error('Error batch deleting from R2:', error)
    throw new Error(`Failed to batch delete files: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Validate file type and size before upload
 */
export function validateFile(
  file: File,
  options: {
    maxSizeMB: number
    allowedTypes: string[]
  }
): { valid: boolean; error?: string } {
  // Check file size
  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB > options.maxSizeMB) {
    return {
      valid: false,
      error: `File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed size of ${options.maxSizeMB}MB`
    }
  }

  // Check file type
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  if (!fileExtension || !options.allowedTypes.includes(fileExtension)) {
    return {
      valid: false,
      error: `File format .${fileExtension} is not supported. Accepted formats: ${options.allowedTypes.join(', ')}`
    }
  }

  // Additional MIME type validation
  const allowedMimeTypes: Record<string, string[]> = {
    'pdf': ['application/pdf'],
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'png': ['image/png'],
    'gif': ['image/gif'],
    'doc': ['application/msword'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  }

  const expectedMimeTypes = allowedMimeTypes[fileExtension] || []
  if (expectedMimeTypes.length > 0 && !expectedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File appears to be corrupted or has incorrect format`
    }
  }

  return { valid: true }
}

/**
 * Clean up old files (for maintenance)
 */
export async function cleanupOldFiles(
  _olderThanDays: number = 30,
  _bucket: string = DOCUMENTS_BUCKET
): Promise<number> {
  // This would require listing objects and checking their last modified date
  // Implementation depends on specific cleanup requirements
  // For now, return 0 to indicate no files cleaned
  return 0
}