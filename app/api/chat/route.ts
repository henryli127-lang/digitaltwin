import { NextRequest, NextResponse } from 'next/server';
import { generateReply } from '@/lib/api-services';

/**
 * POST /api/chat
 * Receives user text -> Calls Gemini -> Returns text reply
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, context } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    // Generate reply using Gemini
    const reply = await generateReply(text, context);

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate reply',
      },
      { status: 500 }
    );
  }
}

