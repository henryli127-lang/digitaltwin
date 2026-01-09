'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Mic, Video, MessageCircle, ArrowRight, Play, User } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [hasReplica, setHasReplica] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user has already created a digital replica
    const voiceId = localStorage.getItem('digital_replica_voice_id');
    const sceneId = localStorage.getItem('digital_replica_scene_id');
    const hasBoth = !!(voiceId && sceneId);
    setHasReplica(hasBoth);
    setIsChecking(false);
    
    // If replica exists, show a notification and auto-redirect option
    if (hasBoth) {
      // Optional: Auto-redirect after 2 seconds if user doesn't interact
      // Uncomment the following lines if you want auto-redirect:
      // const timer = setTimeout(() => {
      //   router.push('/chat');
      // }, 2000);
      // return () => clearTimeout(timer);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-8">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-400">AI 驱动的数字分身</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            数字分身
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12">
            录制一段30秒视频，AI 自动创建你的数字分身。然后与拥有你声音和外观的数字分身进行沉浸式对话。
          </p>

          {/* Status Banner */}
          {!isChecking && hasReplica && (
            <div className="mb-8 max-w-2xl mx-auto">
              <div className="px-6 py-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">检测到已创建的数字分身，可以直接开始对话</span>
                </div>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!isChecking && hasReplica ? (
              <>
                <Link
                  href="/chat"
                  className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/50 flex items-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  开始对话
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button
                  onClick={() => {
                    // Clear localStorage and redirect to create page
                    localStorage.removeItem('digital_replica_voice_id');
                    localStorage.removeItem('digital_replica_scene_id');
                    router.push('/create?new=true');
                  }}
                  className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-semibold text-lg transition-all flex items-center gap-2"
                >
                  <User className="w-5 h-5" />
                  重新创建
                </button>
              </>
            ) : !isChecking ? (
              <Link
                href="/create"
                className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/50 flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                创建你的数字分身
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <div className="px-8 py-4 text-gray-400">检查中...</div>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          {/* Feature 1: Video Recording */}
          <div className="group p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 hover:border-cyan-500/50 transition-all hover:transform hover:scale-105">
            <div className="w-14 h-14 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
              <Video className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">录制视频</h3>
            <p className="text-gray-400">
              使用摄像头录制30秒视频，系统会自动提取音频和视频用于克隆。
            </p>
          </div>

          {/* Feature 2: AI Processing */}
          <div className="group p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 hover:border-cyan-500/50 transition-all hover:transform hover:scale-105">
            <div className="w-14 h-14 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
              <Sparkles className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">AI 处理</h3>
            <p className="text-gray-400">
              自动创建外观克隆和语音克隆，实时显示处理进度和任务状态。
            </p>
          </div>

          {/* Feature 3: AI Conversation */}
          <div className="group p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 hover:border-cyan-500/50 transition-all hover:transform hover:scale-105">
            <div className="w-14 h-14 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
              <MessageCircle className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">AI 对话</h3>
            <p className="text-gray-400">
              与你的数字分身进行沉浸式视频对话，由先进的 AI 技术驱动。
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-32 max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            使用流程
          </h2>
          
          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-start gap-6 p-6 bg-gray-800/30 rounded-xl border border-gray-700/30">
              <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-lg">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">录制30秒视频</h3>
                <p className="text-gray-400">
                  使用摄像头录制一段30秒的视频，按照提示文字清晰读出。系统会自动从视频中提取音频和视频用于克隆。
                </p>
                <ul className="mt-2 text-sm text-gray-500 list-disc list-inside space-y-1">
                  <li>确保光线充足，面部清晰可见</li>
                  <li>保持正面面对摄像头</li>
                  <li>说话清晰，声音洪亮</li>
                </ul>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row items-start gap-6 p-6 bg-gray-800/30 rounded-xl border border-gray-700/30">
              <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-lg">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">AI 自动处理</h3>
                <p className="text-gray-400">
                  系统会自动完成以下任务：上传视频、创建外观克隆、提取音频、上传音频、创建语音克隆。整个过程会显示详细的进度条和任务状态。
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-start gap-6 p-6 bg-gray-800/30 rounded-xl border border-gray-700/30">
              <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-lg">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">开始对话</h3>
                <p className="text-gray-400">
                  处理完成后，输入你的消息，观看你的数字分身以你的声音和外观在实时视频中回应。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-32 text-center text-gray-500 text-sm">
          <p>由 Google Gemini AI 和 YiDevs 数字人技术驱动</p>
        </div>
      </div>
    </div>
  );
}
