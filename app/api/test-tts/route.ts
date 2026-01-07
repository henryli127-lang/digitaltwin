import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to directly call YiDevs TTS API
 * Usage: POST /api/test-tts
 * Body: { text: string, voice_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice_id } = body;

    if (!text || !voice_id) {
      return NextResponse.json(
        { error: 'Missing text or voice_id' },
        { status: 400 }
      );
    }

    const apiKey = process.env.YIDEVS_API_KEY;
    const baseUrl = process.env.YIDEVS_BASE_URL || 'https://api.yidevs.com';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'YIDEVS_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const requestBody = {
      text,
      voice_id,
    };

    console.log('=== Test TTS API Request ===');
    console.log('URL:', `${baseUrl}/app/human/human/Voice/created`);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${baseUrl}/app/human/human/Voice/created`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Body:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON response',
        status: response.status,
        statusText: response.statusText,
        rawResponse: responseText,
      });
    }

    return NextResponse.json({
      success: data.code === 200,
      request: {
        url: `${baseUrl}/app/human/human/Voice/created`,
        body: requestBody,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        code: data.code,
        msg: data.msg,
        data: data.data,
      },
    });
  } catch (error) {
    console.error('Test TTS Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

