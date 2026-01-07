import { NextRequest, NextResponse } from 'next/server';
import { generateAudio, generateVideo } from '@/lib/api-services';

/**
 * POST /api/digital-human/talk
 * Receives (text_reply, voice_id, scene_id) -> Chains the Yidevs calls (TTS -> Video Gen) -> Returns taskId
 * 
 * Expected JSON body:
 * - textReply: string (the text to convert to speech)
 * - voiceId: string (the cloned voice ID)
 * - sceneId: string (the cloned scene/face ID)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { textReply, voiceId, sceneId } = body;

    // Debug: Log incoming request data
    console.log('=== Digital Human Talk API Called ===');
    console.log('Request body:', {
      textReply: textReply?.substring(0, 100) + (textReply?.length > 100 ? '...' : ''),
      textReplyLength: textReply?.length,
      voiceId,
      sceneId,
      voiceIdLength: voiceId?.length,
      sceneIdLength: sceneId?.length,
    });

    // Validate input
    if (!textReply || typeof textReply !== 'string') {
      return NextResponse.json(
        { error: 'textReply is required and must be a string' },
        { status: 400 }
      );
    }

    if (!voiceId || typeof voiceId !== 'string') {
      return NextResponse.json(
        { error: 'voiceId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!sceneId || typeof sceneId !== 'string') {
      return NextResponse.json(
        { error: 'sceneId is required and must be a string' },
        { status: 400 }
      );
    }

    // Step 1: Generate audio from text using cloned voice
    console.log('Step 1: Calling TTS API with voiceId:', voiceId);
    let audioUrl: string;
    try {
      const audioResult = await generateAudio(textReply, voiceId);
      audioUrl = audioResult.audioUrl;
      console.log('Step 1: TTS Success - audioUrl:', audioUrl);
    } catch (error) {
      console.error('Step 1: TTS generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'TTS 生成失败';
      return NextResponse.json(
        {
          error: `语音合成失败：${errorMessage}`,
          step: 'tts',
          debug: {
            voiceId,
            textLength: textReply.length,
          },
        },
        { status: 500 }
      );
    }

    // Step 2: Generate video from audio URL and scene task ID
    // Construct callback URL for video generation completion notification
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/digital-human/callback`;
    
    console.log('Step 2: Calling Video Generation API');
    console.log('Step 2: Parameters:', {
      audioUrl,
      sceneTaskId: sceneId,
      callbackUrl,
    });
    
    let taskId: string;
    try {
      // Note: sceneId from localStorage should actually be sceneTaskId for video generation
      const videoResult = await generateVideo(audioUrl, sceneId, callbackUrl);
      taskId = videoResult.videoTaskId;
      console.log('Step 2: Video Generation Success - taskId:', taskId, 'billId:', videoResult.billId);
    } catch (error) {
      console.error('Step 2: Video generation error:', error);
      const errorMessage = error instanceof Error ? error.message : '视频生成失败';
      return NextResponse.json(
        {
          error: `视频生成失败：${errorMessage}`,
          step: 'video',
          debug: {
            audioUrl,
            sceneTaskId: sceneId,
            callbackUrl,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      taskId,
      audioUrl, // Return audio URL for reference
    });
  } catch (error) {
    console.error('Digital human talk error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成数字人视频失败',
        step: 'unknown',
      },
      { status: 500 }
    );
  }
}

