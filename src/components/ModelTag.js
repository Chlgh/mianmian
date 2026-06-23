// 模型标签组件
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from '../theme';

const ModelTag = ({ name, color, size = 'small', style }) => {
  const isSmall = size === 'small';
  
  return (
    <View style={[
      styles.tag,
      { backgroundColor: color + '15', borderColor: color + '30' },
      isSmall ? styles.tagSmall : styles.tagLarge,
      style,
    ]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[
        styles.text,
        { color },
        isSmall ? styles.textSmall : styles.textLarge,
      ]}>
        {name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.round,
  },
  tagSmall: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  tagLarge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontWeight: '500',
  },
  textSmall: {
    fontSize: FONTS.xs,
  },
  textLarge: {
    fontSize: FONTS.sm,
  },
});

export default ModelTag;