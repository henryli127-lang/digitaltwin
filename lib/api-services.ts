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
  taskId?: string; // task_id from voice clone API, indicates the cloning task is still processing
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

    // Use gemini-2.5-flash-lite (latest lightweight model)
    // API v1 is more stable than v1beta
    const model = 'gemini-2.5-flash-lite';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
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
    const requestBody = {
      name,
      audio_url: audioUrl,
      description: description || `Voice clone for ${name}`,
    };
    
    console.log('=== YiDevs Voice Clone API Request ===');
    console.log('URL:', `${baseUrl}/app/human/human/Voice/clone`);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('Audio URL:', audioUrl);
    
    // Verify audio URL is accessible before sending to YiDevs
    try {
      const urlTestResponse = await fetch(audioUrl, { method: 'HEAD' });
      console.log('Audio URL accessibility check:', {
        url: audioUrl,
        status: urlTestResponse.status,
        statusText: urlTestResponse.statusText,
        contentType: urlTestResponse.headers.get('content-type'),
        contentLength: urlTestResponse.headers.get('content-length'),
      });
      
      if (!urlTestResponse.ok) {
        console.error('❌ Audio URL is not accessible! Status:', urlTestResponse.status);
        throw new Error(`音频 URL 无法访问 (HTTP ${urlTestResponse.status}): ${audioUrl}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('音频 URL 无法访问')) {
        throw error;
      }
      console.warn('⚠️ Could not verify audio URL accessibility:', error);
      // Continue anyway - YiDevs will verify it
    }
    
    const response = await fetch(`${baseUrl}/app/human/human/Voice/clone`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    console.log('YiDevs Voice Clone API Response:', {
      status: response.status,
      code: data.code,
      msg: data.msg,
      voice_id: data.data?.voice_id,
      task_id: data.data?.task_id,
      fullResponse: JSON.stringify(data),
    });
    
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

    // Note: voice_id is returned immediately, but the cloning task may still be processing
    // The task_id can be used to check the cloning status if needed
    // IMPORTANT: Even though voice_id is returned, the voice cloning task may take 2-5 minutes to complete
    // Users should wait before using the voice_id for TTS
    return {
      voiceId: data.data.voice_id,
      taskId: data.data?.task_id?.toString(), // Include task_id for reference
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
    const requestBody = {
      text,
      voice_id: voiceId,
    };
    
    console.log('YiDevs TTS API Request:', {
      url: `${baseUrl}/app/human/human/Voice/created`,
      body: {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        voice_id: voiceId,
      },
    });
    
    const response = await fetch(`${baseUrl}/app/human/human/Voice/created`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('YiDevs TTS API Response:', {
      status: response.status,
      statusText: response.statusText,
      code: data.code,
      msg: data.msg,
      hasData: !!data.data,
      audioUrl: data.data?.audio_url?.substring(0, 100),
      fullResponse: JSON.stringify(data), // 记录完整响应以便调试
    });
    
    // Check if response is ok and code is 200
    if (!response.ok || data.code !== 200) {
      const errorMsg = data.msg || '未知错误';
      
      // 404 错误可能是 voice_id 不存在或无效
      if (response.status === 404 || data.code === 404) {
        // Check if this is a content moderation error (from previous logs)
        const isContentModerationError = errorMsg.includes('cURL error 7') || 
                                        errorMsg.includes('baidubce.com');
        
        if (isContentModerationError) {
          throw new Error(
            `语音合成失败：${errorMsg}\n` +
            `这是 YiDevs 内部服务问题（内容审核服务连接失败），请稍后重试。`
          );
        }
        
        throw new Error(
          `语音合成失败：${errorMsg}\n` +
          `使用的 voice_id: ${voiceId}\n\n` +
          `🔍 问题分析：\n` +
          `根据创建日志，语音克隆任务已创建并返回了 voice_id 和 task_id。\n` +
          `但是，语音克隆任务可能需要 2-5 分钟才能完成处理。\n\n` +
          `可能的原因：\n` +
          `1. ⏰ 语音克隆任务还在处理中（最常见）- 虽然返回了 voice_id，但任务可能尚未完成\n` +
          `2. ❌ voice_id 不存在或无效\n` +
          `3. 🌐 音频文件可能无法访问（虽然创建时验证通过，但 YiDevs 可能无法访问）\n` +
          `4. 🔧 YiDevs 内部服务问题\n\n` +
          `💡 解决建议（按优先级）：\n` +
          `1. ⏳ 等待 5-10 分钟后重试（最可能解决问题）\n` +
          `2. 🔍 检查创建语音克隆时的服务器日志，确认：\n` +
          `   - audio_url 是否可访问（应该看到 status: 200）\n` +
          `   - 返回的 task_id 是什么（任务可能还在处理）\n` +
          `3. 🔄 如果等待后仍然失败，请重新创建语音克隆\n` +
          `4. ✅ 确保音频文件清晰且时长足够（建议 10-30 秒）`
        );
      }
      
      throw new Error(
        `YiDevs TTS 错误：${errorMsg} (code: ${data.code || response.status})。使用的 voice_id: ${voiceId}`
      );
    }
    
    // YiDevs API returns: { code: 200, msg: "success", data: { audio_url: "...", audio_base64: "..." } }
    if (!data.data?.audio_url) {
      throw new Error(
        `无效的 TTS 响应格式：${JSON.stringify(data)}`
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
    
    console.log('YiDevs Video Generation API Request:', {
      url: `${baseUrl}/app/human/human/Musetalk/create`,
      body: {
        callback_url: callbackUrl,
        scene_task_id: sceneTaskId,
        audio_url: audioUrl.substring(0, 100) + '...',
        sceneTaskIdLength: sceneTaskId?.length,
        audioUrlLength: audioUrl?.length,
      },
    });

    const response = await fetch(`${baseUrl}/app/human/human/Musetalk/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('YiDevs Video Generation API Response:', {
      status: response.status,
      statusText: response.statusText,
      code: data.code,
      msg: data.msg,
      hasData: !!data.data,
      videoTaskId: data.data?.video_task_id,
      billId: data.data?.bill_id,
      fullResponse: JSON.stringify(data),
    });
    
    // Check if response is ok and code is 200
    if (!response.ok || data.code !== 200) {
      const errorMsg = data.msg || '未知错误';
      
      // 404 错误可能是参数错误或服务不可用
      if (response.status === 404 || data.code === 404) {
        throw new Error(
          `视频生成服务暂时不可用：${errorMsg}。请检查 scene_task_id 和 audio_url 是否正确。`
        );
      }
      
      throw new Error(
        `YiDevs 视频生成错误：${errorMsg} (code: ${data.code || response.status})`
      );
    }
    
    // YiDevs API returns: { code: 200, msg: "success", data: { video_task_id: ..., bill_id: ... } }
    if (!data.data?.video_task_id) {
      throw new Error(
        `无效的视频生成响应格式：${JSON.stringify(data)}`
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

