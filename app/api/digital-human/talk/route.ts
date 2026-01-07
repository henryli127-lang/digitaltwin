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
    const audioResult = await generateAudio(textReply, voiceId);
    const audioUrl = audioResult.audioUrl;

    // Step 2: Generate video from audio URL and scene task ID
    // Construct callback URL for video generation completion notification
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/digital-human/callback`;
    
    // Note: sceneId from localStorage should actually be sceneTaskId for video generation
    const videoResult = await generateVideo(audioUrl, sceneId, callbackUrl);
    const taskId = videoResult.videoTaskId;

    return NextResponse.json({
      success: true,
      taskId,
      audioUrl, // Return audio URL for reference
    });
  } catch (error) {
    console.error('Digital human talk error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate digital human video',
      },
      { status: 500 }
    );
  }
}

