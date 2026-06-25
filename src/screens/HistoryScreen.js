// 历史记录页面
import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, BORDER_RADIUS, SPACING, SHADOWS } from '../theme';
import { getConversations, deleteConversation, clearAllConversations } from '../services/storage';
import { useTheme } from '../theme/ThemeContext';
import { t } from '../i18n';

const HistoryScreen = forwardRef((props, ref) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const lastLoadRef = useRef(0);
  const flatListRef = useRef(null);

  useImperativeHandle(ref, () => ({
    scrollToTop: () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
  }));

  // 页面聚焦时加载，距上次加载超过2秒才重新加载
  useFocusEffect(useCallback(() => {
    const now = Date.now();
    if (now - lastLoadRef.current > 2000) {
      getConversations().then(setConversations);
      lastLoadRef.current = now;
    }
  }, []));

  const loadConversations = async () => {
    const data = await getConversations();
    setConversations(data);
    lastLoadRef.current = Date.now();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleDelete = (id) => {
    Alert.alert(t('history.deleteTitle'), t('history.deleteConfirmMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => { await deleteConversation(id); await loadConversations(); },
      },
    ]);
  };

  const handleClearAll = () => {
    if (conversations.length === 0) return;
    Alert.alert(t('history.deleteAll'), t('history.deleteAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('history.clear'), style: 'destructive',
        onPress: async () => { await clearAllConversations(); await loadConversations(); },
      },
    ]);
  };

  const handleConversationPress = (conversation) => {
    navigation.navigate('ChatDetail', { conversation });
  };

  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
  };

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
      onPress={() => handleConversationPress(item)}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.itemTime, { color: colors.textTertiary }]}>{formatDate(item.updatedAt || item.createdAt)}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
      {item.summary && (
        <Text style={[styles.itemSummary, { color: colors.textSecondary }]} numberOfLines={2}>{item.summary}</Text>
      )}
      <View style={[styles.itemFooter, { borderTopColor: colors.borderLight }]}>
        {(() => {
          const msgs = item.messages || [];
          const assistantMsgs = msgs.filter(m => m.role === 'assistant');
          const uniqueModels = new Set(assistantMsgs.map(m => m.modelId).filter(Boolean));
          const totalModels = uniqueModels.size || assistantMsgs.length;
          const successModels = new Set(assistantMsgs.filter(m => m.success !== false).map(m => m.modelId).filter(Boolean)).size || assistantMsgs.filter(m => m.success !== false).length;
          let rounds = 0;
          for (let i = 0; i < msgs.length; i++) {
            if (msgs[i].role === 'user') {
              const hasNextAssistant = msgs.slice(i + 1).some(m => m.role === 'assistant');
              rounds += hasNextAssistant ? 1 : 0.5;
            }
          }
          return (
            <>
              <View style={styles.itemStats}>
                <Ionicons name="layers-outline" size={12} color={colors.textTertiary} />
                <Text style={[styles.itemStatsText, { color: colors.textTertiary }]}>{successModels}/{totalModels} {t('history.model')}</Text>
              </View>
              <View style={styles.itemStats}>
                <Ionicons name="chatbubbles-outline" size={12} color={colors.textTertiary} />
                <Text style={[styles.itemStatsText, { color: colors.textTertiary }]}>{rounds} {t('common.unit.rounds')}</Text>
              </View>
            </>
          );
        })()}
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="time-outline" size={64} color={colors.border} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('history.empty')}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('history.emptyDesc')}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('history.title')}</Text>
        {conversations.length > 0 && (
          <View style={styles.headerRight}>
            <Text style={[styles.totalCount, { color: colors.textTertiary }]}>{conversations.length} {t('history.records')}</Text>
            <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
              <Text style={[styles.clearBtnText, { color: colors.error }]}>{t('history.clear')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <FlatList
        ref={flatListRef}
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, conversations.length === 0 && styles.listContentEmpty]}
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 40, paddingBottom: SPACING.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: FONTS.xxl, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  totalCount: { fontSize: FONTS.sm },
  clearBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm },
  clearBtnText: { fontSize: FONTS.sm, fontWeight: '500' },
  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl },
  listContentEmpty: { flex: 1 },
  conversationItem: { borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, ...SHADOWS.small },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: FONTS.lg, fontWeight: '600', marginBottom: 2 },
  itemTime: { fontSize: FONTS.xs },
  deleteBtn: { padding: SPACING.xs },
  itemSummary: { fontSize: FONTS.sm, lineHeight: 18, marginTop: SPACING.md, marginBottom: SPACING.sm },
  itemFooter: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1 },
  itemStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemStatsText: { fontSize: FONTS.xs },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxl },
  emptyIconContainer: { marginBottom: SPACING.xl },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: '600', marginBottom: SPACING.sm },
  emptySubtitle: { fontSize: FONTS.md, textAlign: 'center' },
});

export default HistoryScreen;