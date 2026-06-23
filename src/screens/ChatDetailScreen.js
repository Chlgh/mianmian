// 聊天详情页 - 与首页完全一致的对话形式
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Platform, Keyboard,
  Dimensions, Linking as RNLinking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, BORDER_RADIUS, SPACING, COLORS } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { saveConversation, getAccounts } from '../services/storage';
import { callMultipleAIModels, preSearchWeb } from '../services/aiService';
import MessageBubble from '../components/MessageBubble';
import LoadingDots from '../components/LoadingDots';
import MarkdownRenderer from '../components/MarkdownRenderer';

const SCREEN_W = Dimensions.get('window').width;

// 与首页相同的轮次组件
const RoundBlock = ({ roundResponses, roundIdx, isCurrentRound, colors, getColor }) => {
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);
  // 按响应时间排序：最快的在前
  const sortedResponses = useMemo(() => {
    return [...roundResponses].sort((a, b) => {
      if (a.responseTime == null) return 1;
      if (b.responseTime == null) return -1;
      return a.responseTime - b.responseTime;
    });
  }, [roundResponses]);

  const onScroll = (e) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (page >= 0 && page < sortedResponses.length) setIdx(page);
  };

  return (
    <View style={st.roundBlock}>
      <View style={[st.roundLabel, { backgroundColor: colors.surfaceSecondary }]}>
        <Ionicons name="chatbubble-outline" size={10} color={colors.textTertiary} />
        <Text style={[st.roundLabelText, { color: colors.textTertiary }]}>第 {roundIdx + 1} 轮 · {sortedResponses.length} 个模型</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.indicatorBar} contentContainerStyle={st.indicatorContent}>
        {sortedResponses.map((r, i) => (
          <TouchableOpacity key={r.modelId}
            style={[st.indicator, { backgroundColor: i === idx ? getColor(r.modelId) : colors.surfaceSecondary, borderColor: i === idx ? getColor(r.modelId) : colors.borderLight }]}
            onPress={() => { setIdx(i); ref.current?.scrollTo({ x: i * SCREEN_W, animated: true }); }}>
            <Text style={[st.indicatorText, { color: i === idx ? '#FFF' : colors.text }]} numberOfLines={1}>{r.modelName}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        style={st.swiper} onMomentumScrollEnd={onScroll}>
        {sortedResponses.map((resp) => (
          <View key={resp.modelId} style={st.swiperPage}>
            <View style={[st.answerCard, { backgroundColor: colors.surface, borderColor: resp.success ? getColor(resp.modelId) : colors.error, borderWidth: 1.5 }]}>
              <View style={[st.cardHeader, { borderBottomColor: colors.borderLight }]}>
                <View style={[st.cardDot, { backgroundColor: getColor(resp.modelId) }]} />
                <Text style={[st.cardModelName, { color: colors.text }]} numberOfLines={1}>{resp.modelName}</Text>
                {resp.responseTime != null && <Text style={[st.cardTime, { color: colors.textTertiary }]}>{(resp.responseTime / 1000).toFixed(1)}s</Text>}
                <TouchableOpacity style={st.cardCopy} onPress={() => { try { require('expo-clipboard').setStringAsync(resp.content || ''); Alert.alert('已复制'); } catch (e) {} }}>
                  <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={st.cardBody} nestedScrollEnabled showsVerticalScrollIndicator>
                {resp.success ? <MarkdownRenderer content={resp.content || '(返回内容为空)'} /> : <Text style={{ color: colors.error, fontSize: FONTS.sm }}>❌ {resp.content || '调用失败'}</Text>}
                {resp.citations && resp.citations.length > 0 && (
                  <View style={st.citationsWrap}>
                    <Text style={[st.citationsTitle, { color: colors.textTertiary }]}>参考来源</Text>
                    {resp.citations.slice(0, 3).map((c, ci) => (
                      <TouchableOpacity key={ci} style={st.citationItem}
                        onPress={() => { if (c.url) RNLinking.openURL(c.url).catch(() => Alert.alert('无法打开链接')); }}>
                        <Text style={[st.citationText, { color: colors.textSecondary }]} numberOfLines={1}>{c.title || c.url}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={{ height: 12 }} />
              </ScrollView>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={st.disclaimer}>
        <Text style={[st.disclaimerText, { color: colors.textTertiary }]}>AI生成内容可能不准确，请以官方信息为准</Text>
      </View>
    </View>
  );
};

const ChatDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { conversation } = route.params;
  const allMessages = conversation?.messages || [];
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [messages, setMessages] = useState(allMessages);
  const [phase, setPhase] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    const { height } = require('react-native').Dimensions.get('window');
    setScreenHeight(height);
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const sy = e.endCoordinates?.screenY || 0;
      if (sy > 0) setKeyboardHeight(screenHeight - sy);
      else setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [screenHeight]);

  // 按轮次分组消息
  const rounds = useMemo(() => {
    const result = [];
    let currentUser = null;
    let currentResponses = [];
    for (const msg of messages) {
      if (msg.role === 'user') {
        if (currentUser && currentResponses.length > 0) {
          result.push({ user: currentUser, responses: currentResponses });
        }
        currentUser = msg;
        currentResponses = [];
      } else if (msg.role === 'assistant') {
        currentResponses.push(msg);
      }
    }
    if (currentUser && currentResponses.length > 0) {
      result.push({ user: currentUser, responses: currentResponses });
    }
    return result;
  }, [messages]);

  const modelIds = useMemo(() => {
    const ids = new Set();
    messages.forEach(m => { if (m.role === 'assistant' && m.modelId) ids.add(m.modelId); });
    return Array.from(ids);
  }, [messages]);

  const getModelName = (modelId) => {
    const account = accounts.find(a => a.id === modelId);
    return account?.name || modelId || 'AI模型';
  };
  const getModelColor = (modelId) => COLORS.modelColors[modelId] || '#888';

  useEffect(() => {
    loadAccounts();
    navigation.setOptions({ headerTitle: conversation?.title || '对话详情' });
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }, [rounds.length]);

  const loadAccounts = async () => { const accs = await getAccounts(); setAccounts(accs); };

  const handleCopy = (text) => {
    try { const C = require('expo-clipboard'); C.setStringAsync(text); Alert.alert('已复制'); } catch (e) { Alert.alert('复制失败'); }
  };

  const handleSend = async () => {
    const question = inputText.trim();
    if (!question || isLoading) return;
    const enabledAccounts = accounts.filter(a => a.enabled && a.apiKey);
    if (enabledAccounts.length === 0) { Alert.alert('提示', '请先在"模型管理"中配置至少一个AI模型'); return; }
    setInputText(''); setIsLoading(true); setPhase('searching');
    const userMsg = { role: 'user', content: question, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    try {
      let searchContext = null;
      try { searchContext = await preSearchWeb(question); } catch (e) {}
      setPhase('thinking');
      // 构建完整对话历史用于多轮上下文
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const results = await callMultipleAIModels(enabledAccounts, history, () => {}, searchContext);
      const aiMsgs = (results || []).map(r => ({
        role: 'assistant', content: r.content, modelName: r.modelName,
        modelId: r.modelId, success: r.success, responseTime: r.responseTime, timestamp: Date.now(),
      }));
      setMessages(prev => [...prev, ...aiMsgs]);
      const allMsgs = [...messages, userMsg, ...aiMsgs];
      const allAssistant = allMsgs.filter(m => m.role === 'assistant');
      const uniqueModels = new Set(allAssistant.map(m => m.modelId).filter(Boolean));
      const successModels = new Set(allAssistant.filter(m => m.success !== false).map(m => m.modelId).filter(Boolean));
      await saveConversation({ ...conversation, messages: allMsgs, updatedAt: Date.now(), modelCount: uniqueModels.size || allAssistant.length, successCount: successModels.size || allAssistant.filter(m => m.success !== false).length });
    } catch (error) { Alert.alert('错误', error.message); }
    finally { setIsLoading(false); setPhase(''); }
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      {/* 对话内容 - 与首页完全一致 */}
      <ScrollView ref={scrollRef} style={[st.msgList, { marginBottom: keyboardHeight > 0 ? keyboardHeight : 70 + insets.bottom }]}
        contentContainerStyle={st.msgContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {rounds.length === 0 && !isLoading && (
          <View style={st.emptyTip}><Text style={{ color: colors.textTertiary, fontSize: FONTS.sm }}>暂无消息</Text></View>
        )}
        {rounds.map((round, roundIdx) => (
          <View key={`round-${roundIdx}`}>
            <MessageBubble message={round.user.content} isUser={true}
              onCopy={(t) => { try { require('expo-clipboard').setStringAsync(t || ''); Alert.alert('已复制'); } catch (e) {} }} />
            <RoundBlock roundResponses={round.responses} roundIdx={roundIdx} isCurrentRound={false}
              colors={colors} getColor={getModelColor} />
          </View>
        ))}
        {isLoading && (
          <View>
            <MessageBubble message={inputText || '...'} isUser={true} />
            <View style={[st.statusBar, { backgroundColor: colors.surfaceSecondary }]}>
              <LoadingDots color={colors.primary} size={8} />
              <Text style={[st.statusText, { color: colors.textSecondary }]}>
                {phase === 'searching' ? '🌐 正在搜索网络信息...' : '🤔 AI 正在思考中...'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 输入区域 - 绝对定位，底部对齐键盘顶部 */}
      <View style={[st.inputArea, {
        backgroundColor: colors.background,
        borderTopColor: colors.borderLight,
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom,
      }]}>
        <View style={[st.inputBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <TextInput style={[st.input, { color: colors.text }]}
            value={inputText} onChangeText={setInputText}
            placeholder="继续提问..." placeholderTextColor={colors.textTertiary}
            multiline maxLength={2000} editable={!isLoading}
            onSubmitEditing={handleSend} returnKeyType="send" />
          <TouchableOpacity onPress={handleSend} disabled={!inputText.trim() || isLoading} style={st.sendBtn}>
            {isLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="arrow-up" size={22} color={inputText.trim() ? colors.primary : colors.textTertiary} />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const st = StyleSheet.create({
  container: { flex: 1 },
  filterWrap: { paddingVertical: SPACING.xs, borderBottomWidth: 1 },
  filterContent: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  filterChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.round },
  filterText: { fontSize: FONTS.sm, fontWeight: '500' },
  msgList: { flex: 1 },
  msgContent: { paddingVertical: SPACING.sm },
  emptyTip: { alignItems: 'center', paddingVertical: 40 },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginVertical: SPACING.sm, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg },
  statusText: { fontSize: FONTS.sm, fontWeight: '500' },
  // 与首页相同的轮次样式
  roundBlock: { marginTop: SPACING.sm },
  roundLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: SPACING.md, marginBottom: SPACING.xs, borderRadius: BORDER_RADIUS.round, paddingVertical: 3, marginLeft: SPACING.lg },
  roundLabelText: { fontSize: 10, fontWeight: '500' },
  indicatorBar: { maxHeight: 36, marginBottom: SPACING.sm },
  indicatorContent: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.xs },
  indicator: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.round, borderWidth: 1 },
  indicatorText: { fontSize: FONTS.xs, fontWeight: '500' },
  swiper: { maxHeight: 480 },
  swiperPage: { width: SCREEN_W, paddingHorizontal: SPACING.lg },
  answerCard: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', height: 430 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardModelName: { fontSize: FONTS.sm, fontWeight: '600', flex: 1 },
  cardTime: { fontSize: FONTS.xs },
  cardCopy: { padding: SPACING.xs },
  cardBody: { flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, paddingTop: SPACING.sm },
  // 引用和声明
  citationsWrap: { marginTop: SPACING.sm },
  citationsTitle: { fontSize: FONTS.xs, fontWeight: '600', marginBottom: SPACING.xs, color: '#888' },
  citationItem: { paddingVertical: 3 },
  citationText: { fontSize: FONTS.sm, lineHeight: 20 },
  disclaimer: { alignItems: 'center', paddingVertical: SPACING.xs },
  disclaimerText: { fontSize: FONTS.xs },
  // 输入区域
  inputArea: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm, borderTopWidth: 1 },
  inputBox: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: BORDER_RADIUS.xl, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.sm },
  input: { flex: 1, fontSize: FONTS.md, maxHeight: 120, minHeight: 36, paddingVertical: SPACING.xs },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

export default ChatDetailScreen;
