// 暗色模式主题上下文
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS as LIGHT_COLORS } from './index';

// 深色主题颜色
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
    openai: '#10A37F',
    claude: '#D97706',
    gemini: '#0066FF',
    deepseek: '#6366F1',
    moonshot: '#AF52DE',
    mimo: '#FF3B30',
    qwen: '#FF9500',
    doubao: '#5856D6',
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
  themeMode: 'light',
  colors: LIGHT_COLORS,
  setThemeMode: () => {},
  modelTestStatus: {},
  setModelTestStatus: () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('system');
  const [modelTestStatus, setModelTestStatus] = useState({});

  useEffect(() => {
    AsyncStorage.getItem('@mianmian_theme_mode').then(v => {
      if (v && ['light', 'dark', 'system'].includes(v)) setThemeModeState(v);
    }).catch(() => {});
  }, []);

  const setThemeMode = useCallback((mode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem('@mianmian_theme_mode', mode).catch(() => {});
  }, []);

  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, colors, setThemeMode, modelTestStatus, setModelTestStatus }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export { DARK_COLORS };
