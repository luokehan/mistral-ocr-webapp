# Mistral OCR Web App

![四季背景效果](https://img.shields.io/badge/特色-四季动态背景-brightgreen)
![OCR功能](https://img.shields.io/badge/功能-OCR文档识别-blue)
![Next.js](https://img.shields.io/badge/技术-Next.js-black)
![React](https://img.shields.io/badge/技术-React-61dafb)

一个美观、功能强大的OCR文档识别系统，具有莫兰迪风格设计和四季交替的动态背景。本系统能够从PDF文件中提取文本内容，并提供精美格式化的输出，支持表格、数学公式和丰富的Markdown渲染。
## 网站演示
https://ocr.kehan.ink/
## ✨ 特色功能

- **文档OCR识别**: 从PDF文件中准确提取文本、表格和图像内容
- **精美的四季动态背景**: 
  - 🌸 **春季**: 飘落的樱花、蝴蝶和轻盈的云彩
  - ☀️ **夏季**: 明亮的阳光、光斑和萤火虫效果
  - 🍁 **秋季**: 落叶飘零、细雨和地面水坑效果
  - ❄️ **冬季**: 雪花飘落、雾气和地面积雪效果
- **Markdown渲染**: 支持表格、代码块、数学公式等高级格式
- **多种输出格式**: 支持JSON和Markdown两种格式查看和下载
- **响应式设计**: 适配从移动端到桌面端的各种设备
- **高性能设计**: 智能检测设备性能，自动调整视觉效果复杂度

## 🛠️ 技术栈

- **前端框架**: Next.js 14、React 18、TypeScript
- **样式处理**: Tailwind CSS、JSX样式
- **文档处理**: 
  - Markdown渲染: react-markdown
  - 数学公式支持: remark-math、rehype-katex
  - 表格支持: remark-gfm
- **API集成**: Mistral AI接口用于OCR处理
- **动画效果**: 纯CSS实现的复杂动画效果

## 📋 环境要求

- Node.js 18.0+
- npm 9.0+
- 现代浏览器（Chrome、Firefox、Safari、Edge等）

## 🚀 快速开始

### 安装依赖

```bash
# 克隆仓库
git clone <仓库地址>
cd ocr

# 安装依赖
npm install
```

### 配置环境变量

在项目根目录创建`.env.local`文件并配置以下变量：

```
NEXT_PUBLIC_API_BASE_URL=<您的API基础URL>
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 [http://localhost:3000](http://localhost:3000) 启动。

### 构建生产版本

```bash
npm run build
npm run start
```

## 📖 使用指南

1. **上传PDF文件**: 在首页拖放或选择PDF文件
2. **输入API密钥**: 在指定字段填入您的API密钥
3. **处理文档**: 点击"Extract Text from PDF"按钮
4. **查看结果**: 
   - 在JSON或Markdown标签页查看识别结果
   - 使用复制、下载按钮导出内容
   - 欣赏四季变换的背景效果
     
5.**温馨提示**：由于mistral输出的latex有格式上的问题，markdown演示的并不好，本站主要功能是把pdf转为ai能读懂的markdown形式     

## 🌈 四季背景效果

本应用具有独特的四季交替动态背景，每隔1分钟自动切换一次季节效果：

### 春季 (Spring)
浅粉色和嫩绿色的渐变背景，飘落的樱花花瓣，配以轻盈的云彩和彩色蝴蝶，营造春天的生机与活力。

### 夏季 (Summer)
明亮的天空渐变背景，强烈的阳光效果，闪烁的光斑和底部萤火虫，展现夏日的热情与活力。

### 秋季 (Autumn)
橙色和红色调的渐变背景，飘落的落叶，轻微的细雨效果和地面水坑涟漪，呈现秋天的丰收与宁静。

### 冬季 (Winter)
白色和淡灰色的渐变背景，飘落的雪花，水平飘动的雾气和地面积雪效果，营造冬天的寒冷与纯净。

## 🔧 自定义配置

### 调整四季效果

编辑`components/weather-background.tsx`文件：

```typescript
// 修改自动切换时间（默认为60000毫秒，即1分钟）
const interval = setInterval(() => {
  setSeason(prev => {
    const currentIndex = seasons.indexOf(prev);
    const nextIndex = (currentIndex + 1) % seasons.length;
    return seasons[nextIndex];
  });
}, 60000); // 在此修改时间间隔
```

### 性能优化

本应用会自动检测设备性能并调整动画元素数量：

```typescript
const getElementCount = (type: string): number => {
  if (isMobile) {
    // 移动设备上减少粒子数量
    switch (type) {
      case 'cloud': return 4; // 修改此处可调整数量
      // ...其他元素
    }
  } else {
    // 桌面设备根据性能调整
    const performanceLevel = window.navigator.hardwareConcurrency || 4;
    const isHighEnd = performanceLevel >= 8;
    
    switch (type) {
      case 'cloud': return isHighEnd ? 10 : 6; // 根据性能调整数量
      // ...其他元素
    }
  }
};
```

## 📝 贡献指南

欢迎对本项目进行贡献！请遵循以下步骤：

1. Fork本仓库
2. 创建您的功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

## 👏 致谢

- 感谢Mistral AI提供OCR识别服务
- 感谢所有为本项目做出贡献的开发者
- 莫兰迪色彩灵感来源于莫兰迪画作

---

Crafted with ❤️ by [kehanluo] 
