# Vercel Blob Storage 配置指南

## 已完成的配置

你的 Blob Store base URL: `https://w9txwt6yglmsa9cl.public.blob.vercel-storage.com`

## 环境变量配置

### 在 Vercel 控制台设置

访问你的 Vercel 项目设置，确保以下环境变量已设置：

```env
# API Keys
GEMINI_API_KEY=your_gemini_api_key
YIDEVS_API_KEY=your_yidevs_api_key
YIDEVS_BASE_URL=https://api.yidevs.com

# Application URL
NEXT_PUBLIC_BASE_URL=https://digitaltwin-pi-teal.vercel.app

# Blob Storage Token (自动设置)
# BLOB_READ_WRITE_TOKEN 会在 Vercel 中自动配置，无需手动设置
```

## 代码更新说明

### 1. 已安装依赖
- `@vercel/blob`: 用于上传文件到 Vercel Blob Storage

### 2. 自动检测环境
代码会自动检测是否在 Vercel 环境中：
- ✅ Vercel 环境：使用 Blob Storage
- ✅ 本地开发：使用本地文件系统

### 3. 文件上传流程

**Vercel 环境：**
1. 文件上传到 Vercel Blob Storage
2. 返回公开可访问的 HTTPS URL（格式：`https://w9txwt6yglmsa9cl.public.blob.vercel-storage.com/uploads/xxx.mp3`）
3. 该 URL 可以直接传递给 YiDevs API

**本地开发：**
1. 文件保存到 `public/uploads/` 目录
2. 返回相对路径 `/uploads/xxx.mp3`
3. 与 `NEXT_PUBLIC_BASE_URL` 组合成完整 URL

## 部署步骤

1. **安装依赖**（如果还没有）：
   ```bash
   npm install
   ```

2. **提交代码**：
   ```bash
   git add .
   git commit -m "Add Vercel Blob Storage support"
   git push
   ```

3. **Vercel 会自动部署**

4. **验证部署**：
   - 访问：https://digitaltwin-pi-teal.vercel.app
   - 测试上传音频文件
   - 检查是否能成功创建语音克隆

## 验证 Blob Storage 是否工作

上传文件后，检查返回的 URL：
- ✅ 应该以 `https://w9txwt6yglmsa9cl.public.blob.vercel-storage.com/` 开头
- ✅ URL 应该可以公开访问
- ✅ YiDevs API 应该能够访问该 URL

## 故障排查

### 问题 1: "BLOB_READ_WRITE_TOKEN is not set"

**解决**：
1. 在 Vercel 控制台确认 Blob Storage 已启用
2. 检查环境变量中是否有 `BLOB_READ_WRITE_TOKEN`
3. 如果没有，重新连接 Blob Storage

### 问题 2: 文件上传失败

**检查**：
1. Vercel 部署日志
2. Blob Storage 配额是否足够
3. 文件大小是否超过限制（默认 4.5MB，可升级）

### 问题 3: URL 无法访问

**检查**：
1. Blob Storage 的访问权限设置为 `public`
2. URL 格式正确
3. 文件确实已上传成功

## 优势

使用 Vercel Blob Storage 的好处：
- ✅ 无需管理文件系统
- ✅ 自动 CDN 加速
- ✅ 公开可访问的 HTTPS URL
- ✅ 适合 serverless 环境
- ✅ 自动扩展

现在你的应用应该可以在 Vercel 上正常工作了！

