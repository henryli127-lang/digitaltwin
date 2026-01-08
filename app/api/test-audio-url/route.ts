import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify if an audio URL is accessible
 * Usage: GET /api/test-audio-url?url=https://...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    console.log('=== Testing Audio URL Accessibility ===');
    console.log('URL:', url);

    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      const lastModified = response.headers.get('last-modified');

      console.log('Response:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        contentLength,
        lastModified,
      });

      return NextResponse.json({
        success: response.ok,
        url,
        status: response.status,
        statusText: response.statusText,
        headers: {
          contentType,
          contentLength,
          lastModified,
        },
        accessible: response.ok,
      });
    } catch (error) {
      console.error('Error testing URL:', error);
      return NextResponse.json({
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        accessible: false,
      });
    }
  } catch (error) {
    console.error('Test audio URL error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

