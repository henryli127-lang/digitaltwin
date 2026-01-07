/**
 * API Service Layer for Digital Replica Application
 * Handles external API calls to Gemini and Yidevs services
 */

// Types
export interface GeminiResponse {
  text: string;
}

export interface YidevsVoiceCloneResponse {
  voiceId: string;
  name: string;
}

export interface YidevsFaceCloneResponse {
  sceneId: string;
  sceneTaskId: string; // task_id from scene clone, used for video generation
  name: string;
}

export interface YidevsAudioResponse {
  audioUrl: string;
}

export interface YidevsVideoTaskResponse {
  videoTaskId: string; // video_task_id from API response
  billId?: string; // bill_id from API response
}

export interface YidevsTaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  coverUrl?: string;
  videoName?: string;
  duration?: number; // Duration in seconds
  durationMs?: number; // Duration in milliseconds
  tips?: string;
  error?: string;
}

/**
 * Gemini Service
 * Generates conversational replies using Google's Gemini API
 */
export async function generateReply(
  text: string,
  context?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const systemContext = context 
      ? `You are a digital replica of the user. ${context}`
      : 'You are a digital replica of the user. Respond naturally and conversationally.';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemContext}\n\nUser: ${text}\n\nAssistant:`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate reply from Gemini API');
  }
}

/**
 * Yidevs Service - Voice Cloning
 * Creates a voice clone using audio URL
 * API: https://api.yidevs.com/app/human/human/Voice/clone
 */
export async function cloneVoice(
  audioUrl: string,
  name: string,
  description?: string
): Promise<YidevsVoiceCloneResponse> {
  const apiKey = process.env.YIDEVS_API_KEY;
  const baseUrl = process.env.YIDEVS_BASE_URL || 'https://api.yidevs.com';

  if (!apiKey) {
    throw new Error('YIDEVS_API_KEY is not configured');
  }

  try {
    const response = await fetch(`${baseUrl}/app/human/human/Voice/clone`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        audio_url: audioUrl,
        description: description || `Voice clone for ${name}`,
      }),
    });

    const data = await response.json();
    
    // Check if response is ok and code is 200
    if (!response.ok || data.code !== 200) {
      const errorMsg = data.msg || '未知错误';
      // 404 通常表示音频 URL 无法访问
      if (response.status === 404 || data.code === 404) {
        throw new Error(
          `音频创建失败：${errorMsg}。请确保音频 URL 可以公开访问（不能使用 localhost）。如果使用本地开发，请使用 ngrok 等工具创建公网 URL。`
        );
      }
      throw new Error(
        `YiDevs 语音克隆错误：${errorMsg} (code: ${data.code || response.status})`
      );
    }
    
    // YiDevs API returns: { code: 200, msg: "success", data: { voice_id: "...", task_id: ... } }
    if (!data.data?.voice_id) {
      throw new Error(
        `无效的响应格式：${JSON.stringify(data)}`
      );
    }

    return {
      voiceId: data.data.voice_id,
      name: name,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to clone voice with Yidevs API');
  }
}

/**
 * Yidevs Service - Face/Scene Cloning
 * Creates a scene clone using video URL
 * API: https://api.yidevs.com/app/human/human/Scene/created
 */
export async function cloneFace(
  videoUrl: string,
  name: string,
  callbackUrl: string
): Promise<YidevsFaceCloneResponse> {
  const apiKey = process.env.YIDEVS_API_KEY;
  const baseUrl = process.env.YIDEVS_BASE_URL || 'https://api.yidevs.com';

  if (!apiKey) {
    throw new Error('YIDEVS_API_KEY is not configured');
  }

  if (!callbackUrl) {
    throw new Error('callback_url is required for scene cloning');
  }

  try {
    const requestBody: any = {
      callback_url: callbackUrl,
      video_url: videoUrl,
    };

    // video_name is optional
    if (name) {
      requestBody.video_name = name;
    }

    const response = await fetch(`${baseUrl}/app/human/human/Scene/created`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Yidevs face clone error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    
    // YiDevs API returns: { code: 200, msg: "success", data: { scene_task_id: ... } }
    if (data.code !== 200 || !data.data?.scene_task_id) {
      throw new Error(
        `Invalid response format from Yidevs face clone API: ${JSON.stringify(data)}`
      );
    }

    return {
      sceneId: data.data.scene_task_id.toString(), // Use scene_task_id as sceneId
      sceneTaskId: data.data.scene_task_id.toString(), // scene_task_id is used for video generation
      name: name,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to clone face with Yidevs API');
  }
}

/**
 * Yidevs Service - Text to Speech
 * Generates audio from text using a cloned voice
 * API: https://api.yidevs.com/app/human/human/Voice/created
 * Pricing: Free
 */
export async function generateAudio(
  text: string,
  voiceId: string
): Promise<YidevsAudioResponse> {
  const apiKey = process.env.YIDEVS_API_KEY;
  const baseUrl = process.env.YIDEVS_BASE_URL || 'https://api.yidevs.com';

  if (!apiKey) {
    throw new Error('YIDEVS_API_KEY is not configured');
  }

  try {
    const response = await fetch(`${baseUrl}/app/human/human/Voice/created`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Yidevs TTS error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    
    // YiDevs API returns: { code: 200, msg: "success", data: { audio_url: "...", audio_base64: "..." } }
    if (data.code !== 200 || !data.data?.audio_url) {
      throw new Error(
        `Invalid response format from Yidevs TTS API: ${JSON.stringify(data)}`
      );
    }

    return {
      audioUrl: data.data.audio_url,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate audio with Yidevs API');
  }
}

/**
 * Yidevs Service - Video Generation
 * Generates video from audio URL and scene task ID
 * API: https://api.yidevs.com/app/human/human/Musetalk/create
 */
export async function generateVideo(
  audioUrl: string,
  sceneTaskId: string,
  callbackUrl: string
): Promise<YidevsVideoTaskResponse> {
  const apiKey = process.env.YIDEVS_API_KEY;
  const baseUrl = process.env.YIDEVS_BASE_URL || 'https://api.yidevs.com';

  if (!apiKey) {
    throw new Error('YIDEVS_API_KEY is not configured');
  }

  if (!callbackUrl) {
    throw new Error('callback_url is required for video generation');
  }

  try {
    const requestBody = {
      callback_url: callbackUrl,
      scene_task_id: sceneTaskId,
      audio_url: audioUrl,
    };

    const response = await fetch(`${baseUrl}/app/human/human/Musetalk/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Yidevs video generation error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    
    // YiDevs API returns: { code: 200, msg: "success", data: { video_task_id: ..., bill_id: ... } }
    if (data.code !== 200 || !data.data?.video_task_id) {
      throw new Error(
        `Invalid response format from Yidevs video generation API: ${JSON.stringify(data)}`
      );
    }

    return {
      videoTaskId: data.data.video_task_id.toString(),
      billId: data.data.bill_id?.toString(),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate video with Yidevs API');
  }
}

