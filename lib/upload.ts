/**
 * File Upload Helper
 * Handles saving FormData files to local storage
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

/**
 * Ensures the upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Saves a file from FormData to the local uploads directory
 * @param file - The file from FormData
 * @returns The public URL path to the uploaded file
 */
export async function saveUploadedFile(file: File): Promise<string> {
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

