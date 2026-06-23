// 底部导航栏 - 滑动切换 + 毛玻璃透明效果
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Platform, Animated, PanResponder, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AccountScreen from '../screens/AccountScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';

const Stack = createNativeStackNavigator();

const TAB_ITEMS = [
  { key: 'Home', focusedIcon: 'chatbubble', unfocusedIcon: 'chatbubble-outline', label: '提问' },
  { key: 'History', focusedIcon: 'time', unfocusedIcon: 'time-outline', label: '历史' },
  { key: 'Account', focusedIcon: 'settings', unfocusedIcon: 'settings-outline', label: '模型' },
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

  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  const goTo = useCallback((idx) => {
    activeIdxRef.current = idx;
    setActiveIdx(idx);
    Animated.timing(translateX, {
      toValue: -idx * SCREEN_W,
      duration: 200,
      useNativeDriver: true,
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
      return Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
    },
    onPanResponderMove: (_, g) => {
      const idx = activeIdxRef.current;
      translateX.setValue(Math.max(-(TAB_ITEMS.length - 1) * SCREEN_W, Math.min(0, -idx * SCREEN_W + g.dx)));
    },
    onPanResponderRelease: (_, g) => {
      const idx = activeIdxRef.current;
      const t = SCREEN_W * 0.2;
      if (g.dx < -t && idx < TAB_ITEMS.length - 1) { goToRef.current(idx + 1); }
      else if (g.dx > t && idx > 0) { goToRef.current(idx - 1); }
      else {
        Animated.timing(translateX, { toValue: -idx * SCREEN_W, duration: 150, useNativeDriver: true }).start();
      }
    },
  })).current;

  const tabH = isWeb ? 60 : Platform.OS === 'ios' ? 85 : 70;

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <View style={[st.content, { paddingBottom: tabH }]} {...pan.panHandlers}>
        <Animated.View style={[st.slider, { transform: [{ translateX }], width: SCREEN_W * TAB_ITEMS.length }]}>
          {SCREENS.map((Screen, i) => (
            <View key={TAB_ITEMS[i].key} style={{ width: SCREEN_W, flex: 1 }}>
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
          {TAB_ITEMS.map((tab, i) => {
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TabContent" component={TabContent} />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={{
          headerShown: true,
          headerTitle: '对话详情',
          headerTitleStyle: { fontSize: FONTS.lg, fontWeight: '600', color: colors.text },
          headerTintColor: colors.text,
          headerBackTitle: '返回',
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