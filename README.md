# Digital Replica Web Application

A Next.js 14 application that allows users to create a digital avatar of themselves and chat with it.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide React
- **Backend**: Next.js API Routes (Serverless functions)
- **Storage**: Local filesystem (`public/uploads`)
- **AI Logic**: Google Gemini API (for conversation generation)
- **Digital Human Logic**: Yidevs API (for TTS and Video generation)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory with the following variables:

```env
# Google Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Yidevs API Configuration
YIDEVS_API_KEY=your_yidevs_api_key_here
YIDEVS_BASE_URL=https://api.yidevs.com

# Application Configuration
# IMPORTANT: For callbacks to work, this must be a publicly accessible URL
# Use ngrok/cloudflare tunnel for local development: https://your-tunnel-url.com
# Or use your production URL: https://your-domain.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**⚠️ 重要提示**：`NEXT_PUBLIC_BASE_URL` 必须是可公开访问的 URL，否则 YiDevs 无法发送回调通知。本地开发请使用内网穿透工具（如 ngrok）。详见 [CALLBACK_SETUP.md](./CALLBACK_SETUP.md)

3. Run the development server:
```bash
npm run dev
```

## API Routes

### POST `/api/upload`
Handles file upload to local storage.

**Request**: FormData with `file` field
**Response**: 
```json
{
  "success": true,
  "url": "/uploads/filename.ext",
  "filename": "original-name.ext",
  "size": 12345,
  "type": "audio/mpeg"
}
```

### POST `/api/chat`
Receives user text and returns AI-generated reply.

**Request**:
```json
{
  "text": "Hello, how are you?",
  "context": "Optional context string"
}
```
**Response**:
```json
{
  "success": true,
  "reply": "I'm doing well, thank you!"
}
```

### POST `/api/digital-human/create`
Handles voice and face cloning requests.

**Request**: FormData with:
- `type`: "voice" | "face"
- `file`: File (audio for voice, video for face)
- `name`: string (optional)

**Response**:
```json
{
  "success": true,
  "type": "voice",
  "voiceId": "voice-id-123",
  "name": "My Voice",
  "localUrl": "/uploads/file.mp3"
}
```

### POST `/api/digital-human/talk`
Chains TTS and video generation.

**Request**:
```json
{
  "textReply": "Hello, this is a test",
  "voiceId": "voice-id-123",
  "sceneId": "scene-id-456"
}
```
**Response**:
```json
{
  "success": true,
  "taskId": "task-id-789",
  "audioUrl": "https://..."
}
```

### GET `/api/digital-human/status`
Checks video generation status.

**Query Parameters**: `taskId` (required)

**Response**:
```json
{
  "success": true,
  "status": "completed",
  "videoUrl": "https://..."
}
```

## Project Structure

```
├── app/
│   └── api/
│       ├── upload/
│       ├── chat/
│       └── digital-human/
│           ├── create/
│           ├── talk/
│           └── status/
├── lib/
│   ├── api-services.ts  # Gemini and Yidevs API services
│   └── upload.ts        # File upload utilities
└── public/
    └── uploads/         # Local file storage
```

