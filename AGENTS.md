# AGENTS.md

## What is this

AIALL — Expo SDK 56 multi-model AI comparison app. Users ask a question, it queries multiple AI providers in parallel and shows side-by-side results. Chinese-language UI.

## Stack

- Expo SDK 56, React Native 0.85.3, React 19.2.3
- React Navigation 7 (native-stack)
- AsyncStorage for persistence (no backend server, no .env files — API keys stored in AsyncStorage)
- EAS Build for APK (`eas build --profile preview` or `--profile production`)
- npm as package manager (package-lock.json present)

## Commands

```bash
npx expo start          # Dev server
npx expo run:android    # Run on Android device/emulator
npx expo start --web    # Run in browser
eas build --profile preview --platform android   # Build APK (internal distribution)
eas build --profile production --platform android # Build APK (production)
```

EAS builds require `eas login` first. No lint, typecheck, or test commands are configured. The codebase is plain JavaScript (no TypeScript).

## Project structure

```
App.js                  # Entry point, wraps ThemeProvider + NavigationContainer
index.js                # registerRootComponent(App)
src/
  screens/
    HomeScreen.js       # Main chat input + multi-model response swiper
    ChatDetailScreen.js # View saved conversation details
    HistoryScreen.js    # Conversation history list
    AccountScreen.js    # Model management (API keys, drag-sort, theme toggle)
  navigation/
    TabNavigator.js     # Custom gesture-swipe tab bar (not default RN tabs)
  services/
    aiService.js        # Multi-provider API calls (OpenAI/Claude/Gemini format)
    storage.js          # AsyncStorage CRUD for conversations, accounts, settings
    hotTopicsService.js # Hot topics data
  theme/
    index.js            # COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, LAYOUT
    ThemeContext.js      # Dark/light/system theme via React Context
  components/
    MessageBubble.js, ModelAnswerCard.js, MarkdownRenderer.js,
    SummaryCard.js, ModelTag.js, LoadingDots.js
```

`task_progress.md` at root is a working checklist, not source of truth.

## Architecture gotchas

- **Custom tab navigation**: `TabNavigator.js` uses a horizontal PanResponder slider, not React Navigation's built-in tab navigator. Swiping between tabs is gesture-driven. Don't replace with `@react-navigation/bottom-tabs`'s default.
- **Three screens render simultaneously**: Home, History, and Account are all mounted at once inside the slider. HomeScreen polls `getAccounts()` every 2s via `setInterval` because `useFocusEffect` doesn't fire (screens don't gain/lose focus).
- **AI service supports 3 API formats**: `openai` (default for most providers), `claude` (Anthropic), `gemini` (Google). Each has different request/response parsing. Adding a new provider means picking the right `format` string.
- **Web search fallback**: If a model doesn't support `web_search` tool calling, `aiService.js:252` catches the error and retries without web search. This is intentional.
- **Theme colors are duplicated**: Light colors in `src/theme/index.js`, dark colors in `ThemeContext.js`. When adding new color tokens, update both.
- **Expo SDK 56 specifics**: This project targets Expo SDK 56. If you need to check API compatibility, reference https://docs.expo.dev/versions/v56.0.0/.

## Model presets

Eight preset providers defined in `AccountScreen.js`: OpenAI, Claude, Gemini, DeepSeek, Kimi, MiMo, Qwen, Doubao. Each has a hardcoded API endpoint, color, and doc URL. Custom models can be added with `format: 'openai'`.

## Storage keys

All data stored under `@aiall_*` AsyncStorage keys: `@aiall_conversations`, `@aiall_accounts`, `@aiall_settings`. Conversations auto-clean after 30 days on app startup.

## Style conventions

- All UI text is Chinese (Simplified)
- Color constants imported from `src/theme/index.js` — never hardcode hex values in screens
- Use `useTheme()` hook for runtime colors (supports dark mode)
- Font family is HarmonyOS Sans (falls back to system font on unsupported platforms)
- Styles defined as `StyleSheet.create()` at bottom of each file
- Header safe area: all screens use `paddingTop: SPACING.xl + 40` for status bar clearance

## Debugging & environment

- `npx expo start -c` — clears Metro bundler cache (fixes stale module issues after dependency changes)
- Debug tools: Chrome DevTools (`adb reverse tcp:8081 tcp:8081` for Android), React DevTools (`npx react-devtools`)
- `npx expo start --clear` is an alias for `-c`

## API key security

API keys are never hardcoded. Users enter them manually in `AccountScreen` via a modal, and they are persisted to `AsyncStorage` under `@aiall_accounts`. The `aiService.js` reads keys from the account objects at call time. Never commit or log API keys.

## Known limitations & future improvements

- **No TypeScript**: plain JS throughout. Extra care required when modifying files — there is no static type checking to catch regressions.
- **No ESLint or Prettier**: no automated code style enforcement. Follow existing conventions manually.
- **No unit tests**: no test framework is configured. Manual verification on a device/emulator is the only way to validate changes.
- When modifying existing code, verify by running `npx expo run:android` or `npx expo start --web` and testing the affected flow end-to-end.

## Optimization note: 2s polling

`HomeScreen.js` polls `getAccounts()` every 2s via `setInterval` because `useFocusEffect` never fires — all three tab screens are mounted simultaneously inside a PanResponder slider, so React Navigation's focus lifecycle doesn't apply. This is a temporary workaround that drains battery. A future refactor should replace the custom slider with a proper `@react-navigation/bottom-tabs` navigator, which would enable `useFocusEffect` and eliminate the polling.

## AI development guidelines

When adding features to this codebase:
- **Reuse existing components**: `ModelTag`, `ModelAnswerCard`, `LoadingDots`, `MarkdownRenderer`, etc. exist — don't create duplicates.
- **No hardcoded hex colors**: always use `COLORS.*` from `src/theme/index.js` or `useTheme()` for runtime values. Both light and dark palettes must be updated when adding new color tokens.
- **New AI models**: add presets in `AccountScreen.js` (`PRESET_MODELS` array) with correct `format`, `apiEndpoint`, `color`, and `docUrl`. Also mirror in `storage.js` `getDefaultAccounts()` for first-run defaults. Also, add the request/response parsing logic to `aiService.js`'s provider switch, as each format (openai/claude/gemini) requires specific handling.
