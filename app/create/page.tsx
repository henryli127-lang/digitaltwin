'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Video, Upload, CheckCircle, Loader2, Play, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StepStatus {
  completed: boolean;
  voiceId?: string;
  sceneId?: string;
  loading: boolean;
  error?: string;
}

export default function CreatePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    completed: false,
    loading: false,
  });
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // File input refs
  const voiceFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

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

  // Load saved state from localStorage
  useEffect(() => {
    const savedVoiceId = localStorage.getItem('digital_replica_voice_id');
    const savedSceneId = localStorage.getItem('digital_replica_scene_id');
    
    if (savedVoiceId && savedSceneId) {
      setStepStatus({
        completed: true,
        voiceId: savedVoiceId,
        sceneId: savedSceneId,
        loading: false,
      });
      setCurrentStep(2);
    } else if (savedVoiceId) {
      setStepStatus({
        completed: false,
        voiceId: savedVoiceId,
        loading: false,
      });
      setCurrentStep(2);
    }
  }, []);

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try to use MP3 format, fallback to WebM if not supported
      let mimeType = 'audio/mpeg';
      if (!MediaRecorder.isTypeSupported('audio/mpeg')) {
        // Fallback to WebM
        mimeType = 'audio/webm';
      }
      
      console.log('Using MIME type for recording:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Store mimeType for use in onstop callback
      const recordedMimeType = mimeType;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        stream.getTracks().forEach(track => track.stop());
        
        // Convert WebM to MP3
        try {
          const mp3Blob = await convertWebMToMP3(webmBlob);
          setAudioBlob(mp3Blob);
          const url = URL.createObjectURL(mp3Blob);
          setAudioUrl(url);
          console.log('✅ Converted WebM to MP3 successfully');
        } catch (error) {
          console.error('Failed to convert to MP3, using original format:', error);
          // Fallback to original WebM if conversion fails
          setAudioBlob(webmBlob);
          const url = URL.createObjectURL(webmBlob);
          setAudioUrl(url);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle voice file upload
  const handleVoiceUpload = async (file: File) => {
    if (currentStep !== 1) return;

    setStepStatus({ ...stepStatus, loading: true, error: undefined });

    try {
      // Step 1: Upload file to local storage
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      // Step 2: Create voice clone
      const createFormData = new FormData();
      createFormData.append('type', 'voice');
      createFormData.append('file', file);
      createFormData.append('name', 'My Voice');

      const createResponse = await fetch('/api/digital-human/create', {
        method: 'POST',
        body: createFormData,
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create voice clone');
      }

      const result = await createResponse.json();
      
      if (!result.success) {
        throw new Error(result.error || result.hint || '语音克隆失败');
      }
      
      // Save to localStorage
      localStorage.setItem('digital_replica_voice_id', result.voiceId);
      
      setStepStatus({
        completed: false,
        voiceId: result.voiceId,
        loading: false,
      });
      
      // Move to next step
      setCurrentStep(2);
    } catch (error) {
      console.error('Voice upload error:', error);
      let errorMessage = '处理语音失败';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setStepStatus({
        ...stepStatus,
        loading: false,
        error: errorMessage,
      });
    }
  };

  // Handle recorded audio upload
  const handleRecordedAudioUpload = async () => {
    if (!audioBlob) return;

    // Force MP3 format
    const extension = 'mp3';
    const mimeType = 'audio/mpeg';

    // Convert Blob to File with correct extension
    const audioFile = new File([audioBlob], `recording.${extension}`, { type: mimeType });
    await handleVoiceUpload(audioFile);
  };

  // Handle video file upload
  const handleVideoUpload = async (file: File) => {
    if (currentStep !== 2) return;

    setStepStatus({ ...stepStatus, loading: true, error: undefined });

    try {
      // Step 1: Upload file to local storage
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      // Step 2: Create face clone
      const createFormData = new FormData();
      createFormData.append('type', 'face');
      createFormData.append('file', file);
      createFormData.append('name', 'My Face');

      const createResponse = await fetch('/api/digital-human/create', {
        method: 'POST',
        body: createFormData,
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create face clone');
      }

      const result = await createResponse.json();
      
      // Save to localStorage - use sceneTaskId for video generation
      localStorage.setItem('digital_replica_scene_id', result.sceneTaskId || result.sceneId);
      
      setStepStatus({
        completed: true,
        voiceId: stepStatus.voiceId,
        sceneId: result.sceneTaskId || result.sceneId, // Use sceneTaskId for video generation
        loading: false,
      });
    } catch (error) {
      console.error('Video upload error:', error);
      setStepStatus({
        ...stepStatus,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to process video',
      });
    }
  };

  // Handle file input change
  const handleFileChange = (type: 'voice' | 'video', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'voice') {
      handleVoiceUpload(file);
    } else {
      handleVideoUpload(file);
    }
  };

  // Handle dropzone drop
  const handleDrop = (type: 'voice' | 'video', event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;

    if (type === 'voice' && file.type.startsWith('audio/')) {
      handleVoiceUpload(file);
    } else if (type === 'video' && file.type.startsWith('video/')) {
      handleVideoUpload(file);
    }
  };

  // Launch to chat interface
  const handleLaunch = () => {
    router.push('/chat');
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
                  ? stepStatus.voiceId 
                    ? 'bg-cyan-500 border-cyan-500' 
                    : 'border-cyan-400'
                  : 'border-gray-600'
              }`}>
                {stepStatus.voiceId ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <span className="text-sm font-semibold">1</span>
                )}
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-300">语音克隆</div>
                <div className="text-xs text-gray-500">录制或上传音频</div>
              </div>
            </div>

            {/* Connector */}
            <div className={`w-24 h-0.5 mx-8 transition-all ${
              currentStep >= 2 ? 'bg-cyan-500' : 'bg-gray-600'
            }`} />

            {/* Step 2 */}
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                currentStep >= 2
                  ? stepStatus.sceneId
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'border-cyan-400'
                  : 'border-gray-600'
              }`}>
                {stepStatus.sceneId ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <span className="text-sm font-semibold">2</span>
                )}
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-300">外观克隆</div>
                <div className="text-xs text-gray-500">上传视频</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8">
          {/* Step 1: Voice Cloning */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Mic className="w-6 h-6 mr-3 text-cyan-400" />
                克隆你的声音
              </h2>

              {/* Recording Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-300">录制音频</h3>
                <div className="flex items-center gap-4">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors"
                    >
                      <Mic className="w-5 h-5" />
                      开始录制
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
                    >
                      <Square className="w-5 h-5" />
                      停止录制
                    </button>
                  )}
                  
                  {audioUrl && (
                    <div className="flex items-center gap-4">
                      <audio src={audioUrl} controls className="max-w-xs" />
                      <button
                        onClick={handleRecordedAudioUpload}
                        disabled={stepStatus.loading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-4 h-4" />
                        使用录制
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-800/50 text-gray-400">或</span>
                </div>
              </div>

              {/* Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-300">上传音频文件</h3>
                <div
                  onDrop={(e) => handleDrop('voice', e)}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => voiceFileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-cyan-500 transition-colors"
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-300 mb-2">点击上传或拖拽文件</p>
                  <p className="text-sm text-gray-500">MP3、WAV 或 WebM 音频文件</p>
                  <input
                    ref={voiceFileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileChange('voice', e)}
                    className="hidden"
                  />
                </div>
              </div>

              {stepStatus.error && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-300">
                  {stepStatus.error}
                </div>
              )}

              {stepStatus.loading && (
                <div className="flex items-center justify-center gap-3 text-cyan-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>正在处理你的声音...</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Appearance Cloning */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Video className="w-6 h-6 mr-3 text-cyan-400" />
                克隆你的外观
              </h2>

              <p className="text-gray-400 mb-6">
                上传一段你面对镜头的视频。确保光线充足、清晰可见。
              </p>

              <div
                onDrop={(e) => handleDrop('video', e)}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => videoFileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-cyan-500 transition-colors"
              >
                <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-300 mb-2">点击上传或拖拽文件</p>
                <p className="text-sm text-gray-500">MP4 或 WebM 视频文件</p>
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileChange('video', e)}
                  className="hidden"
                />
              </div>

              {stepStatus.error && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-300">
                  {stepStatus.error}
                </div>
              )}

              {stepStatus.loading && (
                <div className="flex items-center justify-center gap-3 text-cyan-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>正在处理你的外观...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Launch Button */}
        {stepStatus.completed && stepStatus.voiceId && stepStatus.sceneId && (
          <div className="mt-8 text-center">
            <button
              onClick={handleLaunch}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/50"
            >
              启动你的数字分身
            </button>
          </div>
        )}

        {/* Back Button */}
        {currentStep === 2 && !stepStatus.completed && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentStep(1)}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              ← 返回语音克隆
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

