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
- **国际化**：完整中英文支持，跟随系统语言自动切换（v1.1.0 新增）

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

## 更新日志

### v1.1.0（2026-06-26）

**新增功能**
- 国际化系统：完整中英文支持（215+ 翻译字符串），跟随系统语言自动切换
- 语言切换：设置弹窗新增语言选项（中文/English/跟随系统），切换后自动刷新热点新闻
- 热点错误提示：网络异常时在热点区域显示错误信息及图标，用户可手动下拉重试

**功能优化**
- 设置弹窗：主题选择按钮和语言选择按钮样式统一，选中态字体加粗，点击时卡片不再跳动
- 英文问候语：首页问候语缩短并限制单行显示，避免换行
- 热点数量：每源从2条提升至3条，3源最多9条取6条，容忍1个源失败仍能显示6条
- 跟随系统选项：选择后重启APP，选项仍保持"跟随系统"选中态，不再跳到其他选项

**问题修复**
- 热点启动不加载：修复 consecutiveFailures 累积导致热点板块永久隐藏的问题
- 热点 API 全部失败：修复 AbortSignal.timeout 在 React Native 0.85 中不支持导致所有API静默失败
- 热点去重后为空：fetchHotNews 添加兜底重试机制
- lastNews 被空覆盖：forceRefreshNews 防止空数组覆盖
- 热点缓存过期：getShownTitles 每次调用都过滤过期条目
- 跟随系统刷新：切换为"跟随系统"后关闭设置弹窗，热点正确刷新
- 语言检测修复：使用 expo-localization 替代不可靠的 I18nManager
- 首页热点加载时序：等待语言初始化完成后再加载热点

**构建优化**
- APK 大小从 70MB 缩减至 25MB
- 构建时间从 5分14秒 优化至 1分17秒（提速 76%）

**依赖变更**
- 新增 expo-localization

### v1.0.2（2026-06-24）

- 引导弹窗添加开源项目入口
- 更换项目图标

### v1.0.0（2026-06-24）

- 首次发布

## 开源协议

[MIT License](LICENSE)

## 致谢

- [Expo](https://expo.dev/)
- [React Native](https://reactnative.dev/)
- 各 AI 模型提供商
