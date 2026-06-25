import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import zhCN from './zh-CN';
import en from './en';

const LOCALE_KEY = '@mianmian_locale';
const translations = { 'zh-CN': zhCN, en };

let currentLocale = 'zh-CN';
let rawLocale = 'system'; // 用户设置的原始值

export const getLocale = () => currentLocale;
export const getRawLocale = () => rawLocale;

export const setLocale = async (code) => {
  rawLocale = code;
  if (code === 'system') {
    currentLocale = resolveSystemLocale();
  } else {
    currentLocale = code;
  }
  await AsyncStorage.setItem(LOCALE_KEY, code).catch(() => {});
};

export const initLocale = async () => {
  try {
    const saved = await AsyncStorage.getItem(LOCALE_KEY);
    if (saved) {
      rawLocale = saved;
      if (saved === 'system') {
        currentLocale = resolveSystemLocale();
      } else if (translations[saved]) {
        currentLocale = saved;
      } else {
        currentLocale = resolveSystemLocale();
      }
    } else {
      rawLocale = 'system';
      currentLocale = resolveSystemLocale();
    }
  } catch (e) {
    rawLocale = 'system';
    currentLocale = resolveSystemLocale();
  }
};

const resolveSystemLocale = () => {
  const locales = getLocales();
  const tag = (locales[0]?.languageTag || '').toLowerCase();
  if (tag.startsWith('zh')) return 'zh-CN';
  return 'en';
};

export const t = (key, params) => {
  const dict = translations[currentLocale] || translations['zh-CN'];
  let text = dict[key] || key;
  if (params) {
    Object.keys(params).forEach(k => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
    });
  }
  return text;
};

export const getModelDisplayName = (modelId) => {
  const key = `model.${modelId}`;
  return t(key);
};
