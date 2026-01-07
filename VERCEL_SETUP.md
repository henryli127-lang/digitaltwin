# Vercel 部署配置指南

## 环境变量配置

你的 Vercel URL: `digitaltwin-pi-teal.vercel.app`

### 1. 在 Vercel 控制台设置环境变量

访问你的 Vercel 项目设置：https://vercel.com/your-project/settings/environment-variables

添加以下环境变量：

```env
# 必需的环境变量
GEMINI_API_KEY=your_gemini_api_key_here
YIDEVS_API_KEY=your_yidevs_api_key_here
YIDEVS_BASE_URL=https://api.yidevs.com

# 重要：使用完整的 HTTPS URL
NEXT_PUBLIC_BASE_URL=https://digitaltwin-pi-teal.vercel.app
```

### 2. 更新本地 .env.local（用于本地开发）

```env
# Google Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Yidevs API Configuration
YIDEVS_API_KEY=your_yidevs_api_key_here
YIDEVS_BASE_URL=https://api.yidevs.com

# Application Configuration
# 生产环境使用 Vercel URL
NEXT_PUBLIC_BASE_URL=https://digitaltwin-pi-teal.vercel.app

# 本地开发时如果需要测试回调，可以使用 ngrok
# NEXT_PUBLIC_BASE_URL=https://your-ngrok-url.ngrok.io
```

### 3. 重新部署

在 Vercel 控制台点击 "Redeploy" 或推送代码到 Git 仓库以触发自动部署。

### 4. 验证配置

部署完成后，访问：https://digitaltwin-pi-teal.vercel.app

测试流程：
1. 上传音频文件
2. 上传视频文件
3. 开始对话

### 注意事项

- ✅ 确保使用 `https://` 协议（Vercel 默认提供 HTTPS）
- ✅ 不要包含末尾的斜杠 `/`
- ✅ 环境变量设置后需要重新部署才能生效
- ✅ `NEXT_PUBLIC_BASE_URL` 必须以 `https://` 开头，否则 YiDevs API 无法访问

### 故障排查

如果仍然出现 404 错误：
1. 检查 Vercel 环境变量是否正确设置
2. 确认已重新部署
3. 检查 Vercel 部署日志
4. 验证音频文件 URL 是否可以公开访问：
   ```
   https://digitaltwin-pi-teal.vercel.app/uploads/your-file.mp3
   ```

