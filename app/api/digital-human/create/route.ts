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
        'audio/mp4',
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
    console.log('=== Starting File Upload ===');
    console.log('File name:', file.name);
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.type);
    
    const fileUrl = await saveUploadedFile(file);
    console.log('File saved, URL:', fileUrl);
    
    // Determine the full file URL
    let fullFileUrl: string;
    
    // Check if it's already a full URL (from Blob Storage) or a relative path (local)
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      // Already a full URL from Blob Storage
      fullFileUrl = fileUrl;
      console.log('Using Blob Storage URL:', fullFileUrl);
      
      // Verify the URL is accessible
      try {
        const testResponse = await fetch(fullFileUrl, { method: 'HEAD' });
        console.log('URL accessibility test:', {
          url: fullFileUrl,
          status: testResponse.status,
          statusText: testResponse.statusText,
          contentType: testResponse.headers.get('content-type'),
          contentLength: testResponse.headers.get('content-length'),
        });
        
        if (!testResponse.ok) {
          console.warn('⚠️ URL may not be accessible:', testResponse.status, testResponse.statusText);
        }
      } catch (error) {
        console.error('❌ Failed to verify URL accessibility:', error);
        // Don't fail here, just log the error - YiDevs will verify it
      }
    } else {
      // Local development: construct full URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      fullFileUrl = `${baseUrl}${fileUrl}`;
      console.log('Constructed local URL:', fullFileUrl);

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
    
    console.log('=== Final File URL for YiDevs ===');
    console.log('Full URL:', fullFileUrl);

    // Clone voice or face using Yidevs API
    if (type === 'voice') {
      console.log('=== Calling YiDevs Voice Clone API ===');
      console.log('Audio URL to send:', fullFileUrl);
      
      // YiDevs API requires audio_url (full URL), now using OSS URL
      const result = await cloneVoice(fullFileUrl, name);
      
      console.log('=== Voice Clone Result ===');
      console.log('Voice ID:', result.voiceId);
      console.log('Task ID:', result.taskId);
      console.log('Name:', result.name);
      
      if (result.taskId) {
        console.log('⚠️ 重要提示：语音克隆任务正在处理中（task_id: ' + result.taskId + '）。');
        console.log('⚠️ 虽然返回了 voice_id，但任务可能需要 2-5 分钟才能完成。');
        console.log('⚠️ 如果立即使用此 voice_id 进行 TTS 时出现 404 错误，请等待几分钟后重试。');
      }
      
      return NextResponse.json({
        success: true,
        type: 'voice',
        voiceId: result.voiceId,
        taskId: result.taskId, // Include task_id for reference
        name: result.name,
        fileUrl: fullFileUrl, // Return full URL for reference
        warning: result.taskId 
          ? `语音克隆任务正在处理中（task_id: ${result.taskId}）。虽然返回了 voice_id，但任务可能需要 2-5 分钟才能完成。如果立即使用此 voice_id 进行 TTS 时出现 404 错误，请等待几分钟后重试。`
          : '语音克隆任务可能还在处理中。如果立即使用此 voice_id 时出现错误，请等待 5-10 分钟后重试。',
        debug: {
          fileUrl: fullFileUrl,
          fileSize: file.size,
          fileType: file.type,
        },
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

