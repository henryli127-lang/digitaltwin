import { NextRequest, NextResponse } from 'next/server';
import { checkTaskStatus } from '@/lib/api-services';

/**
 * GET /api/digital-human/status
 * Checks video generation status
 * 
 * Query parameters:
 * - taskId: string (required)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId query parameter is required' },
        { status: 400 }
      );
    }

    // Check task status
    const status = await checkTaskStatus(taskId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('Digital human status error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check task status',
      },
      { status: 500 }
    );
  }
}

