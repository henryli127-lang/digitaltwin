import { NextRequest, NextResponse } from 'next/server';
import { cloneVoice, cloneFace } from '@/lib/api-services';
import { saveUploadedFile, validateFile } from '@/lib/upload';

/**
 * POST /api/digital-human/create
 * Handles voice and face cloning requests
 * 
 * Expected form data:
 * - type: 'voice' | 'face'
 * - file: File (audio for voice, video for face)
 * - name: string (optional, name for the clone)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const type = formData.get('type') as string;
    const file = formData.get('file') as File;
    const name = (formData.get('name') as string) || 'default';

    if (!type || !['voice', 'face'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "voice" or "face"' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file based on type
    if (type === 'voice') {
      const allowedTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/webm',
      ];
      const validation = validateFile(file, allowedTypes, 50);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    } else if (type === 'face') {
      const allowedTypes = [
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
    }

    // Save file to local storage or Vercel Blob Storage
    const fileUrl = await saveUploadedFile(file);
    
    // Determine the full file URL
    let fullFileUrl: string;
    
    // Check if it's already a full URL (from Blob Storage) or a relative path (local)
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      // Already a full URL from Blob Storage
      fullFileUrl = fileUrl;
    } else {
      // Local development: construct full URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      fullFileUrl = `${baseUrl}${fileUrl}`;

      // Validate that the URL is publicly accessible (not localhost)
      const isDevelopment = process.env.NODE_ENV === 'development';
      if ((baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) && !isDevelopment) {
        return NextResponse.json(
          { 
            error: '音频 URL 无法被外部访问。请设置 NEXT_PUBLIC_BASE_URL 为公网可访问的 URL。',
            hint: '如果已部署到 Vercel，请确保 NEXT_PUBLIC_BASE_URL=https://digitaltwin-pi-teal.vercel.app'
          },
          { status: 400 }
        );
      }
    }
    
    // Ensure URL starts with http:// or https://
    if (!fullFileUrl.startsWith('http://') && !fullFileUrl.startsWith('https://')) {
      return NextResponse.json(
        { 
          error: '音频 URL 格式错误，必须以 http:// 或 https:// 开头',
          hint: `当前 URL: ${fullFileUrl}`
        },
        { status: 400 }
      );
    }

    // Clone voice or face using Yidevs API
    if (type === 'voice') {
      // YiDevs API requires audio_url (full URL), now using Blob Storage URL
      const result = await cloneVoice(fullFileUrl, name);
      return NextResponse.json({
        success: true,
        type: 'voice',
        voiceId: result.voiceId,
        name: result.name,
        fileUrl: fullFileUrl, // Return full URL for reference
      });
    } else {
      // For face cloning, YiDevs API requires video_url (full URL) and callback_url
      // Construct callback URL for scene cloning completion notification
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const callbackUrl = `${baseUrl}/api/digital-human/callback`;
      const result = await cloneFace(fullFileUrl, name, callbackUrl);
      return NextResponse.json({
        success: true,
        type: 'face',
        sceneId: result.sceneId,
        sceneTaskId: result.sceneTaskId, // For video generation, we need scene_task_id
        name: result.name,
        fileUrl: fullFileUrl, // Return full URL for reference
      });
    }
  } catch (error) {
    console.error('Digital human create error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create digital human clone',
      },
      { status: 500 }
    );
  }
}

