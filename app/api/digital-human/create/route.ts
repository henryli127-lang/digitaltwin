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

    // Save file locally first to get a public URL
    const localUrl = await saveUploadedFile(file);
    
    // Construct full URL for YiDevs API (needs absolute URL)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const fullFileUrl = `${baseUrl}${localUrl}`;

    // Validate that the URL is publicly accessible (not localhost)
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      return NextResponse.json(
        { 
          error: '音频 URL 无法被外部访问。请设置 NEXT_PUBLIC_BASE_URL 为公网可访问的 URL（如使用 ngrok 创建的 URL）。详见 CALLBACK_SETUP.md',
          hint: '本地开发请使用: ngrok http 3000，然后将返回的 HTTPS URL 设置为 NEXT_PUBLIC_BASE_URL'
        },
        { status: 400 }
      );
    }

    // Clone voice or face using Yidevs API
    if (type === 'voice') {
      // YiDevs API requires audio_url (full URL), not file upload
      const result = await cloneVoice(fullFileUrl, name);
      return NextResponse.json({
        success: true,
        type: 'voice',
        voiceId: result.voiceId,
        name: result.name,
        localUrl, // Return local URL for reference
      });
    } else {
      // For face cloning, YiDevs API requires video_url (full URL) and callback_url
      // Construct callback URL for scene cloning completion notification
      const callbackUrl = `${baseUrl}/api/digital-human/callback`;
      const result = await cloneFace(fullFileUrl, name, callbackUrl);
      return NextResponse.json({
        success: true,
        type: 'face',
        sceneId: result.sceneId,
        sceneTaskId: result.sceneTaskId, // For video generation, we need scene_task_id
        name: result.name,
        localUrl, // Return local URL for reference
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

