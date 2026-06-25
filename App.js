// mianmian - 多模型AI搜索对比应用
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import TabNavigator from './src/navigation/TabNavigator';
import { cleanOldConversations, migrateAllConversations, migrateFromAiall } from './src/services/storage';

let StatusBar;
if (Platform.OS !== 'web') {
  try {
    StatusBar = require('react-native').StatusBar;
  } catch (e) {}
}

const AppContent = () => {
  const { colors, isDark } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      {StatusBar && (
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
          translucent={false}
        />
      )}
      <TabNavigator />
    </NavigationContainer>
  );
};

export default function App() {
  useEffect(() => {
    migrateFromAiall().then(() => {
      cleanOldConversations();
      migrateAllConversations();
    });
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
