# 快速开始测试 / Quick Start Testing

## 第一步：安装依赖

```bash
npm install
```

## 第二步：设置环境变量

创建 `.env.local` 文件：

```bash
cp env.template .env.local
```

然后编辑 `.env.local`，填入你的 API 密钥。

## 第三步：启动服务器

```bash
npm run dev
```

## 第四步：测试页面

1. **打开浏览器访问**: `http://localhost:3000`
2. **访问创建页面**: `http://localhost:3000/create`
3. **访问聊天页面**: `http://localhost:3000/chat` (需要先完成创建)

## 测试检查清单

- [ ] 首页可以正常访问
- [ ] `/create` 页面显示正常
- [ ] 可以上传音频文件
- [ ] 可以录制音频（需要麦克风权限）
- [ ] 可以上传视频文件
- [ ] 创建完成后可以跳转到聊天页面
- [ ] `/chat` 页面显示正常
- [ ] 可以发送消息
- [ ] 可以看到 "Thinking..." 动画
- [ ] 视频可以正常播放

