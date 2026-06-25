// 汇总简报卡片组件
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BORDER_RADIUS, SPACING, SHADOWS } from '../theme';
import { t } from '../i18n';
import ModelTag from './ModelTag';

const SummaryCard = ({ summary, responses, onCopy }) => {
  const [expanded, setExpanded] = useState(false);

  if (!summary) return null;

  const successfulResponses = responses.filter(r => r.success);
  const failedResponses = responses.filter(r => !r.success);

  return (
    <View style={styles.container}>
      {/* 简报头部 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text" size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>{t('summary.title')}</Text>
        </View>
        <TouchableOpacity onPress={onCopy} style={styles.copyBtn}>
          <Ionicons name="copy-outline" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* 汇总内容 */}
      <View style={styles.summaryContent}>
        <Text style={styles.summaryText}>{summary.summary}</Text>
      </View>

      {/* 响应统计 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{responses.length}</Text>
          <Text style={styles.statLabel}>{t('summary.totalModels')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {successfulResponses.length}
          </Text>
          <Text style={styles.statLabel}>{t('summary.success')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.error }]}>
            {failedResponses.length}
          </Text>
          <Text style={styles.statLabel}>{t('summary.fail')}</Text>
        </View>
        {summary.responseStats?.fastestModel && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue} numberOfLines={1}>
                {summary.responseStats.fastestModel}
              </Text>
              <Text style={styles.statLabel}>{t('summary.fastest')}</Text>
            </View>
          </>
        )}
      </View>

      {/* 各模型回复折叠区 */}
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.toggleText}>
          {expanded ? t('summary.hideReplies') : t('summary.showReplies', { n: successfulResponses.length })}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.modelsList}>
          {successfulResponses.map((response, index) => (
            <View key={index} style={styles.modelResponseItem}>
              <ModelTag
                name={response.modelName}
                color={COLORS.modelColors[response.modelId] || COLORS.primary}
                size="large"
              />
              <Text style={styles.modelResponseText}>{response.content}</Text>
              <Text style={styles.responseTime}>
                ⏱ {(response.responseTime / 1000).toFixed(1)}{t('common.unit.seconds')}
              </Text>
            </View>
          ))}
          {failedResponses.map((response, index) => (
            <View key={`failed-${index}`} style={styles.modelResponseItem}>
              <ModelTag
                name={response.modelName}
                color={COLORS.error}
                size="large"
              />
              <Text style={[styles.modelResponseText, { color: COLORS.error }]}>
                {response.content}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  copyBtn: {
    padding: SPACING.xs,
  },
  summaryContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  summaryText: {
    fontSize: FONTS.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceSecondary,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.divider,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  toggleText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  modelsList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  modelResponseItem: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modelResponseText: {
    fontSize: FONTS.sm,
    color: COLORS.text,
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  responseTime: {
    fontSize: FONTS.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
});

export default SummaryCard;