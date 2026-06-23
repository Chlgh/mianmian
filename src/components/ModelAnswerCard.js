// 各模型独立回答卡片 - 固定高度 + 内容区域独立滚动
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import MarkdownRenderer from './MarkdownRenderer';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ModelAnswerCard = ({ modelName, modelColor, content, responseTime, tokenStats, onCopy }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [isScrollingVertically, setIsScrollingVertically] = useState(false);
  const scrollRef = useRef(null);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: modelColor || colors.primary, borderWidth: 2 }]}>
      {/* 模型头部 */}
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.header}>
          <View style={[styles.colorDot, { backgroundColor: modelColor || colors.primary }]} />
          <Text style={[styles.modelName, { color: colors.text }]} numberOfLines={1}>{modelName || '模型'}</Text>
          {responseTime != null && (
            <Text style={[styles.responseTime, { color: colors.textTertiary }]}>
              ⏱ {(responseTime / 1000).toFixed(1)}s
            </Text>
          )}
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {tokenStats && tokenStats.count > 0 && (
          <Text style={[styles.tokenText, { color: colors.textTertiary }]}>
            Token: {tokenStats.input + tokenStats.output} | {tokenStats.count}次
          </Text>
        )}
      </TouchableOpacity>

      {/* 回答内容 */}
      {expanded && (
        <View style={styles.contentArea}>
          {content ? (
            <ScrollView
              ref={scrollRef}
              style={styles.contentScroll}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              onTouchStart={() => { setIsScrollingVertically(true); }}
              onMomentumScrollEnd={() => { setIsScrollingVertically(false); }}
              onScrollEndDrag={() => { setTimeout(() => setIsScrollingVertically(false), 100); }}
            >
              <MarkdownRenderer
                content={content}
                textStyle={{ color: colors.text, fontSize: FONTS.md, lineHeight: 24 }}
              />
              <View style={styles.actions}>
                {onCopy && (
                  <TouchableOpacity onPress={() => onCopy(content)} style={styles.actionBtn}>
                    <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>复制</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          ) : (
            <Text style={[styles.placeholder, { color: colors.textTertiary }]}>
              内容加载中...
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - SPACING.lg * 2,
    alignSelf: 'center',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.sm,
    flex: 1,
    maxHeight: '95%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modelName: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    flex: 1,
  },
  responseTime: {
    fontSize: FONTS.xs,
  },
  tokenText: {
    fontSize: FONTS.xs,
    marginTop: SPACING.xs,
  },
  contentArea: {
    marginTop: SPACING.md,
    flex: 1,
    minHeight: 50,
  },
  contentScroll: {
    flex: 1,
  },
  placeholder: {
    fontSize: FONTS.md,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
  actions: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: FONTS.xs,
  },
});

export default ModelAnswerCard;