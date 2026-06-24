# 面面 (mianmian)

[English](README_EN.md) | 中文

多模型 AI 搜索对比应用 — 同时调用多个 AI 模型，对比回答质量，找到最佳答案。

## 功能特性

- **多模型并行对比**：同时向多个 AI 模型发送问题，实时查看对比结果
- **支持主流模型**：OpenAI、Claude、Gemini、DeepSeek、Kimi、MiMo、Qwen、豆包
- **联网搜索**：部分模型支持 Web Search 工具调用
- **对话历史**：自动保存对话记录，30 天自动清理
- **深色模式**：支持浅色/深色/跟随系统
- **自定义模型**：可添加任意 OpenAI 兼容接口的模型
- **热点推荐**：集成今日热点新闻，一键提问

## 技术栈

- Expo SDK 56
- React Native 0.85.3
- React 19.2.3
- React Navigation 7 (native-stack)
- AsyncStorage 本地持久化

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- Expo CLI (`npm install -g expo-cli`)

### 安装

```bash
git clone https://github.com/yourusername/mianmian.git
cd mianmian
npm install
```

### 开发

```bash
npx expo start
```

扫描二维码，使用 Expo Go 或开发构建打开。

### 构建 APK

```bash
# 生成 android 目录
npx expo prebuild --platform android

# 构建 Release APK
cd android
.\gradlew.bat assembleRelease

# APK 输出路径
# android/app/build/outputs/apk/release/app-release.apk
```

## 项目结构

```
src/
├── screens/          # 页面组件
│   ├── HomeScreen.js       # 主页：对话输入 + 多模型回答
│   ├── ChatDetailScreen.js # 对话详情
│   ├── HistoryScreen.js    # 历史记录
│   └── AccountScreen.js    # 模型管理
├── services/         # 业务逻辑
│   ├── aiService.js        # 多模型 API 调用
│   ├── storage.js          # AsyncStorage 存储
│   └── newsService.js      # 热点新闻
├── theme/            # 主题配置
│   ├── index.js            # 颜色/字体/间距常量
│   └── ThemeContext.js      # 主题上下文
├── components/       # 通用组件
└── navigation/       # 导航配置
```

## API Key 配置

应用不存储任何硬编码的 API Key。用户在「模型管理」页面手动输入各模型的 API Key，数据保存在本地 AsyncStorage。

支持的模型 API 格式：
- **OpenAI 格式**：OpenAI、DeepSeek、Kimi、MiMo、Qwen、豆包等
- **Claude 格式**：Anthropic Claude
- **Gemini 格式**：Google Gemini

## 已知问题

- **热点 API 零点故障**：每日零点（00:00-00:30）左右，热点接口可能请求失败。涉及的 API 接口：
  - `https://orz.ai/api/v1/dailynews?platform=baidu`
  - `https://orz.ai/api/v1/dailynews?platform=weibo`
  - `https://orz.ai/api/v1/dailynews?platform=zhihu`
  - 备用接口：`https://api.vvhan.com/api/hotList/{baiduHot|wbHot|zhihuHot}`
  - **状态**：暂未修复

## 开源协议

[MIT License](LICENSE)

## 致谢

- [Expo](https://expo.dev/)
- [React Native](https://reactnative.dev/)
- 各 AI 模型提供商
