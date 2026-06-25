// 暗色模式主题上下文
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS as LIGHT_COLORS } from './index';
import { initLocale, setLocale as setI18nLocale, getLocale, getRawLocale } from '../i18n';

const DARK_COLORS = {
  primary: '#FFFFFF',
  primaryLight: '#BBBBBB',
  background: '#0E0E0E',
  surface: '#1A1A1A',
  surfaceSecondary: '#222222',
  text: '#FFFFFF',
  textSecondary: '#999999',
  textTertiary: '#666666',
  textInverse: '#000000',
  border: '#2A2A2A',
  borderLight: '#242424',
  divider: '#2A2A2A',
  userBubble: '#FFFFFF',
  userBubbleText: '#000000',
  aiBubble: '#222222',
  aiBubbleText: '#FFFFFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',
  modelColors: {
    openai: '#10A37F', claude: '#D97706', gemini: '#0066FF',
    deepseek: '#6366F1', moonshot: '#AF52DE', mimo: '#FF3B30',
    qwen: '#FF9500', doubao: '#5856D6', ernie: '#2932E1',
    zhipu: '#6B4CFF', hunyuan: '#006EFF', baichuan: '#FF6B35',
    grok: '#1DA1F2', yi: '#00B4D8', spark: '#FF4500',
    minimax: '#7C3AED', stepfun: '#00C9A7',
  },
  inputBackground: '#222222',
  inputBorder: '#3A3A3A',
  inputFocusBorder: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.75)',
  loader: '#FFFFFF',
  loaderSecondary: '#666666',
};

const ThemeContext = createContext({
  isDark: false,
  themeMode: 'system',
  colors: LIGHT_COLORS,
  setThemeMode: () => {},
  locale: 'system',
  rawLocale: 'system',
  localeReady: false,
  setLocale: () => {},
  modelTestStatus: {},
  setModelTestStatus: () => {},
  newsRefreshKey: 0,
  triggerNewsRefresh: () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('system');
  const [locale, setLocaleState] = useState('system');
  const [rawLocale, setRawLocale] = useState('system');
  const [localeReady, setLocaleReady] = useState(false);
  const [modelTestStatus, setModelTestStatus] = useState({});
  const [newsRefreshKey, setNewsRefreshKey] = useState(0);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('@mianmian_theme_mode'),
      initLocale(),
    ]).then(([v]) => {
      if (v && ['light', 'dark', 'system'].includes(v)) setThemeModeState(v);
      setRawLocale(getRawLocale());
      setLocaleState(getLocale());
      setLocaleReady(true);
    }).catch(() => {
      setRawLocale(getRawLocale());
      setLocaleState(getLocale());
      setLocaleReady(true);
    });
  }, []);

  const setLocale = useCallback((code) => {
    setRawLocale(code);
    setLocaleState(code === 'system' ? getLocale() : code);
    setI18nLocale(code);
  }, []);

  const setThemeMode = useCallback((mode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem('@mianmian_theme_mode', mode).catch(() => {});
  }, []);

  const triggerNewsRefresh = useCallback(() => {
    setNewsRefreshKey(k => k + 1);
  }, []);

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{
      isDark, themeMode, colors, setThemeMode,
      locale, rawLocale, localeReady, setLocale,
      modelTestStatus, setModelTestStatus,
      newsRefreshKey, triggerNewsRefresh,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export { DARK_COLORS };
