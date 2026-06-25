# 面面 (mianmian)

Multi-model AI search comparison app — Query multiple AI models simultaneously, compare answers side by side, and find the best response.

## Features

- **Multi-model parallel comparison**: Send questions to multiple AI models at once, view real-time comparison results
- **Supports popular models**: OpenAI, Claude, Gemini, DeepSeek, Kimi, MiMo, Qwen, Doubao
- **Web search**: Some models support Web Search tool calling
- **Chat history**: Auto-save conversation records, auto-cleanup after 30 days
- **Dark mode**: Supports light/dark/follow system themes
- **Custom models**: Add any OpenAI-compatible API model
- **Hot topics**: Integrated trending news, one-click to ask
- **Internationalization**: Full Chinese/English support, auto-switch with system language (New in v1.1.0)

## Tech Stack

- Expo SDK 56
- React Native 0.85.3
- React 19.2.3
- React Navigation 7 (native-stack)
- AsyncStorage local persistence

## Quick Start

### Requirements

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Install

```bash
git clone https://github.com/Chlgh/mianmian.git
cd mianmian
npm install
```

### Development

```bash
npx expo start
```

Scan QR code, open with Expo Go or development build.

### Build APK

```bash
# Generate android directory
npx expo prebuild --platform android

# Build Release APK
cd android
.\gradlew.bat assembleRelease

# APK output path
# android/app/build/outputs/apk/release/app-release.apk
```

## Project Structure

```
src/
├── screens/          # Page components
│   ├── HomeScreen.js       # Home: chat input + multi-model answers
│   ├── ChatDetailScreen.js # Conversation details
│   ├── HistoryScreen.js    # History records
│   └── AccountScreen.js    # Model management
├── services/         # Business logic
│   ├── aiService.js        # Multi-model API calls
│   ├── storage.js          # AsyncStorage storage
│   └── newsService.js      # Hot news
├── theme/            # Theme configuration
│   ├── index.js            # Colors/fonts/spacing constants
│   └── ThemeContext.js      # Theme context
├── components/       # Shared components
└── navigation/       # Navigation config
```

## API Key Configuration

The app does not store any hardcoded API keys. Users manually enter API keys for each model in the "Model Management" page. Data is saved locally in AsyncStorage.

Supported model API formats:
- **OpenAI format**: OpenAI, DeepSeek, Kimi, MiMo, Qwen, Doubao, etc.
- **Claude format**: Anthropic Claude
- **Gemini format**: Google Gemini

## Known Issues

- **Hot News API Midnight Failure**: Around midnight (00:00-00:30), hot news APIs may fail. Affected endpoints:
  - `https://orz.ai/api/v1/dailynews?platform=baidu`
  - `https://orz.ai/api/v1/dailynews?platform=weibo`
  - `https://orz.ai/api/v1/dailynews?platform=zhihu`
  - Fallback: `https://api.vvhan.com/api/hotList/{baiduHot|wbHot|zhihuHot}`
  - **Status**: Not fixed yet

## Changelog

### v1.1.0 (2026-06-26)

**Added**
- i18n system: Full Chinese/English support (215+ translation strings), auto-switch with system language
- Language switch: New language options in settings (Chinese/English/Follow System), auto-refresh hot topics after switching
- Hot topics error display: Show error messages with icon on network failure, users can pull-to-refresh to retry

**Improved**
- Settings modal: Unified theme/language button styles, bold selected text, no card resizing on click
- English greeting: Shortened and limited to single line, no wrapping
- Hot topics count: Increased from 2 to 3 items per source, 3 sources max 9 items showing 6, tolerates 1 source failure
- Follow system option: Stays selected after app restart, no longer jumps to other options

**Fixed**
- Hot topics not loading on startup: consecutiveFailures accumulation caused permanent section hiding
- All hot topics APIs failing: AbortSignal.timeout unsupported in React Native 0.85, replaced with AbortController
- Empty hot topics after dedup: fetchHotNews added fallback retry mechanism
- lastNews overwritten by empty array: forceRefreshNews now protects against empty selection
- Hot topics cache expiration: getShownTitles now filters expired entries on every call
- Follow system language refresh: Correctly triggers news refresh when switching to Follow System
- Language detection fix: expo-localization replaces unreliable I18nManager
- Hot topics load timing: Waits for language initialization before loading

**Build Optimization**
- APK size: 70MB → 25MB
- Build time: 5m14s → 1m17s (76% faster)

**Dependencies**
- Added expo-localization

### v1.0.2 (2026-06-24)

- Added open source entry in guide modal
- Updated project icon

### v1.0.0 (2026-06-24)

- Initial release

## Open Source

This project is fully open source. Contributions and suggestions are welcome.

- **GitHub**: https://github.com/Chlgh/mianmian
- **Issues**: https://github.com/Chlgh/mianmian/issues
- **Releases**: https://github.com/Chlgh/mianmian/releases
- **License**: MIT License

## License

[MIT License](LICENSE)
