// 消息气泡组件 - 支持表格全宽显示 + 可控折叠
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, BORDER_RADIUS, SPACING } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import ModelTag from './ModelTag';
import MarkdownRenderer from './MarkdownRenderer';

const COLLAPSE_HEIGHT = 220;

const MessageBubble = ({ message, modelColor, modelName, isUser, onCopy, defaultExpanded, compact }) => {
  const [expanded, setExpanded] = useState(defaultExpanded || false);
  const isLong = message.length > 500;
  const { colors } = useTheme();

  if (isUser) {
    return (
      <View style={[styles.userContainer]}>
        <View style={[styles.userBubble, { backgroundColor: colors.userBubble }]}>
          <Text style={[styles.userText, { color: colors.userBubbleText }]}>{message}</Text>
        </View>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.aiContainer}>
        {modelName && (
          <View style={styles.modelRow}>
            <ModelTag name={modelName} color={modelColor || colors.primary} />
          </View>
        )}
        <View style={[styles.aiBubble, { backgroundColor: colors.aiBubble }]}>
          <View style={styles.contentWrap}>
            <ScrollView scrollEnabled={expanded} style={{ maxHeight: expanded ? undefined : COLLAPSE_HEIGHT }} nestedScrollEnabled>
              <MarkdownRenderer content={message} textStyle={{ color: colors.aiBubbleText }} />
            </ScrollView>
          </View>
          <View style={styles.actions}>
            {isLong && (
              <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.actionBtn}>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>{expanded ? '收起' : '展开'}</Text>
              </TouchableOpacity>
            )}
            {onCopy && <TouchableOpacity onPress={() => onCopy(message)} style={styles.actionBtn}>
              <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>复制</Text>
            </TouchableOpacity>}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiContainer}>
      {modelName && (
        <View style={styles.modelRow}>
          <ModelTag name={modelName} color={modelColor || colors.primary} />
        </View>
      )}
      <View style={[styles.aiBubble, { backgroundColor: colors.aiBubble }]}>
        <View style={styles.contentWrap}>
          <MarkdownRenderer 
            content={isLong && !expanded ? message.substring(0, 500) + '...' : message} 
            textStyle={{ color: colors.aiBubbleText }} 
          />
        </View>
        {isLong && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.expandBtn}>
            <Text style={[styles.expandText, { color: colors.textSecondary }]}>
              {expanded ? '收起' : '展开全部'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.actions}>
        {onCopy && <TouchableOpacity onPress={() => onCopy(message)} style={styles.actionBtn}>
          <Ionicons name="copy-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.actionText, { color: colors.textTertiary }]}>复制</Text>
        </TouchableOpacity>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userContainer: {
    alignItems: 'flex-end',
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  userBubble: {
    borderRadius: BORDER_RADIUS.lg,
    borderBottomRightRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    maxWidth: '85%',
  },
  userText: {
    fontSize: FONTS.md,
    lineHeight: 22,
  },
  aiContainer: {
    alignItems: 'flex-start',
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  modelRow: {
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.xs,
  },
  aiBubble: {
    borderRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: BORDER_RADIUS.sm,
    width: '100%',
    overflow: 'hidden',
  },
  contentWrap: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  expandBtn: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingVertical: 2,
  },
  expandText: {
    fontSize: FONTS.sm,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
    gap: SPACING.md,
    paddingLeft: SPACING.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  actionText: {
    fontSize: FONTS.xs,
  },
});

export default MessageBubble;
