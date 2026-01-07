/**
 * File Upload Helper
 * Handles saving FormData files to local storage or Vercel Blob Storage
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { put } from '@vercel/blob';

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
 * Uploads file to Vercel Blob Storage
 * @param file - The file to upload
 * @returns The public URL of the uploaded file
 */
async function uploadToBlobStorage(file: File): Promise<string> {
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'bin';
    const filename = `uploads/${timestamp}-${randomString}.${extension}`;

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Vercel Blob Storage
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    });

    return blob.url;
  } catch (error) {
    throw new Error(
      `Failed to upload to Blob Storage: ${error instanceof Error ? error.message : 'Unknown error'}`
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
 * Saves a file from FormData to local storage or Vercel Blob Storage
 * @param file - The file from FormData
 * @returns The public URL path (local) or Blob Storage URL (serverless)
 */
export async function saveUploadedFile(file: File): Promise<string> {
  // In serverless environments (like Vercel), use Blob Storage
  if (isServerlessEnvironment()) {
    try {
      return await uploadToBlobStorage(file);
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // For local development, save to disk
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
  if (!allowedTypes.includes(file.type)) {
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

