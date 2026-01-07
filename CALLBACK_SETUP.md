# 回调 URL 配置指南 / Callback URL Setup Guide

## 问题说明

YiDevs API 需要在任务完成时通过 POST 请求访问你的回调 URL。如果回调 URL 无法公开访问，YiDevs 将无法发送回调通知。

**问题**：
- `http://localhost:3000` 只能在本地访问，外部服务无法访问
- YiDevs API 服务器无法访问你的本地开发环境

## 解决方案

### 方案 1: 本地开发 - 使用内网穿透工具（推荐）

#### 使用 ngrok（免费）

1. **安装 ngrok**：
   ```bash
   # macOS
   brew install ngrok
   
   # 或下载：https://ngrok.com/download
   ```

2. **启动 Next.js 开发服务器**：
   ```bash
   npm run dev
   ```

3. **在另一个终端启动 ngrok**：
   ```bash
   ngrok http 3000
   ```

4. **获取公网 URL**：
   ngrok 会显示类似这样的输出：
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:3000
   ```
   复制 `https://abc123.ngrok.io` 这个 URL

5. **更新 `.env.local`**：
   ```env
   NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io
   ```

6. **重启开发服务器**：
   ```bash
   # 停止当前服务器 (Ctrl+C)，然后重新启动
   npm run dev
   ```

**注意**：
- 免费版 ngrok URL 每次启动都会变化
- 需要重新更新 `NEXT_PUBLIC_BASE_URL` 并重启服务器
- 免费版有连接数限制

#### 使用 Cloudflare Tunnel (cloudflared) - 免费且更稳定

1. **安装 cloudflared**：
   ```bash
   # macOS
   brew install cloudflare/cloudflare/cloudflared
   ```

2. **启动隧道**：
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

3. **获取公网 URL**（类似 `https://xxx.trycloudflare.com`）

4. **更新 `.env.local`** 并重启服务器

#### 使用 localtunnel（免费，简单）

1. **安装**：
   ```bash
   npm install -g localtunnel
   ```

2. **启动隧道**：
   ```bash
   lt --port 3000
   ```

3. **使用返回的 URL 更新配置**

### 方案 2: 部署到公网服务器（生产环境）

#### 选项 A: Vercel（推荐，免费）

1. **安装 Vercel CLI**：
   ```bash
   npm i -g vercel
   ```

2. **部署**：
   ```bash
   vercel
   ```

3. **获取部署 URL**（类似 `https://your-app.vercel.app`）

4. **设置环境变量**：
   - 在 Vercel 控制台设置 `NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app`
   - 设置其他环境变量（API keys）

#### 选项 B: Railway / Render / Fly.io

这些平台都提供免费套餐，可以快速部署 Next.js 应用。

### 方案 3: 使用云服务器

如果你有自己的服务器：

1. **部署应用**到服务器
2. **配置域名**（可选，但推荐）
3. **设置 HTTPS**（必需，某些 API 要求 HTTPS）
4. **更新 `NEXT_PUBLIC_BASE_URL`** 为你的公网地址

## 验证回调 URL 可访问

### 方法 1: 使用 curl 测试

```bash
curl -X POST https://your-public-url.com/api/digital-human/callback \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

应该返回：
```json
{
  "success": true,
  "message": "Callback received"
}
```

### 方法 2: 使用在线工具

访问 https://webhook.site 或类似工具，获取临时回调 URL 进行测试。

### 方法 3: 检查服务器日志

当 YiDevs 发送回调时，你应该在服务器日志中看到：
```
YiDevs callback received: { ... }
```

## 环境变量配置

### 开发环境（使用 ngrok）

```env
# .env.local
NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io
GEMINI_API_KEY=your_key
YIDEVS_API_KEY=your_key
```

### 生产环境

```env
# .env.production
NEXT_PUBLIC_BASE_URL=https://your-domain.com
GEMINI_API_KEY=your_key
YIDEVS_API_KEY=your_key
```

## 回调端点说明

回调端点：`POST /api/digital-human/callback`

**接收的回调类型**：

1. **场景克隆完成回调**：
   ```json
   {
     "code": 200,
     "msg": "success",
     "data": {
       "scene_task_id": 123,
       "status": "completed"
     }
   }
   ```

2. **视频生成完成回调**：
   ```json
   {
     "code": 200,
     "msg": "success",
     "data": {
       "video_task_id": 456,
       "status": "completed",
       "video_url": "https://..."
     }
   }
   ```

## 故障排查

### 问题 1: 回调未收到

**可能原因**：
- 回调 URL 无法访问（localhost）
- 防火墙阻止
- HTTPS/HTTP 协议不匹配

**解决**：
- 使用内网穿透工具
- 检查防火墙设置
- 确保使用 HTTPS（生产环境）

### 问题 2: 回调 URL 变化

**问题**：使用 ngrok 免费版，URL 每次启动都变化

**解决**：
- 使用 ngrok 付费版（固定域名）
- 使用 Cloudflare Tunnel（更稳定）
- 部署到固定域名的服务器

### 问题 3: CORS 错误

**解决**：回调端点不需要 CORS，因为是从服务器到服务器的请求。

## 最佳实践

1. **开发环境**：使用 ngrok 或 Cloudflare Tunnel
2. **生产环境**：部署到 Vercel/Railway 等平台
3. **测试**：使用 webhook.site 测试回调是否正常工作
4. **监控**：记录所有回调请求，便于调试
5. **安全**：在生产环境中验证回调来源（可选）

## 快速开始（开发环境）

```bash
# 1. 启动开发服务器
npm run dev

# 2. 在另一个终端启动 ngrok
ngrok http 3000

# 3. 复制 ngrok 提供的 HTTPS URL

# 4. 更新 .env.local
echo "NEXT_PUBLIC_BASE_URL=https://your-ngrok-url.ngrok.io" >> .env.local

# 5. 重启开发服务器
# Ctrl+C 停止，然后 npm run dev
```

现在你的回调 URL `https://your-ngrok-url.ngrok.io/api/digital-human/callback` 可以被 YiDevs API 访问了！