/**
 * Yidevs Service - Task Status Check
 * Polls the task status to get the final MP4 video URL
 * API: https://api.yidevs.com/app/human/human/Musetalk/task
 * Rate Limit: 1 request per 3 seconds (1qps/3s)
 * 
 * Note: The polling mechanism should respect the rate limit (3 seconds between requests)
 */
export async function checkTaskStatus(
  taskId: string
): Promise<YidevsTaskStatus> {
  const apiKey = process.env.YIDEVS_API_KEY;
  const baseUrl = process.env.YIDEVS_BASE_URL || 'https://api.yidevs.com';

  if (!apiKey) {
    throw new Error('YIDEVS_API_KEY is not configured');
  }

  try {
    // Use query parameter instead of path parameter
    const response = await fetch(
      `${baseUrl}/app/human/human/Musetalk/task?task_id=${encodeURIComponent(taskId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Yidevs task status error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    
    // YiDevs API returns: { code: 200, msg: "success", data: { video_task_id, duration, durationMs, coverUrl, videoUrl, videoName, tips, state } }
    if (data.code !== 200) {
      throw new Error(
        `Yidevs API error: ${data.msg || 'Unknown error'}`
      );
    }

    const taskData = data.data;
    if (!taskData) {
      return {
        status: 'pending',
      };
    }

    // State values: Need to determine what state values mean
    // Common values: 0=pending, 10=processing, 20=completed, negative=failed
    const state = taskData.state;
    const videoUrl = taskData.videoUrl;
    
    // State 20 appears to be completed based on the example
    if (state === 20 && videoUrl) {
      return {
        status: 'completed',
        videoUrl: videoUrl,
        coverUrl: taskData.coverUrl,
        videoName: taskData.videoName,
        duration: taskData.duration,
        durationMs: taskData.durationMs,
        tips: taskData.tips,
      };
    }
    
    // Negative state or other error states indicate failure
    if (state < 0 || state === 30) {
      return {
        status: 'failed',
        error: data.msg || 'Video generation failed',
      };
    }
    
    // State 10 or other positive values indicate processing
    if (state === 10 || (state > 0 && state < 20)) {
      return {
        status: 'processing',
      };
    }
    
    // Default to pending
    return {
      status: 'pending',
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to check task status with Yidevs API');
  }
}

