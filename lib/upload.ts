/**
 * File Upload Helper
 * Handles saving FormData files to local storage or Aliyun OSS
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import OSS from 'ali-oss';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

/**
 * Checks if we're in a serverless environment (like Vercel)
 */
function isServerlessEnvironment(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL_ENV
  );
}

/**
 * Creates and returns an OSS client instance
 */
function createOSSClient(): OSS {
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
  const region = process.env.ALIYUN_OSS_REGION;
  const bucket = process.env.ALIYUN_OSS_BUCKET;
  const endpoint = process.env.ALIYUN_OSS_ENDPOINT; // Optional, for custom domain

  if (!accessKeyId || !accessKeySecret || !region || !bucket) {
    throw new Error(
      'Aliyun OSS configuration is incomplete. Required: ALIYUN_OSS_ACCESS_KEY_ID, ALIYUN_OSS_ACCESS_KEY_SECRET, ALIYUN_OSS_REGION, ALIYUN_OSS_BUCKET'
    );
  }

  const config = {
    accessKeyId,
    accessKeySecret,
    region,
    bucket,
  } as const;
  
  const ossConfig: {
    accessKeyId: string;
    accessKeySecret: string;
    region: string;
    bucket: string;
    endpoint?: string;
  } = {
    ...config,
    ...(endpoint && { endpoint }),
  };

  return new OSS(ossConfig);
}

/**
 * Uploads file to Aliyun OSS
 * Supports both File objects and ReadableStream for streaming uploads
 * @param file - The file to upload (File or ReadableStream)
 * @returns The public URL of the uploaded file
 */
async function uploadToOSS(file: File | ReadableStream<Uint8Array>): Promise<string> {
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file instanceof File ? (file.name.split('.').pop() || 'bin') : 'bin';
    const filename = `uploads/${timestamp}-${randomString}.${extension}`;
    const mimeType = file instanceof File ? (file.type || 'application/octet-stream') : 'application/octet-stream';

    // Create OSS client
    const client = createOSSClient();

    let buffer: Buffer;
    
    if (file instanceof File) {
      // Convert File to Buffer (for small files or when streaming is not available)
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // Convert ReadableStream to Buffer
      const chunks: Uint8Array[] = [];
      const reader = file.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      
      // Combine all chunks into a single buffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      buffer = Buffer.concat(chunks, totalLength);
    }

    // Upload to OSS
    const result = await client.put(filename, buffer, {
      mime: mimeType,
    });

    console.log('=== File Uploaded to Aliyun OSS ===');
    console.log('Filename:', filename);
    console.log('File size:', buffer.length, 'bytes');
    console.log('File type:', mimeType);
    console.log('OSS URL:', result.url);
    console.log('OSS name:', result.name);
    console.log('OSS uploaded at:', new Date().toISOString());

    // Return the public URL
    // If custom domain is configured, result.url will use it
    // Otherwise, it will be: https://{bucket}.{region}.aliyuncs.com/{filename}
    return result.url;
  } catch (error) {
    throw new Error(
      `Failed to upload to Aliyun OSS: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Ensures the upload directory exists (only for non-serverless environments)
 */
async function ensureUploadDir(): Promise<void> {
  if (isServerlessEnvironment()) {
    return; // Skip in serverless environments
  }
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Saves a file from FormData to local storage or Aliyun OSS
 * @param file - The file from FormData
 * @returns The public URL path (local) or OSS URL (when OSS is configured)
 */
export async function saveUploadedFile(file: File): Promise<string> {
  // Priority 1: Use Aliyun OSS if configured
  // Check if OSS configuration is available
  const ossAccessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID;
  const ossAccessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
  const ossRegion = process.env.ALIYUN_OSS_REGION;
  const ossBucket = process.env.ALIYUN_OSS_BUCKET;

  if (ossAccessKeyId && ossAccessKeySecret && ossRegion && ossBucket) {
    try {
      console.log('Using Aliyun OSS (configuration found)');
      return await uploadToOSS(file);
    } catch (error) {
      throw new Error(
        `Failed to upload file to Aliyun OSS: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Priority 2: Fall back to local disk storage
  console.warn('⚠️  Using local file system storage. Files will not be publicly accessible.');
  console.warn('⚠️  To use Aliyun OSS, configure the following environment variables:');
  console.warn('   - ALIYUN_OSS_ACCESS_KEY_ID');
  console.warn('   - ALIYUN_OSS_ACCESS_KEY_SECRET');
  console.warn('   - ALIYUN_OSS_REGION');
  console.warn('   - ALIYUN_OSS_BUCKET');
  console.warn('   - ALIYUN_OSS_ENDPOINT (optional, for custom domain)');
  
  try {
    await ensureUploadDir();

    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'bin';
    const filename = `${timestamp}-${randomString}.${extension}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write file to disk
    await writeFile(filepath, buffer);

    // Return the public URL path
    return `/uploads/${filename}`;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to save uploaded file: ${error.message}`);
    }
    throw new Error('Failed to save uploaded file');
  }
}

/**
 * Validates file type and size
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types (e.g., ['audio/mpeg', 'video/mp4'])
 * @param maxSizeMB - Maximum file size in MB (default: 50MB)
 */
export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSizeMB: number = 50
): { valid: boolean; error?: string } {
  // Check file type
  // Extract base MIME type (remove parameters like ;codecs=vp9)
  const baseMimeType = file.type.split(';')[0].trim();
  
  // Check if exact type or base type matches
  const isAllowed = allowedTypes.includes(file.type) || allowedTypes.includes(baseMimeType);
  
  if (!isAllowed) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file size (convert MB to bytes)
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

