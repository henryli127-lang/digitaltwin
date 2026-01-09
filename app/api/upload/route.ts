import { NextRequest, NextResponse } from 'next/server';
import { saveUploadedFile, validateFile } from '@/lib/upload';

/**
 * POST /api/upload
 * Handles file upload to local storage
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (accept audio and video files)
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];

    // Check if OSS is configured - if so, use larger limit (file goes directly to OSS)
    // If not using OSS, use 4MB limit for Vercel serverless function payload
    const hasOSS = !!(
      process.env.ALIYUN_OSS_ACCESS_KEY_ID &&
      process.env.ALIYUN_OSS_ACCESS_KEY_SECRET &&
      process.env.ALIYUN_OSS_REGION &&
      process.env.ALIYUN_OSS_BUCKET
    );
    
    // Important: Even with OSS configured, files still pass through Vercel's API route first,
    // which has a hard 4.5MB payload limit. The file is then uploaded to OSS, but it must
    // first be received by the Vercel function, so we're still limited to ~4MB.
    // 
    // To support larger files, you would need to:
    // 1. Use OSS STS (temporary credentials) to allow direct client-side uploads
    // 2. Or use a different hosting solution without payload limits
    // 
    // For now, we keep the limit at 4MB and optimize video recording settings
    // (lower resolution, bitrate) to ensure 30-second videos stay under this limit.
    const maxSizeMB = 4; // Vercel serverless function payload limit
    const validation = validateFile(file, allowedTypes, maxSizeMB);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Save file to OSS or local storage
    // If OSS is configured, file will be uploaded directly to OSS
    const publicUrl = await saveUploadedFile(file);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Handle specific error cases
    if (error instanceof Error && error.message.includes('Too Large')) {
      return NextResponse.json(
        {
          error: '文件过大。如果配置了 OSS，文件会直接上传到云存储，但仍受 Vercel API 路由的 4.5MB 限制。建议使用 OSS STS 进行直接上传。',
        },
        { status: 413 }
      );
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload file',
      },
      { status: 500 }
    );
  }
}

