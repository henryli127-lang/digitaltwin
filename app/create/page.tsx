'use client';

import { useState, useRef, useEffect } from 'react';
import { Video, Upload, CheckCircle, Loader2, Square, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProcessingTask {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

interface StepStatus {
  completed: boolean;
  voiceId?: string;
  sceneId?: string;
  loading: boolean;
  error?: string;
  tasks?: ProcessingTask[];
  currentProgress?: number;
}

// 提示文字，让用户读出
const PROMPT_TEXT = "你好，我是你的数字分身。今天天气真不错，希望你能喜欢和我聊天。让我们一起探索这个充满可能性的数字世界吧！";

export default function CreatePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    completed: false,
    loading: false,
  });
  
  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [countdown, setCountdown] = useState(30);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Convert WebM audio to MP3
  const convertWebMToMP3 = async (webmBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // Convert AudioBuffer to WAV
          const wav = audioBufferToWav(audioBuffer);
          
          // Convert WAV to MP3 using lamejs
          const mp3Data = wavToMp3(wav);
          
          const mp3Blob = new Blob([new Uint8Array(mp3Data)], { type: 'audio/mpeg' });
          resolve(mp3Blob);
        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(webmBlob);
    });
  };

  // Convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  };

  // Convert WAV to MP3 using lamejs
  const wavToMp3 = (wav: ArrayBuffer): Uint8Array => {
    const wavView = new DataView(wav);
    const sampleRate = wavView.getUint32(24, true);
    const numChannels = wavView.getUint16(22, true);
    const dataOffset = 44;
    const dataLength = wavView.getUint32(40, true);
    const samples = new Int16Array(wav, dataOffset, dataLength / 2);

    // @ts-ignore
    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);
    const sampleBlockSize = 1152;
    const mp3Data: number[] = [];

    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize);
      let mp3buf: Int8Array;

      if (numChannels === 1) {
        mp3buf = mp3encoder.encodeBuffer(sampleChunk);
      } else {
        const left = sampleChunk.filter((_, idx) => idx % 2 === 0);
        const right = sampleChunk.filter((_, idx) => idx % 2 === 1);
        mp3buf = mp3encoder.encodeBuffer(left, right);
      }

      if (mp3buf.length > 0) {
        mp3Data.push(...Array.from(mp3buf));
      }
    }

    const remaining = mp3encoder.flush() as Int8Array;
    if (remaining.length > 0) {
      mp3Data.push(...Array.from(remaining));
    }

    return new Uint8Array(mp3Data);
  };

  // Extract audio from video using Web Audio API
  const extractAudioFromVideo = async (videoFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      const objectUrl = URL.createObjectURL(videoFile);
      video.src = objectUrl;
      
      video.onloadedmetadata = async () => {
        try {
          // Create audio source from video element
          const source = audioContext.createMediaElementSource(video);
          const destination = audioContext.createMediaStreamDestination();
          source.connect(destination);
          source.connect(audioContext.destination);
          
          // Create MediaRecorder to record audio
          const mediaRecorder = new MediaRecorder(destination.stream);
          const audioChunks: Blob[] = [];
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = async () => {
            try {
              // Merge all audio chunks
              const webmBlob = new Blob(audioChunks, { type: 'audio/webm' });
              
              // Convert to MP3
              const mp3Blob = await convertWebMToMP3(webmBlob);
              
              // Cleanup
              URL.revokeObjectURL(objectUrl);
              audioContext.close();
              source.disconnect();
              destination.disconnect();
              
              resolve(mp3Blob);
            } catch (error) {
              reject(error);
            }
          };
          
          // Start recording
          mediaRecorder.start();
          
          // Play video to extract audio
          video.play().then(() => {
            // Wait for video to finish
            video.onended = () => {
              mediaRecorder.stop();
            };
          }).catch(reject);
          
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load video'));
      };
    });
  };

  // Only check localStorage if coming from homepage (not when explicitly creating new)
  useEffect(() => {
    // Check URL search params to see if we should skip auto-detection
    const urlParams = new URLSearchParams(window.location.search);
    const skipAutoDetect = urlParams.get('new') === 'true';
    
    if (skipAutoDetect) {
      // Clear any existing data and start fresh
      localStorage.removeItem('digital_replica_voice_id');
      localStorage.removeItem('digital_replica_scene_id');
      return;
    }
    
    // Only auto-detect on first visit (not when explicitly creating)
    const savedVoiceId = localStorage.getItem('digital_replica_voice_id');
    const savedSceneId = localStorage.getItem('digital_replica_scene_id');
    
    if (savedVoiceId && savedSceneId) {
      // If both exist, redirect to chat (user should go through homepage)
      router.push('/chat');
    }
  }, [router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [recordedVideoUrl]);

  // Start video recording
  const startRecording = async () => {
    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      
      streamRef.current = stream;
      
      // Display video stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm') 
        ? 'video/webm'
        : 'video/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      });
      
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: mimeType });
        setRecordedVideoBlob(videoBlob);
        const url = URL.createObjectURL(videoBlob);
        setRecordedVideoUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setCountdown(30);
      
      // Start countdown timer
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Start recording time counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('无法访问摄像头或麦克风。请检查权限设置。');
    }
  };

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  // Update task progress
  const updateTaskProgress = (taskId: string, progress: number, status?: ProcessingTask['status']) => {
    setStepStatus((prev) => {
      const tasks = prev.tasks || [];
      const updatedTasks = tasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            progress,
            status: status || task.status,
          };
        }
        return task;
      });
      
      // Calculate overall progress
      const totalProgress = updatedTasks.reduce((sum, task) => sum + task.progress, 0) / updatedTasks.length;
      
      return {
        ...prev,
        tasks: updatedTasks,
        currentProgress: totalProgress,
      };
    });
  };

  // Process video: upload video, extract audio, upload audio
  const processVideo = async () => {
    if (!recordedVideoBlob) return;
    
    setCurrentStep(2);
    
    // Initialize tasks
    const tasks: ProcessingTask[] = [
      { id: 'upload-video', name: '上传视频到服务器', status: 'pending', progress: 0 },
      { id: 'clone-face', name: '创建外观克隆', status: 'pending', progress: 0 },
      { id: 'extract-audio', name: '从视频中提取音频', status: 'pending', progress: 0 },
      { id: 'upload-audio', name: '上传音频到服务器', status: 'pending', progress: 0 },
      { id: 'clone-voice', name: '创建语音克隆', status: 'pending', progress: 0 },
    ];
    
    setStepStatus({
      ...stepStatus,
      loading: true,
      error: undefined,
      tasks,
      currentProgress: 0,
    });
    
    try {
      // Convert Blob to File
      const videoFile = new File([recordedVideoBlob], `recording-${Date.now()}.webm`, {
        type: recordedVideoBlob.type || 'video/webm',
      });
      
      // Task 1: Upload video
      updateTaskProgress('upload-video', 0, 'processing');
      const uploadFormData = new FormData();
      uploadFormData.append('file', videoFile);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || '上传视频失败');
      }
      
      updateTaskProgress('upload-video', 100, 'completed');
      
      // Task 2: Create face clone
      updateTaskProgress('clone-face', 0, 'processing');
      const createFormData = new FormData();
      createFormData.append('type', 'face');
      createFormData.append('file', videoFile);
      createFormData.append('name', 'My Face');
      
      const createResponse = await fetch('/api/digital-human/create', {
        method: 'POST',
        body: createFormData,
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || '创建外观克隆失败');
      }
      
      const faceResult = await createResponse.json();
      
      if (!faceResult.success) {
        throw new Error(faceResult.error || faceResult.hint || '创建外观克隆失败');
      }
      
      const sceneId = faceResult.sceneTaskId || faceResult.sceneId;
      localStorage.setItem('digital_replica_scene_id', sceneId);
      
      updateTaskProgress('clone-face', 100, 'completed');
      
      // Task 3: Extract audio from video
      updateTaskProgress('extract-audio', 0, 'processing');
      let audioBlob: Blob;
      
      try {
        // Simulate progress for audio extraction
        updateTaskProgress('extract-audio', 30, 'processing');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateTaskProgress('extract-audio', 60, 'processing');
        audioBlob = await extractAudioFromVideo(videoFile);
        
        updateTaskProgress('extract-audio', 100, 'completed');
      } catch (error) {
        updateTaskProgress('extract-audio', 0, 'error');
        throw new Error('从视频中提取音频失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
      
      // Task 4: Upload audio
      updateTaskProgress('upload-audio', 0, 'processing');
      const audioFile = new File([audioBlob], `audio-${Date.now()}.mp3`, {
        type: 'audio/mpeg',
      });
      
      const audioUploadFormData = new FormData();
      audioUploadFormData.append('file', audioFile);
      
      const audioUploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: audioUploadFormData,
      });
      
      if (!audioUploadResponse.ok) {
        const errorData = await audioUploadResponse.json();
        throw new Error(errorData.error || '上传音频失败');
      }
      
      updateTaskProgress('upload-audio', 100, 'completed');
      
      // Task 5: Create voice clone
      updateTaskProgress('clone-voice', 0, 'processing');
      const voiceCreateFormData = new FormData();
      voiceCreateFormData.append('type', 'voice');
      voiceCreateFormData.append('file', audioFile);
      voiceCreateFormData.append('name', 'My Voice');
      
      const voiceCreateResponse = await fetch('/api/digital-human/create', {
        method: 'POST',
        body: voiceCreateFormData,
      });
      
      if (!voiceCreateResponse.ok) {
        const errorData = await voiceCreateResponse.json();
        throw new Error(errorData.error || '创建语音克隆失败');
      }
      
      const voiceResult = await voiceCreateResponse.json();
      
      if (!voiceResult.success) {
        throw new Error(voiceResult.error || voiceResult.hint || '创建语音克隆失败');
      }
      
      const voiceId = voiceResult.voiceId;
      localStorage.setItem('digital_replica_voice_id', voiceId);
      
      updateTaskProgress('clone-voice', 100, 'completed');
      
      // All tasks completed
      setStepStatus({
        completed: true,
        voiceId,
        sceneId,
        loading: false,
        tasks,
        currentProgress: 100,
      });
      
      setCurrentStep(3);
      
    } catch (error) {
      console.error('Processing error:', error);
      setStepStatus({
        ...stepStatus,
        loading: false,
        error: error instanceof Error ? error.message : '处理失败',
      });
    }
  };

  // Launch to chat interface
  const handleLaunch = () => {
    router.push('/chat');
  };

  // Retry recording
  const handleRetry = () => {
    setRecordedVideoBlob(null);
    setRecordedVideoUrl(null);
    setRecordingTime(0);
    setCountdown(30);
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            创建你的数字分身
          </h1>
          <p className="text-gray-400 text-lg">
            按照以下步骤，让你的数字分身活起来
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-center">
            {/* Step 1 */}
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                currentStep >= 1 
                  ? recordedVideoBlob
                    ? 'bg-cyan-500 border-cyan-500' 
                    : 'border-cyan-400'
                  : 'border-gray-600'
              }`}>
                {recordedVideoBlob ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <span className="text-sm font-semibold">1</span>
                )}
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-300">录制视频</div>
                <div className="text-xs text-gray-500">30秒视频录制</div>
              </div>
            </div>

            {/* Connector 1 */}
            <div className={`w-24 h-0.5 mx-8 transition-all ${
              currentStep >= 2 ? 'bg-cyan-500' : 'bg-gray-600'
            }`} />

            {/* Step 2 */}
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                currentStep >= 2
                  ? stepStatus.completed
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'border-cyan-400'
                  : 'border-gray-600'
              }`}>
                {stepStatus.completed ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <span className="text-sm font-semibold">2</span>
                )}
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-300">处理中</div>
                <div className="text-xs text-gray-500">创建数字分身</div>
              </div>
            </div>

            {/* Connector 2 */}
            <div className={`w-24 h-0.5 mx-8 transition-all ${
              currentStep >= 3 ? 'bg-cyan-500' : 'bg-gray-600'
            }`} />

            {/* Step 3 */}
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                currentStep >= 3
                  ? 'bg-cyan-500 border-cyan-500'
                  : 'border-gray-600'
              }`}>
                {currentStep >= 3 ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <span className="text-sm font-semibold">3</span>
                )}
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-300">完成</div>
                <div className="text-xs text-gray-500">开始对话</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8">
          {/* Step 1: Video Recording */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Camera className="w-6 h-6 mr-3 text-cyan-400" />
                录制你的视频
              </h2>

              {/* Instructions */}
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">📋 录制注意事项：</h3>
                <ul className="text-sm text-blue-200/80 space-y-1 list-disc list-inside">
                  <li>确保光线充足，面部清晰可见</li>
                  <li>保持正面面对摄像头</li>
                  <li>背景简洁，避免杂乱</li>
                  <li>说话清晰，声音洪亮</li>
                  <li>录制时请读出下方提示文字</li>
                </ul>
              </div>

              {/* Prompt Text */}
              <div className="bg-gray-700/50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-300 mb-3">请读出以下文字：</h3>
                <p className="text-xl text-cyan-300 leading-relaxed text-center">
                  {PROMPT_TEXT}
                </p>
              </div>

              {/* Video Preview/Recording */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-6">
                {!isRecording && !recordedVideoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                      <p className="text-gray-400">准备开始录制</p>
                    </div>
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${!isRecording && !recordedVideoUrl ? 'hidden' : ''}`}
                />
                
                {recordedVideoUrl && !isRecording && (
                  <video
                    src={recordedVideoUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Recording overlay */}
                {isRecording && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    <span className="font-semibold">录制中 {countdown}秒</span>
                  </div>
                )}
              </div>

              {/* Recording Controls */}
              <div className="flex items-center justify-center gap-4">
                {!isRecording && !recordedVideoUrl && (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold text-lg transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    开始录制
                  </button>
                )}
                
                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 rounded-lg font-semibold text-lg transition-colors"
                  >
                    <Square className="w-5 h-5" />
                    停止录制
                  </button>
                )}
                
                {recordedVideoUrl && !isRecording && (
                  <>
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                    >
                      重新录制
                    </button>
                    <button
                      onClick={processVideo}
                      className="flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-600 rounded-lg font-semibold text-lg transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      开始处理
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Processing */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Loader2 className="w-6 h-6 mr-3 text-cyan-400 animate-spin" />
                正在处理你的数字分身
              </h2>

              {/* Overall Progress */}
              {stepStatus.currentProgress !== undefined && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">总体进度</span>
                    <span className="text-sm font-semibold text-cyan-400">
                      {Math.round(stepStatus.currentProgress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                      style={{ width: `${stepStatus.currentProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Task List */}
              {stepStatus.tasks && (
                <div className="space-y-3">
                  {stepStatus.tasks.map((task) => (
                    <div key={task.id} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {task.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : task.status === 'processing' ? (
                            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                          ) : task.status === 'error' ? (
                            <Square className="w-5 h-5 text-red-400" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-500" />
                          )}
                          <span className="text-sm font-medium text-gray-300">{task.name}</span>
                        </div>
                        <span className="text-sm text-gray-400">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            task.status === 'completed'
                              ? 'bg-green-500'
                              : task.status === 'processing'
                              ? 'bg-cyan-500'
                              : task.status === 'error'
                              ? 'bg-red-500'
                              : 'bg-gray-500'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {stepStatus.error && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-300">
                  {stepStatus.error}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Completed */}
          {currentStep === 3 && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-semibold text-cyan-400">恭喜！</h2>
              <p className="text-lg text-gray-300">
                你的数字分身已经创建完成
              </p>
              <p className="text-gray-400">
                现在可以开始与你的数字分身对话了
              </p>
              <button
                onClick={handleLaunch}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/50"
              >
                开始对话
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
