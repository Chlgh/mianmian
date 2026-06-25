// 底部导航栏 - 滑动切换 + 毛玻璃透明效果
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Platform, Animated, PanResponder, useWindowDimensions, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { t } from '../i18n';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AccountScreen from '../screens/AccountScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';

const Stack = createNativeStackNavigator();

const getTabItems = () => [
  { key: 'Home', focusedIcon: 'chatbubble', unfocusedIcon: 'chatbubble-outline', label: t('nav.home') },
  { key: 'History', focusedIcon: 'time', unfocusedIcon: 'time-outline', label: t('nav.history') },
  { key: 'Account', focusedIcon: 'settings', unfocusedIcon: 'settings-outline', label: t('nav.account') },
];

const SCREENS = [HomeScreen, HistoryScreen, AccountScreen];
const isWeb = Platform.OS === 'web';

const TabContent = () => {
  const { colors, isDark } = useTheme();
  const { width: SCREEN_W } = useWindowDimensions();
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const goToRef = useRef(null);
  const lastTapRef = useRef([0, 0, 0]);
  const screenRefs = useRef([null, null, null]);
  const isDraggingRef = useRef(false);
  const pendingIdxRef = useRef(null);

  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  const goTo = useCallback((idx) => {
    if (idx === activeIdxRef.current) return;
    activeIdxRef.current = idx;
    pendingIdxRef.current = idx;
    InteractionManager.runAfterInteractions(() => {
      setActiveIdx(idx);
    });
    Animated.spring(translateX, {
      toValue: -idx * SCREEN_W,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [translateX, SCREEN_W]);

  goToRef.current = goTo;

  const handleTabTap = useCallback((i) => {
    const now = Date.now();
    if (now - lastTapRef.current[i] < 300) {
      screenRefs.current[i]?.scrollToTop?.();
    }
    lastTapRef.current[i] = now;
    goToRef.current(i);
  }, []);

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => {
      if (g.x0 < 20) return false;
      return Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
    },
    onPanResponderGrant: () => {
      isDraggingRef.current = true;
    },
    onPanResponderMove: (_, g) => {
      if (!isDraggingRef.current) return;
      const idx = activeIdxRef.current;
      const nextVal = -idx * SCREEN_W + g.dx;
      const clamped = Math.max(-(getTabItems().length - 1) * SCREEN_W, Math.min(0, nextVal));
      translateX.setValue(clamped);
    },
    onPanResponderRelease: (_, g) => {
      isDraggingRef.current = false;
      const idx = activeIdxRef.current;
      const t = SCREEN_W * 0.2;
      if (g.dx < -t && idx < getTabItems().length - 1) {
        goToRef.current(idx + 1);
      } else if (g.dx > t && idx > 0) {
        goToRef.current(idx - 1);
      } else {
        Animated.spring(translateX, {
          toValue: -idx * SCREEN_W,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      isDraggingRef.current = false;
      const idx = activeIdxRef.current;
      Animated.spring(translateX, {
        toValue: -idx * SCREEN_W,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    },
  })).current;

  const tabH = isWeb ? 60 : Platform.OS === 'ios' ? 85 : 70;

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <View style={[st.content, { paddingBottom: tabH }]} {...pan.panHandlers}>
        <Animated.View style={[st.slider, { transform: [{ translateX }], width: SCREEN_W * getTabItems().length }]}>
          {SCREENS.map((Screen, i) => (
            <View key={getTabItems()[i].key} style={{ width: SCREEN_W, flex: 1 }}>
              <Screen ref={el => { screenRefs.current[i] = el; }} />
            </View>
          ))}
        </Animated.View>
      </View>

      {/* 底部 Tab */}
      <View
        style={[
          st.tabBarOuter,
          isDark
            ? { backgroundColor: '#0E0E0E', borderTopColor: '#2A2A2A' }
            : { backgroundColor: '#FFFFFF', borderTopColor: '#E5E5E5' },
        ]}>
        <View style={st.tabBar}>
          {getTabItems().map((tab, i) => {
            const focused = activeIdx === i;
            return (
              <View key={tab.key} style={st.tabItem}>
                <View style={st.tabBtn} onTouchEnd={() => handleTabTap(i)}>
                  <Ionicons
                    name={focused ? tab.focusedIcon : tab.unfocusedIcon}
                    size={28}
                    color={focused ? colors.primary : colors.textTertiary}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const TabNavigator = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="TabContent" component={TabContent} />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={{
          headerShown: true,
          headerTitle: t('nav.detail'),
          headerTitleStyle: { fontSize: FONTS.lg, fontWeight: '600', color: colors.text },
          headerTintColor: colors.text,
          headerBackTitle: t('nav.back'),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, overflow: 'hidden' },
  slider: { flexDirection: 'row', flex: 1 },
  tabBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: isWeb ? 12 : Platform.OS === 'ios' ? 34 : 14,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 28,
  },
});

export default TabNavigator;