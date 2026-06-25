// 模型管理页面 - 简洁卡片 + 启动自动测试 + token统计
import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Switch, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Linking, RefreshControl, Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, BORDER_RADIUS, SPACING, SHADOWS } from '../theme';
import { getAccounts, saveAccounts, getSettings, saveSettings, getConversations } from '../services/storage';
import { testModelConnection } from '../services/aiService';
import { useTheme } from '../theme/ThemeContext';
import { t, getModelDisplayName } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 数字格式化：超过1万显示万，超过1亿显示亿，保留2位小数
const formatNumber = (num) => {
  if (num >= 100000000) return (num / 100000000).toFixed(2) + t('format.yi');
  if (num >= 10000) return (num / 10000).toFixed(2) + t('format.wan');
  return num.toLocaleString();
};

const PRESET_MODELS = [
  { id: 'openai', name: 'OpenAI', apiEndpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o', color: '#10A37F', format: 'openai', docUrl: 'https://platform.openai.com/api-keys', webSearch: true },
  { id: 'claude', name: 'Claude', apiEndpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-20250514', color: '#D97706', format: 'claude', docUrl: 'https://console.anthropic.com/settings/keys', webSearch: true },
  { id: 'gemini', name: 'Gemini', apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', model: 'gemini-2.0-flash', color: '#0066FF', format: 'gemini', docUrl: 'https://aistudio.google.com/apikey', webSearch: true },
  { id: 'deepseek', name: 'DeepSeek', apiEndpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat', color: '#6366F1', format: 'openai', docUrl: 'https://platform.deepseek.com/api_keys', webSearch: true },
  { id: 'moonshot', name: 'Kimi (月之暗面)', apiEndpoint: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k', color: '#AF52DE', format: 'openai', docUrl: 'https://platform.moonshot.cn/console/api-keys', webSearch: true },
  { id: 'mimo', name: 'MiMo', apiEndpoint: 'https://api.xiaomimimo.com/v1/chat/completions', model: 'mimo-v2.5', color: '#FF3B30', format: 'openai', docUrl: 'https://mimo.mi.com/docs/zh-CN/api/chat/openai-api', webSearch: true },
  { id: 'qwen', name: '通义千问', apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-turbo', color: '#FF9500', format: 'openai', docUrl: 'https://help.aliyun.com/zh/model-studio/developer-reference/get-api-key', webSearch: true },
  { id: 'doubao', name: '豆包 (火山引擎)', apiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'ep-20250101000000-xxxxx', color: '#5856D6', format: 'openai', docUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey', webSearch: true },
  { id: 'ernie', name: '文心', apiEndpoint: 'https://qianfan.baidubce.com/v2/chat/completions', model: 'ernie-4.5-turbo-128k', color: '#2932E1', format: 'openai', docUrl: 'https://console.bce.baidu.com/qianfan/ais/console/apiKey', webSearch: true },
  { id: 'zhipu', name: '智谱GLM', apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4.7-flash', color: '#6B4CFF', format: 'openai', docUrl: 'https://bigmodel.cn/usercenter/proj-mgmt/apikeys', webSearch: true },
  { id: 'hunyuan', name: '腾讯混元', apiEndpoint: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions', model: 'hunyuan-turbos-latest', color: '#006EFF', format: 'openai', docUrl: 'https://console.cloud.tencent.com/hunyuan/start', webSearch: true },
  { id: 'baichuan', name: '百川', apiEndpoint: 'https://api.baichuan-ai.com/v1/chat/completions', model: 'Baichuan4', color: '#FF6B35', format: 'openai', docUrl: 'https://platform.baichuan-ai.com/console/apikey', webSearch: true },
  { id: 'grok', name: 'Grok', apiEndpoint: 'https://api.x.ai/v1/chat/completions', model: 'grok-3', color: '#1DA1F2', format: 'openai', docUrl: 'https://console.x.ai/team/default/api-keys', webSearch: true },
  { id: 'yi', name: '零一万物', apiEndpoint: 'https://api.lingyiwanwu.com/v1/chat/completions', model: 'yi-large', color: '#00B4D8', format: 'openai', docUrl: 'https://platform.lingyiwanwu.com/apikey', webSearch: true },
  { id: 'spark', name: '讯飞星火', apiEndpoint: 'https://spark-api-open.xf-yun.com/v1/chat/completions', model: '4.0Ultra', color: '#FF4500', format: 'openai', docUrl: 'https://console.xfyun.cn/services/bm4', webSearch: true },
  { id: 'minimax', name: 'MiniMax', apiEndpoint: 'https://api.minimaxi.com/v1/chat/completions', model: 'MiniMax-M3', color: '#7C3AED', format: 'openai', docUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key', webSearch: true },
  { id: 'stepfun', name: '阶跃星辰', apiEndpoint: 'https://api.stepfun.com/v1/chat/completions', model: 'step-3.5-flash', color: '#00C9A7', format: 'openai', docUrl: 'https://platform.stepfun.com/interface-key', webSearch: true },
];

const AccountScreen = forwardRef((props, ref) => {
  const { isDark, themeMode, setThemeMode, locale, rawLocale, setLocale, colors, modelTestStatus, setModelTestStatus, triggerNewsRefresh } = useTheme();
  const [accounts, setAccounts] = useState([]);
  const [editingModel, setEditingModel] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isNewCustom, setIsNewCustom] = useState(false);
  const [editForm, setEditForm] = useState({ apiKey: '', model: '', apiEndpoint: '' });
  const [testResults, setTestResults] = useState({});
  const [tokenUsage, setTokenUsage] = useState({});
  const [totalRounds, setTotalRounds] = useState(0);
  const [tokenModalVisible, setTokenModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const testResultsRef = useRef({});
  const scrollRef = useRef(null);
  const localeAtOpenRef = useRef(null);

  const closeSettings = useCallback(() => {
    setSettingsModalVisible(false);
    if (localeAtOpenRef.current !== null && localeAtOpenRef.current !== rawLocale) {
      triggerNewsRefresh();
    }
    localeAtOpenRef.current = null;
  }, [rawLocale, triggerNewsRefresh]);

  useImperativeHandle(ref, () => ({
    scrollToTop: () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
  }));

  // 拖拽排序状态
  const [dragIdx, setDragIdx] = useState(-1);
  const [dragTo, setDragTo] = useState(-1);
  const [dragY, setDragY] = useState(0);
  const dragRef = useRef(null);
  const CARD_H = 120;
  const CARD_GAP = 10;
  const STEP = CARD_H + CARD_GAP;

  // 启动时静默测试所有模型连接（无UI提示，1小时内不重复测试）
  useEffect(() => {
    const LAST_TEST_KEY = '@mianmian_last_auto_test';
    AsyncStorage.getItem(LAST_TEST_KEY).then(lastTest => {
      const now = Date.now();
      if (lastTest && (now - parseInt(lastTest, 10)) < 3600000) return;
      return getAccounts();
    }).then(accs => {
      if (!accs) return;
      const configured = accs.filter(a => a.apiKey);
      if (configured.length === 0) return;
      AsyncStorage.setItem(LAST_TEST_KEY, String(Date.now())).catch(() => {});
      configured.forEach(m => {
        testResultsRef.current = { ...testResultsRef.current, [m.id]: { testing: true, message: t('account.testingShort') } };
      });
      configured.forEach(async (model) => {
        try {
          const r = await testModelConnection(model);
          const tokens = r.tokenUsage || {};
          const tokenCount = (tokens.input || 0) + (tokens.output || 0);
          testResultsRef.current = { ...testResultsRef.current, [model.id]: {
            success: r.success, message: r.success ? t('account.connectOk') : (r.message || t('account.connectFail')),
            responseTime: r.responseTime, tokenCount,
          }};
          setTestResults({ ...testResultsRef.current });
          setModelTestStatus(prev => ({ ...prev, [model.id]: r.success ? 'success' : 'fail' }));
          if (r.success && tokenCount > 0) {
            const s = await getSettings();
            if (!s.tokenUsage) s.tokenUsage = {};
            if (!s.tokenUsage[model.id]) s.tokenUsage[model.id] = { input: 0, output: 0, count: 0, totalTime: 0 };
            s.tokenUsage[model.id].input += (tokens.input || 0);
            s.tokenUsage[model.id].output += (tokens.output || 0);
            s.tokenUsage[model.id].count += 1;
            s.tokenUsage[model.id].totalTime += r.responseTime || 0;
            await saveSettings(s);
          }
        } catch (e) {
          testResultsRef.current = { ...testResultsRef.current, [model.id]: { success: false, message: e.message } };
          setTestResults({ ...testResultsRef.current });
          setModelTestStatus(prev => ({ ...prev, [model.id]: 'fail' }));
        }
      });
    }).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => {
    getAccounts().then(setAccounts);
    getSettings().then(s => {
      const u = s.tokenUsage || {};
      setTokenUsage(u);
    }).catch(() => {});
    getConversations().then(convs => {
      let rounds = 0;
      for (const conv of convs) {
        const msgs = conv.messages || [];
        for (let i = 0; i < msgs.length; i++) {
          if (msgs[i].role === 'user') {
            const hasNextAssistant = msgs.slice(i + 1).some(m => m.role === 'assistant');
            rounds += hasNextAssistant ? 1 : 0.5;
          }
        }
      }
      setTotalRounds(rounds);
    }).catch(() => {});
  }, []));

  const handleRefresh = async () => {
    Vibration.vibrate(50);
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 100);
    const accs = await getAccounts();
    const configured = accs.filter(a => a.apiKey);
    try {
      if (configured.length > 0) {
        configured.forEach(m => {
          testResultsRef.current = { ...testResultsRef.current, [m.id]: { testing: true, message: t('account.testingShort') } };
        });
        setTestResults({ ...testResultsRef.current });
        const testPromises = configured.map(async (model) => {
          try {
            const r = await testModelConnection(model);
            const tokens = r.tokenUsage || {};
            const tokenCount = (tokens.input || 0) + (tokens.output || 0);
            testResultsRef.current = { ...testResultsRef.current, [model.id]: {
              success: r.success, message: r.success ? t('account.connectOk') : (r.message || t('account.connectFail')),
              responseTime: r.responseTime, tokenCount,
            }};
            setTestResults({ ...testResultsRef.current });
            setModelTestStatus(prev => ({ ...prev, [model.id]: r.success ? 'success' : 'fail' }));
            if (r.success && tokenCount > 0) {
              const s = await getSettings();
              if (!s.tokenUsage) s.tokenUsage = {};
              if (!s.tokenUsage[model.id]) s.tokenUsage[model.id] = { input: 0, output: 0, count: 0, totalTime: 0 };
              s.tokenUsage[model.id].input += (tokens.input || 0);
              s.tokenUsage[model.id].output += (tokens.output || 0);
              s.tokenUsage[model.id].count += 1;
              s.tokenUsage[model.id].totalTime += r.responseTime || 0;
              await saveSettings(s);
            }
          } catch (e) {
            testResultsRef.current = { ...testResultsRef.current, [model.id]: { success: false, message: e.message } };
            setTestResults({ ...testResultsRef.current });
            setModelTestStatus(prev => ({ ...prev, [model.id]: 'fail' }));
          }
        });
        await Promise.all(testPromises);
        Vibration.vibrate(50);
        const s = await getSettings();
        setTokenUsage(s.tokenUsage || {});
      }
    } catch (e) {}
    finally { setRefreshing(false); }
  };

  const persist = async (updated) => {
    setAccounts(updated);
    await saveAccounts(updated);
  };

  const handleToggle = async (id) => { await persist(accounts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a)); };
  const handleEdit = (model) => { setEditingModel(model); setIsNewCustom(false); setEditForm({ apiKey: model.apiKey || '', model: model.model || '', apiEndpoint: model.apiEndpoint || '' }); setModalVisible(true); };

  const handleTest = async (model) => {
    testResultsRef.current = { ...testResultsRef.current, [model.id]: { testing: true, message: t('account.testConnecting') } };
    setTestResults({ ...testResultsRef.current });
    try {
      const r = await testModelConnection(model);
      const tokens = r.tokenUsage || {};
      const tokenCount = (tokens.input || 0) + (tokens.output || 0);
      testResultsRef.current = { ...testResultsRef.current, [model.id]: {
        success: r.success, message: r.success ? t('account.connectOk') : (r.message || t('account.connectFail')),
        responseTime: r.responseTime, tokenCount,
      }};
      setTestResults({ ...testResultsRef.current });
      if (r.success && tokenCount > 0) {
        const s = await getSettings();
        if (!s.tokenUsage) s.tokenUsage = {};
        if (!s.tokenUsage[model.id]) s.tokenUsage[model.id] = { input: 0, output: 0, count: 0, totalTime: 0 };
        s.tokenUsage[model.id].input += (tokens.input || 0);
        s.tokenUsage[model.id].output += (tokens.output || 0);
        s.tokenUsage[model.id].count += 1;
        s.tokenUsage[model.id].totalTime += r.responseTime || 0;
        await saveSettings(s);
        setTokenUsage({ ...s.tokenUsage });
      }
    } catch (e) {
      testResultsRef.current = { ...testResultsRef.current, [model.id]: { success: false, message: e.message } };
      setTestResults({ ...testResultsRef.current });
    }
  };

  const handleSave = async () => {
    if (!editingModel) return;
    const isNew = !accounts.find(a => a.id === editingModel.id);
    const existingModel = accounts.find(a => a.id === editingModel.id);
    const wasConfigured = existingModel && !!existingModel.apiKey;
    const savedModel = { ...editingModel, apiKey: editForm.apiKey, model: editForm.model, apiEndpoint: editForm.apiEndpoint };

    if (isNew || !wasConfigured) {
      const others = accounts.filter(a => a.id !== editingModel.id);
      await persist([savedModel, ...others]);
    } else {
      const updated = accounts.map(a => a.id === editingModel.id ? savedModel : a);
      await persist(updated);
    }
    setModalVisible(false); setEditingModel(null);

    if (editForm.apiKey) {
      handleTest(savedModel);
    }
  };

  const handleAddCustomModel = () => {
    setEditingModel({ id: `_new_${Date.now()}`, name: t('account.addCustom'), apiEndpoint: 'https://api.example.com/v1/chat/completions', apiKey: '', model: '', enabled: true, color: '#6B7280', format: 'openai' });
    setIsNewCustom(true);
    setEditForm({ apiKey: '', model: '', apiEndpoint: 'https://api.example.com/v1/chat/completions' });
    setModalVisible(true);
  };

  const handleSaveCustom = async () => {
    if (!editForm.apiKey || !editForm.model) { Alert.alert(t('common.error'), t('account.fillHint')); return; }
    const cm = { id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: editForm.model || t('account.addCustom'), apiKey: editForm.apiKey, model: editForm.model, apiEndpoint: editForm.apiEndpoint, enabled: true, color: '#6B7280', format: 'openai', webSearch: false };
    await persist([cm, ...accounts]);
    setModalVisible(false); setEditingModel(null); setIsNewCustom(false);
    handleTest(cm);
  };

  const handleLongPress = (model) => {
    Alert.alert(t('account.deleteModel'), t('account.deleteConfirm', { name: model.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { await persist(accounts.filter(a => a.id !== model.id)); }},
    ]);
  };

  const addPreset = async (preset) => {
    if (accounts.find(a => a.id === preset.id)) { Alert.alert(t('common.error'), t('account.existsHint', { name: preset.name })); return; }
    const newModel = { ...preset, apiKey: '', enabled: true };
    await persist([newModel, ...accounts]);
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
    handleEdit(newModel);
  };

  // 拖拽排序
  const handleTouchStart = useCallback((index, pageY) => {
    dragRef.current = { from: index, to: index, startY: pageY };
    setDragIdx(index); setDragTo(index); setDragY(0);
  }, []);

  const handleTouchMove = useCallback((pageY) => {
    const dr = dragRef.current;
    if (!dr) return;
    const delta = pageY - dr.startY;
    dr.to = Math.max(0, Math.min(accounts.length - 1, dr.from + Math.round(delta / STEP)));
    setDragTo(dr.to); setDragY(delta);
  }, [accounts.length]);

  const handleTouchEnd = useCallback(async () => {
    const dr = dragRef.current;
    if (dr && dr.from !== dr.to) {
      const updated = [...accounts];
      const [m] = updated.splice(dr.from, 1);
      updated.splice(dr.to, 0, m);
      await persist(updated);
    }
    dragRef.current = null;
    setDragIdx(-1); setDragTo(-1); setDragY(0);
  }, [accounts]);

  const configuredCount = accounts.filter(a => a.apiKey).length;
  const enabledCount = accounts.filter(a => a.enabled && a.apiKey).length;
  const totalTokens = Object.values(tokenUsage).reduce((a, b) => a + (b.input + b.output || 0), 0);

  const themeOptions = [
    { key: 'light', label: t('account.theme.light'), icon: 'sunny' },
    { key: 'dark', label: t('account.theme.dark'), icon: 'moon' },
    { key: 'system', label: t('account.theme.auto'), icon: 'text', text: 'A' },
  ];

  const langOptions = [
    { key: 'zh-CN', label: t('account.lang.zh') },
    { key: 'en', label: t('account.lang.en') },
    { key: 'system', label: t('account.lang.system') },
  ];

  const getModelStats = (modelId) => {
    const u = tokenUsage[modelId];
    if (!u || u.count === 0) return null;
    const total = u.input + u.output;
    const avgTime = Math.round(u.totalTime / u.count);
    return { total, avgTime, count: u.count };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}
      onTouchMove={dragIdx >= 0 ? (e) => handleTouchMove(e.nativeEvent.pageY) : undefined}
      onTouchEnd={dragIdx >= 0 ? handleTouchEnd : undefined}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('account.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => { localeAtOpenRef.current = rawLocale; setSettingsModalVisible(true); }}>
            <Ionicons name="settings-outline" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 固定统计区域 */}
      <View style={[styles.statsCard, { backgroundColor: colors.surface, marginHorizontal: SPACING.lg, marginTop: SPACING.sm }]}>
        <View style={styles.statItem}>
          <TouchableOpacity onPress={() => setTokenModalVisible(true)}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{formatNumber(totalTokens)}</Text>
          </TouchableOpacity>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('account.tokenStats')}</Text>
        </View>
        <Text style={[styles.statDivider, { color: colors.divider }]}>|</Text>
        <View style={styles.statItem}><Text style={[styles.statNumber, { color: colors.text }]}>{formatNumber(totalRounds)}</Text><Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('account.rounds')}</Text></View>
        <Text style={[styles.statDivider, { color: colors.divider }]}>|</Text>
        <View style={styles.statItem}><Text style={[styles.statNumber, { color: colors.text }]}>{configuredCount}</Text><Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('account.configured')}</Text></View>
        <Text style={[styles.statDivider, { color: colors.divider }]}>|</Text>
        <View style={styles.statItem}><Text style={[styles.statNumber, { color: colors.success }]}>{enabledCount}</Text><Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('account.enabled')}</Text></View>
      </View>

      {/* 可滑动模型列表 */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false} scrollEnabled={dragIdx < 0}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={isDark ? '#888888' : '#666666'} colors={[isDark ? '#FFFFFF' : '#000000']} progressBackgroundColor={isDark ? '#1A1A1A' : '#F0F0F0'} />}>

        {accounts.map((model, index) => {
          const tr = testResults[model.id];
          const isTesting = tr?.testing;
          const stats = getModelStats(model.id);
          const isDragged = dragIdx === index;
          const shiftUp = dragIdx >= 0 && !isDragged && index > dragIdx && index <= dragTo;
          const shiftDown = dragIdx >= 0 && !isDragged && index >= dragTo && index < dragIdx;
          const isConfigured = !!model.apiKey;

          return (
            <TouchableOpacity
              key={model.id}
              style={[styles.modelCard, {
                backgroundColor: isConfigured ? colors.surface : colors.surfaceSecondary,
                borderColor: isDragged ? colors.primary : (isConfigured ? model.color + '40' : colors.borderLight),
                borderWidth: isConfigured ? 1.5 : 1,
                borderStyle: isConfigured ? 'solid' : 'dashed',
                opacity: isConfigured ? 1 : 0.7,
              },
                isDragged && { transform: [{ translateY: dragY }], zIndex: 999, elevation: 10, shadowOpacity: 0.3, shadowRadius: 12 },
                shiftUp && { transform: [{ translateY: -STEP }] },
                shiftDown && { transform: [{ translateY: STEP }] },
              ]}
              onLongPress={() => handleLongPress(model)}
              activeOpacity={0.9}
              delayLongPress={500}
            >
              {/* 顶部：拖拽手柄 + 颜色点 + 名称 + 开关 */}
              <View style={styles.cardTop}>
                <View style={styles.cardNameRow}>
                  <View style={styles.dragHandle}
                    onTouchStart={(e) => { e.stopPropagation?.(); handleTouchStart(index, e.nativeEvent.pageY); }}>
                    <Ionicons name="reorder-three" size={18} color={isDragged ? colors.primary : colors.textTertiary} />
                  </View>
                  <View style={[styles.colorDot, { backgroundColor: model.color }]} />
                  <Text style={[styles.modelName, { color: colors.text }]} numberOfLines={1}>{getModelDisplayName(model.id) || model.name}</Text>
                  {!isConfigured && (
                    <View style={[styles.unconfiguredBadge, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}>
                      <Text style={{ fontSize: 9, color: colors.textTertiary }}>{t('account.notConfigured')}</Text>
                    </View>
                  )}
                </View>
                <Switch value={model.enabled && isConfigured} onValueChange={() => handleToggle(model.id)}
                  trackColor={{ false: colors.border, true: model.color + '50' }}
                  thumbColor={model.enabled && isConfigured ? model.color : colors.textTertiary}
                  disabled={!isConfigured}
                  style={{ transform: [{ scale: 0.8 }] }} />
              </View>

              {/* 模型名 */}
              <View style={styles.cardSubRow}>
                <Text style={[styles.modelSub, { color: colors.textTertiary }]} numberOfLines={1}>
                  {model.apiKey ? model.model : t('account.noApiKey')}
                </Text>
              </View>

              {/* 测试状态 */}
              {tr && (
                <View style={[styles.testRow, { backgroundColor: isTesting ? colors.surfaceSecondary : (tr.success ? 'rgba(52,199,89,0.06)' : 'rgba(255,59,48,0.06)') }]}>
                  {isTesting ? (
                    <ActivityIndicator size="small" color={model.color} />
                  ) : (
                    <Ionicons name={tr.success ? 'checkmark-circle' : 'close-circle'} size={13} color={tr.success ? colors.success : colors.error} />
                  )}
                  <Text style={{ fontSize: FONTS.xs, color: isTesting ? colors.textSecondary : (tr.success ? colors.success : colors.error), flex: 1 }} numberOfLines={1}>
                    {tr.message}
                  </Text>
                  {!isTesting && tr.responseTime > 0 && <Text style={{ fontSize: FONTS.xs, color: colors.textTertiary }}>{tr.responseTime}ms</Text>}
                </View>
              )}

              {/* 累计统计 */}
              {stats && (
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Ionicons name="flash" size={10} color={colors.textTertiary} />
                    <Text style={[styles.statChipText, { color: colors.textTertiary }]}>{stats.total} tokens</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="time-outline" size={10} color={colors.textTertiary} />
                    <Text style={[styles.statChipText, { color: colors.textTertiary }]}>{stats.avgTime}ms {t('account.avgTime')}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="chatbubble-outline" size={10} color={colors.textTertiary} />
                    <Text style={[styles.statChipText, { color: colors.textTertiary }]}>{stats.count}{t('common.unit.times')}</Text>
                  </View>
                </View>
              )}

              {/* 底部操作 */}
              <View style={styles.cardActions}>
                {model.apiKey && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => handleTest(model)} disabled={isTesting}>
                    <Ionicons name="flash" size={12} color={model.color} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>{isTesting ? t('account.testing') : t('account.test')}</Text>
                  </TouchableOpacity>
                )}
                {(() => { const p = PRESET_MODELS.find(p => p.id === model.id); return p?.docUrl ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => Linking.openURL(p.docUrl)}>
                    <Ionicons name="document-text-outline" size={12} color={colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>{t('account.doc')}</Text>
                  </TouchableOpacity>
                ) : null; })()}
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => handleEdit(model)}>
                  <Ionicons name="pencil" size={12} color={colors.textSecondary} />
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>{t('account.config')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        {PRESET_MODELS.filter(p => !accounts.find(a => a.id === p.id)).map(preset => (
          <TouchableOpacity key={preset.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, marginBottom: SPACING.sm, borderColor: colors.border }]}
            onPress={() => addPreset(preset)} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={18} color={preset.color} />
            <Text style={[{ fontSize: FONTS.sm, color: colors.textSecondary }]}>{t('account.addModel', { name: getModelDisplayName(preset.id) || preset.name })}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderStyle: 'dashed', marginBottom: SPACING.xl, borderColor: colors.border }]}
          onPress={handleAddCustomModel} activeOpacity={0.7}>
          <Ionicons name="code-slash-outline" size={18} color={colors.primary} />
          <Text style={[{ fontSize: FONTS.sm, color: colors.primary }]}>{t('account.addCustom')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 40, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={[{ fontSize: FONTS.md, color: colors.textSecondary }]}>{t('common.cancel')}</Text></TouchableOpacity>
            <Text style={[{ fontSize: FONTS.lg, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' }]}>{isNewCustom ? t('account.addModelTitle') : t('account.configTitle')}</Text>
            <TouchableOpacity onPress={isNewCustom ? handleSaveCustom : handleSave}><Text style={[{ fontSize: FONTS.md, fontWeight: '600', color: colors.primary }]}>{t('common.save')}</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl }}>
            <View style={{ marginBottom: SPACING.xl }}>
              <Text style={[{ fontSize: FONTS.md, fontWeight: '600', color: colors.text, marginBottom: SPACING.sm }]}>{t('account.modelDisplayName')}</Text>
              <TextInput style={[{ borderRadius: BORDER_RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, fontSize: FONTS.md, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={editingModel?.name || ''} onChangeText={t => setEditingModel(p => ({ ...p, name: t }))}
                placeholder={t('account.modelDisplayName')} placeholderTextColor={colors.textTertiary} />
            </View>
            <View style={{ marginBottom: SPACING.xl }}>
              <Text style={[{ fontSize: FONTS.md, fontWeight: '600', color: colors.text, marginBottom: SPACING.sm }]}>API 地址</Text>
              <TextInput style={[{ borderRadius: BORDER_RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, fontSize: FONTS.md, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={editForm.apiEndpoint} onChangeText={t => setEditForm(p => ({ ...p, apiEndpoint: t }))}
                placeholder="https://api.example.com/v1/chat/completions" placeholderTextColor={colors.textTertiary} autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={{ marginBottom: SPACING.xl }}>
              <Text style={[{ fontSize: FONTS.md, fontWeight: '600', color: colors.text, marginBottom: SPACING.sm }]}>API Key *</Text>
              <TextInput style={[{ borderRadius: BORDER_RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, fontSize: FONTS.md, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={editForm.apiKey} onChangeText={t => setEditForm(p => ({ ...p, apiKey: t }))}
                placeholder={t('account.enterApiKey')} placeholderTextColor={colors.textTertiary} secureTextEntry autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={{ marginBottom: SPACING.xl }}>
              <Text style={[{ fontSize: FONTS.md, fontWeight: '600', color: colors.text, marginBottom: SPACING.sm }]}>{t('account.modelNameApi')}</Text>
              <TextInput style={[{ borderRadius: BORDER_RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, fontSize: FONTS.md, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={editForm.model} onChangeText={t => setEditForm(p => ({ ...p, model: t }))}
                placeholder={t('account.modelNamePlaceholder')} placeholderTextColor={colors.textTertiary} autoCapitalize="none" autoCorrect={false} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Token统计弹窗 */}
      <Modal visible={tokenModalVisible} transparent animationType="fade" onRequestClose={() => setTokenModalVisible(false)}>
        <View style={{ flex: 1 }}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)' }]} />
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTokenModalVisible(false)}>
            <View style={[styles.tokenModal, { backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)' }, SHADOWS.modalCard]}>
            <Text style={[styles.tokenModalTitle, { color: colors.text }]}>{t('account.tokenDetail')}</Text>
            <ScrollView style={styles.tokenModalScroll}>
              {Object.entries(tokenUsage).length === 0 ? (
                <Text style={[styles.tokenModalEmpty, { color: colors.textTertiary }]}>{t('account.tokenEmpty')}</Text>
              ) : (
                Object.entries(tokenUsage).map(([modelId, data]) => {
                  const account = accounts.find(a => a.id === modelId);
                  const name = getModelDisplayName(modelId) || account?.name || modelId;
                  const color = account?.color || colors.textTertiary;
                  return (
                    <View key={modelId} style={[styles.tokenModelRow, { borderBottomColor: colors.borderLight }]}>
                      <View style={styles.tokenModelHeader}>
                        <View style={[styles.colorDot, { backgroundColor: color }]} />
                        <Text style={[styles.tokenModelName, { color: colors.text }]}>{name}</Text>
                        <Text style={[styles.tokenModelCount, { color: colors.textTertiary }]}>{data.count}{t('common.unit.times')}</Text>
                      </View>
                      <View style={styles.tokenDetailRow}>
                        <Text style={[styles.tokenDetail, { color: colors.textSecondary }]}>{t('account.tokenInput')}{formatNumber(data.input)}</Text>
                        <Text style={[styles.tokenDetail, { color: colors.textSecondary }]}>{t('account.tokenOutput')}{formatNumber(data.output)}</Text>
                        <Text style={[styles.tokenDetail, { color: colors.textSecondary }]}>{t('account.tokenTotal')}{formatNumber(data.input + data.output)}</Text>
                      </View>
                      {data.totalTime > 0 && data.count > 0 && (
                        <Text style={[styles.tokenAvgTime, { color: colors.textTertiary }]}>{t('account.tokenAvgTime')}{Math.round(data.totalTime / data.count)}ms</Text>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
            <Text style={[styles.tokenModalDisclaimer, { color: colors.textTertiary }]}>{t('account.tokenDisclaimer')}</Text>
            <TouchableOpacity style={[styles.tokenModalClose, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setTokenModalVisible(false)}>
              <Text style={[styles.tokenModalCloseText, { color: colors.text }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 设置弹窗 */}
      <Modal visible={settingsModalVisible} transparent animationType="fade" onRequestClose={closeSettings}>
        <View style={{ flex: 1 }}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)' }]} />
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeSettings}>
            <View style={[styles.tokenModal, { backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)' }, SHADOWS.modalCard]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.tokenModalTitle, { color: colors.text }]}>{t('account.settings')}</Text>
            
            <Text style={{ fontSize: FONTS.sm, fontWeight: '600', color: colors.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.sm }}>{t('account.settings.themeLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md }}>
              {themeOptions.map(opt => {
                const selected = themeMode === opt.key;
                return (
                  <TouchableOpacity key={opt.key}
                    style={{ flex: 1, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, alignItems: 'center', backgroundColor: selected ? colors.surfaceSecondary : 'transparent', borderWidth: 1.5, borderColor: selected ? (isDark ? colors.textTertiary : colors.text) : 'transparent' }}
                    onPress={() => setThemeMode(opt.key)}>
                    {opt.text ? (
                      <Text style={{ fontSize: 14, fontWeight: selected ? '700' : '400', color: selected ? colors.text : colors.textSecondary }}>{opt.text}</Text>
                    ) : (
                      <Ionicons name={opt.icon} size={16} color={selected ? colors.text : colors.textSecondary} />
                    )}
                    <Text style={{ fontSize: FONTS.sm, fontWeight: selected ? '600' : '400', color: selected ? colors.text : colors.textSecondary, marginTop: 2 }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: FONTS.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: SPACING.sm }}>{t('account.settings.langLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md }}>
              {langOptions.map(opt => {
                const selected = rawLocale === opt.key;
                return (
                  <TouchableOpacity key={opt.key}
                    style={{ flex: 1, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, alignItems: 'center', backgroundColor: selected ? colors.surfaceSecondary : 'transparent', borderWidth: 1.5, borderColor: selected ? (isDark ? colors.textTertiary : colors.text) : 'transparent' }}
                    onPress={() => setLocale(opt.key)}>
                    <Text style={{ fontSize: FONTS.sm, fontWeight: selected ? '600' : '400', color: selected ? colors.text : colors.textSecondary }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight }} onPress={() => Linking.openURL('https://github.com/Chlgh/mianmian')}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,128,0.1)' }}><Text style={{ fontSize: 18 }}>📖</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONTS.md, fontWeight: '600', color: colors.primary }}>{t('guide.openSource')}</Text>
                <Text style={{ fontSize: FONTS.sm, marginTop: 2, color: colors.textSecondary }}>{t('guide.openSourceDesc')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.tokenModalClose, { backgroundColor: colors.surfaceSecondary }]} onPress={closeSettings}>
              <Text style={[styles.tokenModalCloseText, { color: colors.text }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 40, paddingBottom: SPACING.md },
  headerTitle: { fontSize: FONTS.xxl, fontWeight: '700', flex: 1 },
  headerRight: { flexDirection: 'row', gap: SPACING.xs },
  themeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl },
  statsCard: { flexDirection: 'row', alignItems: 'center', borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.sm },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: FONTS.xl, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: FONTS.xs },
  statDivider: { fontSize: FONTS.xl },
  sectionHint: { fontSize: FONTS.xs, textAlign: 'center', marginBottom: SPACING.lg },
  modelCard: { borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, marginBottom: SPACING.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  dragHandle: { padding: SPACING.xs, paddingRight: 0 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  modelName: { fontSize: FONTS.md, fontWeight: '600', flex: 1 },
  unconfiguredBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xs },
  modelSub: { fontSize: FONTS.xs, flex: 1 },
  webSearchTag: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.xs, padding: SPACING.sm, borderRadius: BORDER_RADIUS.sm },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statChipText: { fontSize: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.xs, paddingTop: SPACING.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#00000010' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm },
  actionText: { fontSize: 10, fontWeight: '500' },
  modalContainer: { flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tokenModal: { width: '85%', maxHeight: '70%', borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg },
  tokenModalTitle: { fontSize: FONTS.lg, fontWeight: '700', marginBottom: SPACING.md, textAlign: 'center' },
  tokenModalScroll: { maxHeight: 350 },
  tokenModalEmpty: { textAlign: 'center', paddingVertical: SPACING.xl },
  tokenModelRow: { paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  tokenModelHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tokenModelName: { fontSize: FONTS.sm, fontWeight: '600', flex: 1 },
  tokenModelCount: { fontSize: FONTS.xs },
  tokenDetailRow: { flexDirection: 'row', gap: SPACING.md, marginTop: 4 },
  tokenDetail: { fontSize: FONTS.xs },
  tokenAvgTime: { fontSize: FONTS.xs, marginTop: 2 },
  tokenModalDisclaimer: { fontSize: 10, textAlign: 'center', marginTop: SPACING.md, fontStyle: 'italic' },
  tokenModalClose: { marginTop: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, alignItems: 'center' },
  tokenModalCloseText: { fontSize: FONTS.sm, fontWeight: '600' },
});

export default AccountScreen;
