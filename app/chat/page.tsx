'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageSquare, Wifi, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  type: 'user' | 'assistant';
}

interface TaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load voice_id and scene_id from localStorage
  useEffect(() => {
    const savedVoiceId = localStorage.getItem('digital_replica_voice_id');
    const savedSceneId = localStorage.getItem('digital_replica_scene_id');

    console.log('=== Loading IDs from localStorage ===');
    console.log('voiceId:', savedVoiceId);
    console.log('sceneId:', savedSceneId);
    console.log('voiceId length:', savedVoiceId?.length);
    console.log('sceneId length:', savedSceneId?.length);

    if (!savedVoiceId || !savedSceneId) {
      // Redirect to create page if not set up
      console.log('Missing IDs, redirecting to create page');
      router.push('/create');
      return;
    }

    setVoiceId(savedVoiceId);
    setSceneId(savedSceneId);
    setConnectionStatus('connected');
    console.log('IDs loaded successfully');
  }, [router]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Poll task status
  const pollTaskStatus = useCallback(async (taskId: string) => {
    const maxAttempts = 60; // 2 minutes max (60 * 2 seconds)
    let attempts = 0;

    const poll = async (): Promise<string | null> => {
      if (attempts >= maxAttempts) {
        setIsThinking(false);
        setIsProcessing(false);
        setConnectionStatus('disconnected');
        return null;
      }

      try {
        const response = await fetch(`/api/digital-human/status?taskId=${taskId}`);
        if (!response.ok) {
          throw new Error('Failed to check task status');
        }

        const data: TaskStatus = await response.json();
        attempts++;

        if (data.status === 'completed' && data.videoUrl) {
          setIsThinking(false);
          return data.videoUrl;
        } else if (data.status === 'failed') {
          setIsThinking(false);
          setIsProcessing(false);
          setConnectionStatus('disconnected');
          throw new Error(data.error || 'Video generation failed');
        }

        // Continue polling
        return null;
      } catch (error) {
        console.error('Polling error:', error);
        setIsThinking(false);
        setIsProcessing(false);
        setConnectionStatus('disconnected');
        return null;
      }
    };

    // Start polling every 5 seconds (YiDevs API rate limit: 1qps/3s, using 5s for safety)
    return new Promise<string | null>((resolve) => {
      const interval = setInterval(async () => {
        const videoUrl = await poll();
        if (videoUrl) {
          clearInterval(interval);
          pollingIntervalRef.current = null;
          resolve(videoUrl);
        }
      }, 5000); // 5 seconds polling interval

      // Initial poll
      poll().then((videoUrl) => {
        if (videoUrl) {
          clearInterval(interval);
          pollingIntervalRef.current = null;
          resolve(videoUrl);
        }
      });

      pollingIntervalRef.current = interval as unknown as NodeJS.Timeout;
    });
  }, []);

  // Handle video source change
  const handleVideoChange = useCallback((newVideoUrl: string) => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      // Pause current video
      video.pause();
      
      // Update source
      video.src = newVideoUrl;
      
      // Try to play (may require user interaction)
      video.load();
      video.play().catch((error) => {
        console.warn('Autoplay prevented:', error);
        // Try with muted first
        video.muted = true;
        video.play().then(() => {
          // Once playing, try to unmute
          setTimeout(() => {
            video.muted = false;
          }, 100);
        }).catch((err) => {
          console.warn('Muted autoplay also prevented:', err);
        });
      });
    }
    setCurrentVideoUrl(newVideoUrl);
  }, []);

  // Send message and process the talk loop
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !voiceId || !sceneId || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      timestamp: new Date(),
      type: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);
    setIsThinking(true);
    setConnectionStatus('connecting');

    try {
      // Step A: Get Gemini response
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
        }),
      });

      if (!chatResponse.ok) {
        throw new Error('Failed to get AI response');
      }

      const chatData = await chatResponse.json();
      const aiResponse = chatData.reply;

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        timestamp: new Date(),
        type: 'assistant',
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Step B: Generate video (TTS + Video)
      const talkRequestData = {
        textReply: aiResponse,
        voiceId,
        sceneId,
      };
      
      console.log('=== Sending Talk Request ===');
      console.log('Request data:', {
        textReply: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
        textReplyLength: aiResponse.length,
        voiceId,
        sceneId,
        voiceIdLength: voiceId?.length,
        sceneIdLength: sceneId?.length,
      });
      
      const talkResponse = await fetch('/api/digital-human/talk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(talkRequestData),
      });

      const talkData = await talkResponse.json();
      
      console.log('=== Talk API Response ===');
      console.log('Status:', talkResponse.status, talkResponse.statusText);
      console.log('Response data:', talkData);

      if (!talkResponse.ok) {
        const errorMsg = talkData.error || '视频生成失败';
        const debugInfo = talkData.debug ? `\n调试信息: ${JSON.stringify(talkData.debug, null, 2)}` : '';
        throw new Error(`${errorMsg}${debugInfo}`);
      }

      if (!talkData.taskId) {
        throw new Error(`无效的响应：缺少 taskId。响应数据：${JSON.stringify(talkData)}`);
      }
      
      const taskId = talkData.taskId;
      console.log('Task ID received:', taskId);

      // Step C: Poll for task status
      const videoUrl = await pollTaskStatus(taskId);

      if (videoUrl) {
        // Step D: Play the video
        handleVideoChange(videoUrl);
        setConnectionStatus('connected');
      } else {
        throw new Error('Video generation timed out');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setConnectionStatus('disconnected');
      // Show error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: `错误：${error instanceof Error ? error.message : '出现了问题'}`,
        timestamp: new Date(),
        type: 'assistant',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setIsThinking(false);
    }
  }, [inputText, voiceId, sceneId, isProcessing, pollTaskStatus, handleVideoChange]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Full-screen video background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        {currentVideoUrl && <source src={currentVideoUrl} type="video/mp4" />}
        你的浏览器不支持视频播放。
      </video>

      {/* Thinking/Connecting Overlay */}
      {isThinking && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-white text-xl font-medium">思考中...</p>
            <p className="text-gray-400 text-sm mt-2">正在生成回复</p>
          </div>
        </div>
      )}

      {/* Connection Status Overlay */}
      <div className="absolute top-4 left-4 z-30">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md ${
          connectionStatus === 'connected' 
            ? 'bg-green-500/20 border border-green-500/50' 
            : connectionStatus === 'connecting'
            ? 'bg-yellow-500/20 border border-yellow-500/50'
            : 'bg-red-500/20 border border-red-500/50'
        }`}>
          {connectionStatus === 'connected' ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : connectionStatus === 'connecting' ? (
            <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className="text-white text-sm font-medium">
            {connectionStatus === 'connected' ? '已连接' : connectionStatus === 'connecting' ? '连接中' : '未连接'}
          </span>
        </div>
      </div>

      {/* Message History (Floating on bottom left) */}
      {messages.length > 0 && (
        <div className="absolute bottom-24 left-4 z-30 max-w-md space-y-2 max-h-64 overflow-y-auto">
          {messages.slice(-5).map((message) => (
            <div
              key={message.id}
              className={`backdrop-blur-md rounded-lg px-4 py-2 animate-fade-in ${
                message.type === 'user'
                  ? 'bg-blue-500/30 border border-blue-500/50 text-white'
                  : 'bg-gray-800/50 border border-gray-700/50 text-gray-200'
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-md bg-gray-900/80 border border-gray-700/50 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入你的消息..."
                disabled={isProcessing || !voiceId || !sceneId}
                className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-lg py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isProcessing || !voiceId || !sceneId}
                className="p-3 bg-cyan-500 hover:bg-cyan-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-cyan-500"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Send className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!currentVideoUrl && !isThinking && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <MessageSquare className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <p className="text-white text-2xl font-semibold mb-2">开始对话</p>
            <p className="text-gray-400">在下方输入消息，开始与你的数字分身聊天</p>
          </div>
        </div>
      )}
    </div>
  );
}

