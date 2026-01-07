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

    const validation = validateFile(file, allowedTypes, 50);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Save file to local storage
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload file',
      },
      { status: 500 }
    );
  }
}

