// mianmian 主题配置 - 鸿蒙字体 + 简约风格
import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// 鸿蒙字体 - HarmonyOS Sans
// 系统自带：HarmonyOS Sans / HarmonyOS Sans SC
// Android 部分版本可能没有，后备为系统字体
const HARMONY_FONT = Platform.select({
  ios: 'HarmonyOS Sans',
  android: 'HarmonyOS Sans',
  default: 'System',
});

export const COLORS = {
  primary: '#000000',
  primaryLight: '#333333',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F7F7F8',
  
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',
  
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  divider: '#ECECEC',
  
  userBubble: '#000000',
  userBubbleText: '#FFFFFF',
  aiBubble: '#F0F0F0',
  aiBubbleText: '#000000',
  
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
  
  inputBackground: '#F5F5F5',
  inputBorder: '#E0E0E0',
  inputFocusBorder: '#000000',
  
  overlay: 'rgba(0, 0, 0, 0.5)',
  loader: '#000000',
  loaderSecondary: '#999999',
};

export const FONTS = {
  // 鸿蒙字体家族
  fontFamily: HARMONY_FONT,
  
  regular: {
    fontFamily: HARMONY_FONT,
    fontWeight: '400',
  },
  medium: {
    fontFamily: HARMONY_FONT,
    fontWeight: '500',
  },
  semibold: {
    fontFamily: HARMONY_FONT,
    fontWeight: '600',
  },
  bold: {
    fontFamily: HARMONY_FONT,
    fontWeight: '700',
  },
  
  // 字体大小
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  title: 34,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 9999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const LAYOUT = {
  screenWidth: width,
  screenHeight: height,
  tabBarHeight: 85,
  headerHeight: 56,
  maxContentWidth: 600,
  inputHeight: 48,
};

export default {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  LAYOUT,
};