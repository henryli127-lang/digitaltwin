# 阿里云 OSS 配置指南

## 概述

本项目使用阿里云 OSS（Object Storage Service）来存储上传的音频和视频文件。OSS 提供公开可访问的 HTTPS URL，确保 YiDevs API 可以访问这些文件。

## 前置要求

1. 拥有阿里云账号
2. 已创建 OSS 存储桶（Bucket）
3. 已获取 AccessKey ID 和 AccessKey Secret

## 步骤 1: 创建 OSS 存储桶

1. 登录 [阿里云控制台](https://oss.console.aliyun.com/)
2. 点击"创建 Bucket"
3. 配置存储桶：
   - **Bucket 名称**：自定义（例如：`digitaltwin-uploads`）
   - **地域**：选择离你最近的地域（例如：`华东1（杭州）` → `oss-cn-hangzhou`）
   - **存储类型**：标准存储
   - **读写权限**：**公共读**（重要！确保文件可以公开访问）
   - **服务端加密**：可选
4. 点击"确定"创建

## 步骤 2: 获取 AccessKey

1. 登录阿里云控制台
2. 鼠标悬停在右上角头像，点击"AccessKey 管理"
3. 如果提示安全验证，完成验证
4. 创建 AccessKey（如果还没有）
5. 保存 **AccessKey ID** 和 **AccessKey Secret**（只显示一次，请妥善保存）

## 步骤 3: 配置环境变量

### 本地开发（.env.local）

在项目根目录的 `.env.local` 文件中添加：

```env
# Aliyun OSS Configuration
ALIYUN_OSS_ACCESS_KEY_ID=your_access_key_id
ALIYUN_OSS_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=your-bucket-name
```

### 可选：自定义域名

如果你为 OSS 存储桶配置了自定义域名，可以添加：

```env
ALIYUN_OSS_ENDPOINT=https://your-custom-domain.com
```

如果不设置，将使用默认的 OSS 域名：`https://{bucket}.{region}.aliyuncs.com`

### Vercel 部署

在 Vercel 项目设置中添加环境变量：

1. 访问 Vercel 项目设置
2. 进入 "Environment Variables"
3. 添加以下变量：
   - `ALIYUN_OSS_ACCESS_KEY_ID`
   - `ALIYUN_OSS_ACCESS_KEY_SECRET`
   - `ALIYUN_OSS_REGION`
   - `ALIYUN_OSS_BUCKET`
   - `ALIYUN_OSS_ENDPOINT`（可选）

## 步骤 4: 安装依赖

```bash
npm install
```

这将安装 `ali-oss` 包。

## 步骤 5: 配置存储桶权限

确保存储桶的读写权限设置为 **公共读**：

1. 在 OSS 控制台选择你的存储桶
2. 进入"权限管理" → "读写权限"
3. 设置为"公共读"或"公共读写"
4. 保存

**注意**：公共读意味着任何人都可以通过 URL 访问文件。如果文件包含敏感信息，请考虑使用私有存储桶 + 签名 URL 的方式。

## 步骤 6: 验证配置

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问创建页面，上传一个音频文件

3. 检查服务器日志，应该看到：
   ```
   === File Uploaded to Aliyun OSS ===
   Filename: uploads/xxx.mp3
   OSS URL: https://your-bucket.oss-cn-hangzhou.aliyuncs.com/uploads/xxx.mp3
   ```

4. 在浏览器中访问返回的 URL，确认文件可以访问

## 常见地域代码

| 地域 | Region 代码 |
|------|------------|
| 华东1（杭州） | `oss-cn-hangzhou` |
| 华东2（上海） | `oss-cn-shanghai` |
| 华北1（青岛） | `oss-cn-qingdao` |
| 华北2（北京） | `oss-cn-beijing` |
| 华北3（张家口） | `oss-cn-zhangjiakou` |
| 华南1（深圳） | `oss-cn-shenzhen` |
| 香港 | `oss-cn-hongkong` |
| 美国西部1（硅谷） | `oss-us-west-1` |
| 美国东部1（弗吉尼亚） | `oss-us-east-1` |
| 亚太东南1（新加坡） | `oss-ap-southeast-1` |

## 故障排查

### 问题 1: "Aliyun OSS configuration is incomplete"

**原因**：环境变量未正确配置

**解决**：
1. 检查 `.env.local` 文件是否存在
2. 确认所有必需的环境变量都已设置
3. 重启开发服务器

### 问题 2: "AccessDenied" 错误

**原因**：AccessKey 权限不足或存储桶权限设置错误

**解决**：
1. 确认 AccessKey 有 OSS 的读写权限
2. 检查存储桶的读写权限是否为"公共读"
3. 确认存储桶名称和地域代码正确

### 问题 3: 文件上传成功但 URL 无法访问

**原因**：存储桶权限未设置为公共读

**解决**：
1. 在 OSS 控制台检查存储桶权限
2. 设置为"公共读"
3. 如果使用自定义域名，检查域名配置

### 问题 4: 上传的文件类型不正确

**原因**：MIME 类型检测失败

**解决**：
- 代码会自动检测文件类型
- 如果检测失败，会使用 `application/octet-stream` 作为默认类型

## 成本说明

阿里云 OSS 的计费方式：
- **存储费用**：按实际存储容量计费
- **流量费用**：按下载流量计费
- **请求费用**：按 API 请求次数计费

对于小规模使用，成本通常很低。建议：
- 定期清理不需要的文件
- 使用生命周期规则自动删除旧文件
- 监控使用量

## 安全建议

1. **不要将 AccessKey 提交到 Git**
   - 确保 `.env.local` 在 `.gitignore` 中
   - 使用环境变量管理敏感信息

2. **使用子账号 AccessKey**
   - 创建专门的子账号用于 OSS 访问
   - 只授予必要的 OSS 权限

3. **定期轮换 AccessKey**
   - 定期更新 AccessKey
   - 删除不再使用的 AccessKey

4. **监控访问日志**
   - 定期检查 OSS 访问日志
   - 发现异常访问及时处理

## 优势

使用阿里云 OSS 的好处：
- ✅ 公开可访问的 HTTPS URL
- ✅ 高可用性和可靠性
- ✅ CDN 加速支持
- ✅ 适合国内访问（如果选择国内地域）
- ✅ 灵活的权限管理
- ✅ 成本可控

现在你的应用应该可以使用阿里云 OSS 存储文件了！

