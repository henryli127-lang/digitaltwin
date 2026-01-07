# 测试指南 / Testing Guide

## 快速开始 / Quick Start

### 1. 安装依赖 / Install Dependencies

```bash
npm install
```

### 2. 配置环境变量 / Setup Environment Variables

复制环境变量模板并填入你的 API 密钥：

```bash
cp env.template .env.local
```

编辑 `.env.local` 文件，填入以下内容：

```env
GEMINI_API_KEY=your_gemini_api_key_here
YIDEVS_API_KEY=your_yidevs_api_key_here
YIDEVS_BASE_URL=https://api.yidevs.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. 启动开发服务器 / Start Development Server

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## 测试流程 / Testing Flow

### 步骤 1: 测试创建页面 / Test Create Page

1. 访问 `http://localhost:3000/create`
2. **测试语音克隆 (Step 1)**:
   - 点击 "Start Recording" 录制音频，或
   - 点击上传区域上传一个 MP3 音频文件
   - 等待处理完成（会显示 loading spinner）
   - 应该看到步骤 1 完成，自动跳转到步骤 2

3. **测试外观克隆 (Step 2)**:
   - 上传一个 MP4 视频文件（建议：对着摄像头说话的视频，5-30秒）
   - 等待处理完成
   - 应该看到 "Launch Your Digital Replica" 按钮出现

4. **验证数据存储**:
   - 打开浏览器开发者工具 (F12)
   - 查看 Application > Local Storage
   - 应该看到 `digital_replica_voice_id` 和 `digital_replica_scene_id`

### 步骤 2: 测试聊天页面 / Test Chat Page

1. 完成创建流程后，点击 "Launch Your Digital Replica" 按钮
   - 或直接访问 `http://localhost:3000/chat`

2. **测试聊天功能**:
   - 在底部输入框输入消息（例如："Hello, how are you?"）
   - 点击发送按钮或按 Enter 键
   - 观察以下流程：
     - 显示 "Thinking..." 加载动画
     - 连接状态变为 "Connecting"
     - 消息出现在左下角的消息历史中
     - 等待视频生成（可能需要 10-60 秒）
     - 视频自动播放

3. **测试视频播放**:
   - 确认视频全屏显示
   - 确认视频自动播放
   - 如果视频没有声音，尝试点击视频取消静音

## 测试 API 端点 / Testing API Endpoints

### 使用 curl 测试 / Using curl

#### 1. 测试文件上传 / Test File Upload

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/your/audio.mp3"
```

#### 2. 测试聊天 / Test Chat

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, how are you?"}'
```

#### 3. 测试语音克隆 / Test Voice Clone

```bash
curl -X POST http://localhost:3000/api/digital-human/create \
  -F "type=voice" \
  -F "file=@/path/to/your/audio.mp3" \
  -F "name=Test Voice"
```

#### 4. 测试视频生成 / Test Video Generation

```bash
curl -X POST http://localhost:3000/api/digital-human/talk \
  -H "Content-Type: application/json" \
  -d '{
    "textReply": "Hello, this is a test",
    "voiceId": "your_voice_id",
    "sceneId": "your_scene_id"
  }'
```

#### 5. 测试任务状态 / Test Task Status

```bash
curl http://localhost:3000/api/digital-human/status?taskId=your_task_id
```

## 常见问题排查 / Troubleshooting

### 问题 1: API 密钥错误 / API Key Errors

**症状**: 控制台显示 "GEMINI_API_KEY is not configured" 或类似错误

**解决**:
- 确认 `.env.local` 文件存在
- 确认环境变量名称正确
- 重启开发服务器 (`npm run dev`)

### 问题 2: 文件上传失败 / File Upload Fails

**症状**: 上传文件时出现错误

**解决**:
- 确认文件大小不超过 50MB
- 确认文件格式正确（音频：MP3, WAV, WebM；视频：MP4, WebM）
- 确认 `public/uploads` 目录有写入权限

### 问题 3: 视频不播放 / Video Not Playing

**症状**: 视频生成成功但无法播放

**解决**:
- 检查浏览器控制台是否有 CORS 错误
- 确认视频 URL 可访问
- 尝试手动点击视频播放按钮
- 检查浏览器是否阻止了自动播放（可能需要用户交互）

### 问题 4: 麦克风权限 / Microphone Permission

**症状**: 无法录制音频

**解决**:
- 确认浏览器已授予麦克风权限
- 在浏览器设置中检查权限
- 尝试使用 HTTPS（某些浏览器要求）

### 问题 5: 轮询超时 / Polling Timeout

**症状**: 视频生成一直显示 "Thinking..."

**解决**:
- 检查 Yidevs API 是否正常工作
- 查看浏览器网络标签页，确认 API 调用是否成功
- 检查任务状态 API 返回的内容

## 开发工具 / Development Tools

### 浏览器开发者工具 / Browser DevTools

- **Network Tab**: 查看所有 API 请求和响应
- **Console Tab**: 查看错误和日志
- **Application Tab**: 查看 Local Storage 数据

### 服务器日志 / Server Logs

开发服务器会在终端显示所有 API 请求和错误。

## 模拟测试（无真实 API）/ Mock Testing (Without Real APIs)

如果你想在没有真实 API 密钥的情况下测试 UI：

1. 可以修改 API 路由返回模拟数据
2. 或者使用环境变量控制是否使用模拟模式

## 下一步 / Next Steps

完成基本测试后，你可以：
- 测试不同的对话场景
- 测试长时间对话
- 测试错误恢复
- 测试移动端响应式设计

