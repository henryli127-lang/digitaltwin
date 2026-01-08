import { NextRequest, NextResponse } from 'next/server';
import { generateAudio } from '@/lib/api-services';

/**
 * POST /api/digital-human/verify-voice
 * Verifies if a voice_id is valid by attempting a test TTS call
 * 
 * Body: { voiceId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { voiceId } = body;

    if (!voiceId || typeof voiceId !== 'string') {
      return NextResponse.json(
        { error: 'voiceId is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('=== Verifying Voice ID ===');
    console.log('Voice ID:', voiceId);

    // Try to generate a short test audio
    try {
      const testText = '测试';
      const result = await generateAudio(testText, voiceId);
      
      return NextResponse.json({
        valid: true,
        voiceId,
        message: 'Voice ID is valid',
        testAudioUrl: result.audioUrl,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Voice verification failed:', errorMessage);
      
      return NextResponse.json({
        valid: false,
        voiceId,
        error: errorMessage,
        message: 'Voice ID is invalid or voice cloning task is not completed',
      });
    }
  } catch (error) {
    console.error('Verify voice error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

