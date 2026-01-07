import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/digital-human/callback
 * Receives callbacks from YiDevs API when scene cloning or video generation is complete
 * 
 * This endpoint receives POST requests from YiDevs with task status updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the callback for debugging
    console.log('YiDevs callback received:', JSON.stringify(body, null, 2));
    console.log('Callback timestamp:', new Date().toISOString());
    
    // Handle different callback types
    // Scene cloning callback: { code: 200, msg: "success", data: { scene_task_id: ..., status: ... } }
    // Video generation callback: { code: 200, msg: "success", data: { video_task_id: ..., status: ..., video_url: ... } }
    
    const callbackType = body.data?.scene_task_id ? 'scene_clone' : 
                        body.data?.video_task_id ? 'video_generation' : 
                        'unknown';
    
    console.log('Callback type:', callbackType);
    
    // Process scene cloning callback
    if (callbackType === 'scene_clone') {
      const sceneTaskId = body.data.scene_task_id;
      console.log('Scene cloning completed, task_id:', sceneTaskId);
      // You can update database, notify frontend, etc.
    }
    
    // Process video generation callback
    if (callbackType === 'video_generation') {
      const videoTaskId = body.data.video_task_id;
      const videoUrl = body.data.video_url;
      const status = body.data.state;
      
      console.log('Video generation callback:', {
        videoTaskId,
        videoUrl,
        status,
      });
      
      // You can:
      // 1. Update database with video URL
      // 2. Send WebSocket notification to frontend
      // 3. Trigger other workflows
    }
    
    // Always return 200 to acknowledge receipt
    // YiDevs will not retry if callback fails, so we must acknowledge
    return NextResponse.json({
      success: true,
      message: 'Callback received',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Callback error:', error);
    // Still return 200 to YiDevs to acknowledge receipt
    // This prevents YiDevs from retrying failed callbacks
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 200 } // Return 200 even on error to acknowledge receipt
    );
  }
}

