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

## Open Source

This project is fully open source. Contributions and suggestions are welcome.

- **GitHub**: https://github.com/Chlgh/mianmian
- **Issues**: https://github.com/Chlgh/mianmian/issues
- **Releases**: https://github.com/Chlgh/mianmian/releases
- **License**: MIT License

## License

[MIT License](LICENSE)
