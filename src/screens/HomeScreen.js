// 首页 - 对话式呈现：每轮问答串联，每轮独立滑块+标签
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, useImperativeHandle } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Animated, Dimensions, RefreshControl, Linking as RNLinking, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { getAccounts, saveConversation, getSettings, saveSettings, getGuideShown, setGuideShown } from '../services/storage';
import { callMultipleAIModels, preSearchWeb } from '../services/aiService';
import { fetchHotNews, forceRefreshNews } from '../services/newsService';
import LoadingDots from '../components/LoadingDots';
import ModelTag from '../components/ModelTag';
import MessageBubble from '../components/MessageBubble';
import MarkdownRenderer from '../components/MarkdownRenderer';

const SCREEN_W = Dimensions.get('window').width;
const CARD_H = 480;

// 数字格式化：超过1万显示万，超过1亿显示亿，保留2位小数
const formatNumber = (num) => {
  if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿';
  if (num >= 10000) return (num / 10000).toFixed(2) + '万';
  return num.toLocaleString();
};
const GREETINGS = [
  '👋 你好，有什么可以帮你的？', '🤔 今天想了解什么？', '💡 随时为你解答问题',
  '🚀 输入问题，多模型同时回答', '✨ 好奇什么就问什么', '🎯 让我帮你解决问题',
  '🌟 今日宜提问', '💪 你的私人AI助理', '📚 一起来探索知识', '🎨 创造力从这里开始',
];

// 动画包装器：isFirst=true时fade-in，否则无动画
const AnimatedCard = ({ children, isFirst = false }) => {
  if (!isFirst) return children;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
};

const RoundBlock = React.forwardRef(({ roundResponses, roundIdx, isCurrentRound, colors, getColor, onSelectModel, isFirstRound = false }, ref) => {
  const innerRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const scrollOffsetRef = useRef(0);
  const [displayResponses, setDisplayResponses] = useState(roundResponses);

  // 暴露 addResponse 方法，内部更新不触发父组件 re-render
  useImperativeHandle(ref, () => ({
    addResponse: (resp) => {
      setDisplayResponses(prev => {
        const existing = prev.find(r => r.modelId === resp.modelId);
        if (existing) {
          Object.assign(existing, resp);
          return [...prev];
        }
        return [...prev, resp];
      });
    },
  }));

  const sortedResponses = useMemo(() => {
    if (isCurrentRound) return displayResponses;
    return [...displayResponses].sort((a, b) => {
      if (a.responseTime == null) return 1;
      if (b.responseTime == null) return -1;
      return a.responseTime - b.responseTime;
    });
  }, [displayResponses, isCurrentRound]);

  useLayoutEffect(() => {
    if (isCurrentRound && scrollOffsetRef.current > 0 && innerRef.current) {
      innerRef.current.scrollTo({ x: scrollOffsetRef.current, animated: false });
    }
  }, [displayResponses.length]);

  const onScroll = (e) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    scrollOffsetRef.current = e.nativeEvent.contentOffset.x;
    if (page >= 0 && page < sortedResponses.length) { setIdx(page); onSelectModel && onSelectModel(roundIdx, page); }
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
            onPress={() => { setIdx(i); ref.current?.scrollTo({ x: i * SCREEN_W, animated: true }); onSelectModel && onSelectModel(roundIdx, i); }}>
            <Text style={[st.indicatorText, { color: i === idx ? '#FFF' : colors.text }]} numberOfLines={1}>{r.modelName}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView ref={innerRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        style={st.swiper} onMomentumScrollEnd={onScroll} removeClippedSubviews={false}>
        {sortedResponses.map((resp, i) => (
          <AnimatedCard key={resp.modelId} isFirst={isFirstRound && i === 0} index={0}>
          <View style={st.swiperPage}>
            <View style={[st.answerCard, { backgroundColor: colors.surface, borderColor: resp.success ? getColor(resp.modelId) : colors.error, borderWidth: 1.5 }]}>
              <View style={[st.cardHeader, { borderBottomColor: colors.borderLight }]}>
                <View style={[st.cardDot, { backgroundColor: getColor(resp.modelId) }]} />
                <Text style={[st.cardModelName, { color: colors.text }]} numberOfLines={1}>{resp.model}</Text>
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
          </AnimatedCard>
        ))}
      </ScrollView>
      {/* AI声明 - 无背景 */}
      <View style={st.disclaimer}>
        <Text style={[st.disclaimerText, { color: colors.textTertiary }]}>AI生成内容可能不准确，请以官方信息为准</Text>
      </View>
    </View>
  );
});

const MemoizedRoundBlock = React.memo(RoundBlock, (prev, next) => {
  return prev.roundResponses === next.roundResponses
    && prev.roundIdx === next.roundIdx
    && prev.isCurrentRound === next.isCurrentRound
    && prev.isFirstRound === next.isFirstRound;
});

const HomeScreen = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const [inputText, setInputText] = useState('');
  const [chatItems, setChatItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [convId, setConvId] = useState(null);
  const [greetingIdx, setGreetingIdx] = useState(0);
  const [tokenUsage, setTokenUsage] = useState({});
  const [chatTitle, setChatTitle] = useState('');
  const [phase, setPhase] = useState('');
  const [completedRoundCount, setCompletedRoundCount] = useState(0);
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [newsError, setNewsError] = useState(null);
  const [newsHidden, setNewsHidden] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [streamCount, setStreamCount] = useState(0);
  const responsesRef = useRef([]);
  const liveRoundRef = useRef(null);
  const statusOpacity = useRef(new Animated.Value(1)).current;
  const answerTranslateY = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);
  const prevChatItemsLenRef = useRef(0);
  const prevContentHeightRef = useRef(0);
  const wasLoadingRef = useRef(false);

  // 批量更新响应：通过ref直接更新子组件内部状态，避免父组件re-render导致水平ScrollView重置
  const batchUpdateResponse = useCallback((partial) => {
    const existing = responsesRef.current.find(r => r.modelId === partial.modelId);
    if (existing) {
      Object.assign(existing, partial);
    } else {
      responsesRef.current.push(partial);
    }
    setStreamCount(responsesRef.current.length);
    liveRoundRef.current?.addResponse(partial);
  }, []);

  // 完成轮次时清空响应
  const clearResponses = useCallback(() => {
    responsesRef.current = [];
    setStreamCount(0);
  }, []);

  // 保持 ref 同步
  useEffect(() => { chatItemsRef.current = chatItems; }, [chatItems]);
  useEffect(() => { convIdRef.current = convId; }, [convId]);
  useEffect(() => { chatTitleRef.current = chatTitle; }, [chatTitle]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const chatScrollRef = useRef(null);
  const chatItemsRef = useRef([]);
  const convIdRef = useRef(null);
  const chatTitleRef = useRef('');

  useEffect(() => {
    setGreetingIdx(Math.floor(Math.random() * GREETINGS.length));
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setGreetingIdx(p => (p + 1) % GREETINGS.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 加载完成后渐出状态栏 + 答案上移，完成后追加round到chatItems
  const pendingRoundRef = useRef(null);
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      wasLoadingRef.current = false;
      const round = pendingRoundRef.current;
      pendingRoundRef.current = null;
      if (round) {
        setChatItems(prev => [...prev, round]);
      }
      // 延迟一帧清空响应，确保历史轮次先渲染再移除流式内容，避免闪烁
      requestAnimationFrame(() => {
        clearResponses();
      });
      Animated.timing(statusOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else if (isLoading) {
      wasLoadingRef.current = true;
      statusOpacity.setValue(1);
      answerTranslateY.setValue(20);
    }
  }, [isLoading]);

  const recordUsage = async (q, results) => {
    try {
      const s = await getSettings();
      if (!s.tokenUsage) s.tokenUsage = {};
      results.forEach(r => {
        if (!r || !r.content) return;
        if (!s.tokenUsage[r.modelId]) s.tokenUsage[r.modelId] = { input: 0, output: 0, count: 0, totalTime: 0 };
        s.tokenUsage[r.modelId].input += countTokens(q);
        s.tokenUsage[r.modelId].output += countTokens(r.content);
        s.tokenUsage[r.modelId].count += 1;
        s.tokenUsage[r.modelId].totalTime += r.responseTime || 0;
      });
      await saveSettings(s);
      setTokenUsage({ ...s.tokenUsage });
    } catch (e) {}
  };

  const loadTokenUsage = async () => { try { const s = await getSettings(); setTokenUsage(s.tokenUsage || {}); } catch (e) {} };
  const countTokens = (t) => { if (!t) return 0; const c = (t.match(/[\u4e00-\u9fff]/g) || []).length; const e = t.replace(/[\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length; return Math.ceil(c * 1.5 + e * 0.3); };

  useEffect(() => {
    const load = () => { getAccounts().then(setAccounts); loadTokenUsage(); };
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, []);

  // 首次启动显示引导
  useEffect(() => {
    getGuideShown().then(shown => {
      if (!shown) {
        setShowGuide(true);
        setGuideShown();
      }
    });
  }, []);

  // 启动时获取热点新闻
  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async (isRefresh = false) => {
    if (isRefresh) {
      setNewsRefreshing(true);
      setNewsHidden(false);
    } else {
      setNewsLoading(true);
    }
    setNewsError(null);
    try {
      const fetchFn = isRefresh ? forceRefreshNews : fetchHotNews;
      const result = await fetchFn();
      setNewsList(result.news);
      if (result.error) setNewsError(result.error);
      if (result.hide) setNewsHidden(true);
      try {
        const { ToastAndroid } = require('react-native');
        if (isRefresh) {
          ToastAndroid.show(result.noNew ? '暂无新热点' : '已更新热点', ToastAndroid.SHORT);
        }
      } catch (e) {}
    } catch (e) {
      setNewsError('加载热点失败');
    } finally {
      setNewsLoading(false);
      setNewsRefreshing(false);
    }
  };

  const enabledCount = accounts.filter(a => a.enabled && a.apiKey).length;
  const getColor = (modelId) => COLORS.modelColors[modelId] || '#888';

  const startNewConversation = () => {
    setChatItems([]); clearResponses(); pendingRoundRef.current = null; setConvId(null); setChatTitle(''); setCompletedRoundCount(0); convIdRef.current = null; chatTitleRef.current = '';
  };

  const handleSend = async (text) => {
    const question = text || inputText.trim();
    if (!question) return;
    const enabledAccounts = accounts.filter(a => a.enabled && a.apiKey);
    if (!enabledAccounts.length) {
      Alert.alert('未配置模型', '请先在"模型管理"中配置至少一个AI模型的API Key',
        [{ text: '去配置', onPress: () => navigation.navigate('Account') }, { text: '取消' }]);
      return;
    }
    setInputText(''); setPhase('searching');

    (async () => {
      try {
        const { callAIModel } = await import('../services/aiService');
        const prevTitle = chatTitleRef.current || '';
        const contextMsg = prevTitle ? `之前的对话主题是"${prevTitle}"，现在用户问了新问题。` : '';
        const r = await callAIModel(enabledAccounts[0], [{ role: 'user', content: `将以下内容简化为不超过10个字的标题，直接返回标题，不要任何多余文字和符号：${contextMsg}${question}` }], false);
        setChatTitle(r.success && r.content ? r.content.replace(/[#*【】《》""''`\n]/g, '').trim().substring(0, 20) : question.substring(0, 15));
      } catch (e) { setChatTitle(question.substring(0, 15)); }
    })();

    const userItem = { type: 'user', content: question, timestamp: Date.now() };
    setChatItems(prev => [...prev, userItem]);
    setIsLoading(true);
    clearResponses();

    try {
      let searchContext = null;
      try { searchContext = await preSearchWeb(question); } catch (e) {}
      setPhase('thinking');
      const currentItems = [...(chatItemsRef.current || [])];
      const allMsgsForApi = [];
      for (const item of currentItems) {
        if (!item) continue;
        if (item.type === 'user') {
          allMsgsForApi.push({ role: 'user', content: item.content });
        } else if (item.type === 'round') {
          const firstResp = item.responses.find(r => r.success);
          if (firstResp) {
            allMsgsForApi.push({ role: 'assistant', content: firstResp.content });
          }
        }
      }
      allMsgsForApi.push({ role: 'user', content: question });
      const results = await callMultipleAIModels(enabledAccounts, allMsgsForApi,
        (partial) => {
          batchUpdateResponse(partial);
        }, searchContext);
      if (!results || results.length === 0) throw new Error('所有模型返回为空');
      await recordUsage(question, results);
      const roundItem = { type: 'round', responses: results, timestamp: Date.now() };
      pendingRoundRef.current = roundItem;
      setCompletedRoundCount(prev => prev + 1);
      const finalConvId = convIdRef.current || `conv_${Date.now()}`;
      setConvId(finalConvId);
      // 按时间顺序保存消息：用户消息和AI回复交替排列
      // currentItems 已包含当前 userItem（setChatItems 在前面已调用）
      const allMessages = [];
      for (const item of currentItems) {
        if (!item) continue;
        if (item.type === 'user') {
          allMessages.push({ role: 'user', content: item.content });
        } else if (item.type === 'round') {
          for (const r of item.responses) {
            allMessages.push({ role: 'assistant', content: r.content, modelName: r.modelName, modelId: r.modelId, success: r.success, responseTime: r.responseTime, citations: r.citations || [] });
          }
        }
      }
      // 只添加当前轮的AI回复（用户消息已在chatItems中）
      for (const r of results) {
        allMessages.push({ role: 'assistant', content: r.content, modelName: r.modelName, modelId: r.modelId, success: r.success, responseTime: r.responseTime, citations: r.citations || [] });
      }
      await saveConversation({ id: finalConvId, title: chatTitleRef.current || question.substring(0, 30), messages: allMessages, createdAt: Date.now(), updatedAt: Date.now(), modelCount: new Set(results.map(r => r.modelId).filter(Boolean)).size || results.length, successCount: new Set(results.filter(r => r.success).map(r => r.modelId).filter(Boolean)).size || results.filter(r => r.success).length });
    } catch (error) { Alert.alert('错误', error.message); }
    finally { setIsLoading(false); setPhase(''); }
  };

  const content = (
    <View style={st.flex1}>
      {chatItems.length === 0 ? (
        <ScrollView style={st.emptyContainer}
          contentContainerStyle={st.emptyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={newsRefreshing} onRefresh={() => loadNews(true)} tintColor={isDark ? '#888888' : '#666666'} colors={[isDark ? '#FFFFFF' : '#000000']} progressBackgroundColor={isDark ? '#1A1A1A' : '#F0F0F0'} />}>
          <View style={st.centerContent}>
            <Text style={[st.brandName, { color: colors.text }]}
              onTouchEnd={() => {
                const now = Date.now();
                if (now - lastTapRef.current < 300) {
                  setShowGuide(true);
                }
                lastTapRef.current = now;
              }}>AIALL</Text>
            <Animated.Text style={[st.greeting, { color: colors.textSecondary, opacity: fadeAnim }]}>
              {GREETINGS[greetingIdx]}
            </Animated.Text>
            <Text style={[st.subGreeting, { color: colors.textTertiary }]}>同时向 {enabledCount} 个AI模型提问</Text>
            {enabledCount > 0 && (
              <View style={st.modelRow}>
                {accounts.filter(a => a.enabled && a.apiKey).map(a => (
                  <ModelTag key={a.id} name={a.name} color={a.color} size="small" />
                ))}
              </View>
            )}
          </View>

          {/* 热点新闻 */}
          {!newsHidden && (
          <AnimatedCard>
          <View style={st.newsSection}>
            <View style={st.newsHeader}>
              <Ionicons name="flame" size={18} color="#FF3B30" />
              <Text style={[st.newsTitle, { color: colors.text }]}>今日热点</Text>
            </View>
            {newsLoading && newsList.length === 0 ? (
              <View style={st.newsLoadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[st.newsLoadingText, { color: colors.textTertiary }]}>正在获取热点...</Text>
              </View>
            ) : newsError && newsList.length === 0 ? (
              <View style={st.newsErrorBox}>
                <Ionicons name="cloud-offline-outline" size={24} color={colors.textTertiary} />
                <Text style={[st.newsErrorText, { color: colors.textTertiary }]}>{newsError}</Text>
              </View>
            ) : (
              <View>
                {newsError && (
                  <Text style={[st.newsWarning, { color: colors.warning }]}>{newsError}</Text>
                )}
                {newsList.map((item, idx) => (
                  <TouchableOpacity key={`news-${idx}`}
                    style={[st.newsItem, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}
                    onPress={() => handleSend(item.title)}
                    activeOpacity={0.7}>
                    <Text style={[st.newsItemTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                    <Text style={[st.newsItemSource, { color: colors.textTertiary }]}>{item.platform}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          </AnimatedCard>
          )}
        </ScrollView>
      ) : (
        <View style={st.chatBox}>
          <ScrollView ref={chatScrollRef} style={st.chatList}
            contentContainerStyle={st.chatListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={(w, h) => {
              if (h > prevContentHeightRef.current) {
                chatScrollRef.current?.scrollToEnd({ animated: true });
              }
              prevContentHeightRef.current = h;
            }}>

            {chatItems.filter(Boolean).map((item, idx) => {
              if (item.type === 'user') {
                return <AnimatedCard key={`u-${idx}`} isFirst={idx === 0}><MessageBubble message={item.content} isUser={true}
                  onCopy={(t) => { try { require('expo-clipboard').setStringAsync(t || ''); Alert.alert('已复制到剪贴板'); } catch (e) {} }} /></AnimatedCard>;
              }
              if (item.type === 'round' && item.responses) {
                let actualRound = 0;
                for (let i = 0; i <= idx; i++) {
                  if (chatItems[i] && chatItems[i].type === 'round') actualRound++;
                }
                return <MemoizedRoundBlock key={`r-${idx}`} roundResponses={item.responses} roundIdx={actualRound - 1} isCurrentRound={false}
                  colors={colors} getColor={getColor} isFirstRound={actualRound === 1} />;
              }
              return null;
            })}

            {isLoading && (
              <Animated.View style={[st.statusBar, { opacity: statusOpacity }]}>
                <LoadingDots color={colors.primary} size={4} />
                <Text style={[st.statusText, { color: colors.textSecondary }]}>
                  {phase === 'searching' ? '🌐 搜索中' : streamCount > 0 ? `${streamCount}/${enabledCount} 已响应` : '思考中'}
                </Text>
              </Animated.View>
            )}

            {streamCount > 0 && (
              <Animated.View style={{ transform: [{ translateY: answerTranslateY }] }}>
                <MemoizedRoundBlock ref={liveRoundRef} roundResponses={responsesRef.current} roundIdx={completedRoundCount}
                  isCurrentRound={true} colors={colors} getColor={getColor} />
              </Animated.View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const inputBar = (
    <View style={[st.inputArea, { backgroundColor: colors.background }]}>
      <View style={[st.inputBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <TextInput style={[st.input, { color: colors.text }]}
          value={inputText} onChangeText={setInputText}
          placeholder="输入你的问题..." placeholderTextColor={colors.textTertiary}
          multiline maxLength={2000} editable={!isLoading}
          onSubmitEditing={() => handleSend()} returnKeyType="send"
        />
        <TouchableOpacity onPress={() => handleSend()} disabled={!inputText.trim() || isLoading} style={st.sendBtn}>
          {isLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="arrow-up" size={22} color={inputText.trim() ? colors.primary : colors.textTertiary} />}
        </TouchableOpacity>
      </View>
    </View>
  );

  const behavior = Platform.OS === 'ios' ? 'padding' : 'height';
  return (
    <KeyboardAvoidingView style={[st.container, { backgroundColor: colors.background }]} behavior={behavior}>
      <View style={[st.header, { backgroundColor: colors.background }]}>
        {chatItems.length > 0 ? (
          <>
            <Text style={[st.headerTitle, { color: colors.text }]} numberOfLines={1}>{chatTitle}</Text>
            <TouchableOpacity onPress={startNewConversation}>
              <Ionicons name="add-circle-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </>
        ) : <View style={{ width: 40 }} />}
      </View>
      {content}
      {inputBar}
      {/* 引导弹窗 */}
      <Modal visible={showGuide} transparent animationType="fade" onRequestClose={() => setShowGuide(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowGuide(false)}>
          <View style={[st.guideModal, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
            <Text style={[st.guideTitle, { color: colors.text }]}>使用指南</Text>

            <View style={[st.guideItem, { borderBottomColor: colors.borderLight }]}>
              <View style={st.guideIcon}><Text style={{ fontSize: 18 }}>💬</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[st.guideItemTitle, { color: colors.text }]}>多模型对比</Text>
                <Text style={[st.guideItemDesc, { color: colors.textSecondary }]}>输入问题，多个AI模型同时回答，横向滑动对比</Text>
              </View>
            </View>

            <View style={[st.guideItem, { borderBottomColor: colors.borderLight }]}>
              <View style={st.guideIcon}><Text style={{ fontSize: 18 }}>🔥</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[st.guideItemTitle, { color: colors.text }]}>今日热点</Text>
                <Text style={[st.guideItemDesc, { color: colors.textSecondary }]}>下拉刷新热点，点击直接提问，24小时自动去重</Text>
              </View>
            </View>

            <View style={[st.guideItem, { borderBottomColor: colors.borderLight }]}>
              <View style={st.guideIcon}><Text style={{ fontSize: 18 }}>🌐</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[st.guideItemTitle, { color: colors.text }]}>联网搜索</Text>
                <Text style={[st.guideItemDesc, { color: colors.textSecondary }]}>支持 DeepSeek/MiMo 联网搜索，其他模型自动 Function Calling</Text>
              </View>
            </View>

            <View style={[st.guideItem, { borderBottomColor: colors.borderLight }]}>
              <View style={st.guideIcon}><Text style={{ fontSize: 18 }}>⚙️</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[st.guideItemTitle, { color: colors.text }]}>模型管理</Text>
                <Text style={[st.guideItemDesc, { color: colors.textSecondary }]}>拖拽排序 · 长按删除 · 下拉测试连接 · Token统计</Text>
              </View>
            </View>

            <View style={[st.guideItem, { borderBottomColor: colors.borderLight }]}>
              <View style={st.guideIcon}><Text style={{ fontSize: 18 }}>🌙</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[st.guideItemTitle, { color: colors.text }]}>深色模式</Text>
                <Text style={[st.guideItemDesc, { color: colors.textSecondary }]}>管理页切换 浅色/深色/自动 三种主题</Text>
              </View>
            </View>

            <View style={[st.guideItem, { borderBottomColor: colors.borderLight }]}>
              <View style={st.guideIcon}><Text style={{ fontSize: 18 }}>📋</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[st.guideItemTitle, { color: colors.text }]}>历史记录</Text>
                <Text style={[st.guideItemDesc, { color: colors.textSecondary }]}>自动保存所有对话，支持查看历史详情和统计</Text>
              </View>
            </View>

            <Text style={[st.guideHint, { color: colors.textTertiary }]}>双击首页"AIALL"可再次查看</Text>

            <TouchableOpacity style={[st.guideBtn, { backgroundColor: colors.primary }]} onPress={() => setShowGuide(false)}>
              <Text style={{ fontSize: FONTS.md, fontWeight: '600', color: isDark ? '#000' : '#FFF' }}>开始使用</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const st = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 40, paddingBottom: SPACING.sm },
  headerTitle: { fontSize: FONTS.lg, fontWeight: '600', flex: 1, marginRight: SPACING.md },
  chatBox: { flex: 1 },
  chatList: { flex: 1 },
  chatListContent: { paddingBottom: SPACING.md },
  emptyContainer: { flex: 1 },
  emptyContent: { flexGrow: 1 },
  centerContent: { alignItems: 'center', paddingHorizontal: SPACING.xl, paddingTop: SPACING.xxl },
  brandName: { fontSize: 48, fontWeight: '700', letterSpacing: 4, marginBottom: SPACING.xl },
  greeting: { fontSize: 22, fontWeight: '500', textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 30 },
  subGreeting: { fontSize: FONTS.md, textAlign: 'center', marginBottom: SPACING.xl },
  modelRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.sm },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, marginHorizontal: SPACING.lg, marginTop: 0, marginBottom: 4, height: 20, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.md },
  statusText: { fontSize: FONTS.xs, fontWeight: '500' },
  // 每轮对话块
  roundBlock: { marginTop: 0 },
  roundLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: SPACING.md, marginBottom: 2, borderRadius: BORDER_RADIUS.round, paddingVertical: 3, marginLeft: SPACING.lg },
  roundLabelText: { fontSize: 10, fontWeight: '500' },
  indicatorBar: { maxHeight: 36, marginBottom: 2 },
  indicatorContent: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.xs },
  indicator: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.round, borderWidth: 1 },
  indicatorText: { fontSize: FONTS.xs, fontWeight: '500' },
  swiper: { maxHeight: CARD_H },
  swiperPage: { width: SCREEN_W, paddingHorizontal: SPACING.lg },
  answerCard: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', height: CARD_H - 50 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardModelName: { fontSize: FONTS.sm, fontWeight: '600', flex: 1 },
  cardTime: { fontSize: FONTS.xs },
  cardCopy: { padding: SPACING.xs },
  cardBody: { flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, paddingTop: SPACING.sm },
  // 输入
  inputArea: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, paddingTop: SPACING.xs },
  inputBox: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: BORDER_RADIUS.xl, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.sm },
  input: { flex: 1, fontSize: FONTS.md, maxHeight: 120, minHeight: 36, paddingVertical: SPACING.xs },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  // 热点新闻
  newsSection: { marginTop: SPACING.xl, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  newsHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  newsTitle: { fontSize: FONTS.lg, fontWeight: '700', flex: 1 },
  newsRefreshBtn: { padding: SPACING.xs },
  newsLoadingBox: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  newsLoadingText: { fontSize: FONTS.sm },
  newsErrorBox: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  newsErrorText: { fontSize: FONTS.sm },
  newsWarning: { fontSize: FONTS.xs, marginBottom: SPACING.sm, textAlign: 'center' },
  newsItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1 },
  newsItemTitle: { flex: 1, fontSize: FONTS.sm, lineHeight: 20, marginRight: SPACING.sm },
  newsItemSource: { fontSize: FONTS.xs },
  // 引用和声明
  citationsWrap: { marginTop: SPACING.sm },
  citationsTitle: { fontSize: FONTS.xs, fontWeight: '600', marginBottom: SPACING.xs, color: '#888' },
  citationItem: { paddingVertical: 3 },
  citationText: { fontSize: FONTS.sm, lineHeight: 20 },
  disclaimer: { alignItems: 'center', paddingVertical: SPACING.xs },
  disclaimerText: { fontSize: FONTS.xs },
  // 引导弹窗
  guideModal: { width: '85%', borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl },
  guideTitle: { fontSize: FONTS.xl, fontWeight: '700', textAlign: 'center', marginBottom: SPACING.lg },
  guideItem: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth },
  guideIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,128,0.1)' },
  guideItemTitle: { fontSize: FONTS.md, fontWeight: '600' },
  guideItemDesc: { fontSize: FONTS.sm, marginTop: 2 },
  guideHint: { fontSize: FONTS.xs, textAlign: 'center', marginTop: SPACING.md, marginBottom: SPACING.sm },
  guideBtn: { borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
});

export default HomeScreen;
