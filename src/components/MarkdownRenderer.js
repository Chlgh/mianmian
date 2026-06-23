// Markdown 渲染组件 - 完整功能，表格支持Markdown及内容折行，夜间模式适配
import React from 'react';
import { View, Text, StyleSheet, Linking, ScrollView, useWindowDimensions } from 'react-native';
import { FONTS, SPACING } from '../theme';
import { useTheme } from '../theme/ThemeContext';

function parseInline(text) {
  if (!text) return [{ text: '', type: 'text' }];
  let parts = [];
  let lastEnd = 0;
  const codeRe = /`([^`]+)`/g;
  let m;
  while ((m = codeRe.exec(text)) !== null) {
    if (m.index > lastEnd) parts.push({ text: text.slice(lastEnd, m.index), type: 'text' });
    parts.push({ text: m[1], type: 'code' });
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < text.length) parts.push({ text: text.slice(lastEnd), type: 'text' });
  if (parts.length === 0) parts = [{ text, type: 'text' }];

  const parts2 = [];
  for (const p of parts) {
    if (p.type !== 'text') { parts2.push(p); continue; }
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    let last = 0, match;
    while ((match = linkRe.exec(p.text)) !== null) {
      if (match.index > last) parts2.push({ text: p.text.slice(last, match.index), type: 'text' });
      parts2.push({ text: match[1], url: match[2], type: 'link' });
      last = match.index + match[0].length;
    }
    if (last < p.text.length) parts2.push({ text: p.text.slice(last), type: 'text' });
  }
  const parts3 = [];
  for (const p of parts2) {
    if (p.type !== 'text') { parts3.push(p); continue; }
    const boldRe = /\*\*(.+?)\*\*/g;
    let last = 0, match;
    while ((match = boldRe.exec(p.text)) !== null) {
      if (match.index > last) parts3.push({ text: p.text.slice(last, match.index), type: 'text' });
      parts3.push({ text: match[1], type: 'bold' });
      last = match.index + match[0].length;
    }
    if (last < p.text.length) parts3.push({ text: p.text.slice(last), type: 'text' });
  }
  return parts3.length > 0 ? parts3 : [{ text, type: 'text' }];
}

function renderInline(parts, textStyle = {}, linkColor = '#007AFF') {
  if (!parts || !Array.isArray(parts) || parts.length === 0) {
    return <Text style={textStyle}>{' '}</Text>;
  }
  const children = parts.map((p, i) => {
    if (!p) return null;
    switch (p.type) {
      case 'bold': return <Text key={i} style={[styles.bold, textStyle]}>{p.text}</Text>;
      case 'code': return <Text key={i} style={[styles.inlineCode, { backgroundColor: textStyle.backgroundColor || '#00000010', color: textStyle.errorColor || '#FF3B30' }, textStyle]}>{p.text}</Text>;
      case 'link':
        return (
          <Text key={i} style={[{ color: linkColor, textDecorationLine: 'underline' }, textStyle]} onPress={() => {
            Linking.openURL(p.url.startsWith('http') ? p.url : `https://${p.url}`).catch(() => {});
          }}>{p.text}</Text>
        );
      default: return p.text ? <Text key={i} style={textStyle}>{p.text}</Text> : null;
    }
  }).filter(Boolean);
  if (children.length === 0) return <Text style={textStyle}>{' '}</Text>;
  return <Text style={textStyle}>{children}</Text>;
}

function calcColWidths(headers, rows) {
  const widths = headers.map(h => Math.max(h.length * 8, 70));
  rows.forEach(row => {
    row.forEach((cell, i) => {
      if (i < widths.length) {
        const maxCellLen = cell.length > 20 ? 20 : cell.length;
        widths[i] = Math.max(widths[i], Math.min(maxCellLen * 9 + 16, 160));
      }
    });
  });
  return widths;
}

const MarkdownRenderer = ({ content, textStyle = {} }) => {
  const { colors } = useTheme();
  const { width: SCREEN_W } = useWindowDimensions();

  if (!content || typeof content !== 'string') {
    return <Text style={[styles.paragraph, textStyle]}>(无内容)</Text>;
  }

  try {
    const lines = content.split('\n');
    const elements = [];
    let codeBlockLines = [], inCodeBlock = false;
    let tableHeaders = [], tableRows = [], inTable = false;
    let keyCounter = 0;
    const nextKey = () => `md-${keyCounter++}`;

    const flushTable = () => {
      if (tableHeaders.length === 0 || tableRows.length === 0) return;
      try {
        const colWidths = calcColWidths(tableHeaders, tableRows);
        const totalWidth = colWidths.reduce((a, b) => a + b, 0) + colWidths.length * 16;
        const tableWidth = Math.max(totalWidth, SCREEN_W - 32);
        elements.push(
          <View key={nextKey()} style={[styles.tableOuter, { borderColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} nestedScrollEnabled>
              <View style={[styles.tableInner, { width: tableWidth }]}>
                <View style={styles.tableRow}>
                  {tableHeaders.map((h, ci) => (
                    <View key={`th-${ci}`} style={[styles.tCell, { width: colWidths[ci] || 80, backgroundColor: colors.surfaceSecondary, borderBottomColor: colors.border }]}>
                      <Text style={[styles.tHeaderText, { color: colors.text }]} numberOfLines={2}>{h}</Text>
                    </View>
                  ))}
                </View>
                {tableRows.map((row, ri) => (
                  <View key={`tr-${ri}`} style={[styles.tableRow, ri % 2 === 0 ? { backgroundColor: colors.surfaceSecondary } : {}]}>
                    {tableHeaders.map((_, ci) => (
                      <View key={`td-${ri}-${ci}`} style={[styles.tCell, { width: colWidths[ci] || 80, borderRightColor: colors.border, borderBottomColor: colors.border }]}>
                        <Text style={[styles.tCellText, { color: colors.text }]} numberOfLines={3}>{row[ci] || ''}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        );
      } catch (e) {}
      tableHeaders = []; tableRows = []; inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <View key={nextKey()} style={[styles.codeBlock, { backgroundColor: colors.surfaceSecondary, borderLeftColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text style={[styles.codeText, { color: colors.text }]} selectable>{codeBlockLines.join('\n')}</Text>
              </ScrollView>
            </View>
          );
          codeBlockLines = []; inCodeBlock = false;
        } else { inCodeBlock = true; }
        continue;
      }
      if (inCodeBlock) { codeBlockLines.push(line); continue; }

      if (line.trim() === '') { flushTable(); elements.push(<View key={nextKey()} style={{ height: 8 }} />); continue; }

      if (line.includes('|') && line.trim().startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
        if (cells.length > 0 && cells[0].match(/^[-:\s]+$/)) continue;
        if (!inTable) { tableHeaders = cells; inTable = true; }
        else { tableRows.push(cells); }
        continue;
      }
      if (inTable) flushTable();

      try {
        const hMatch = line.match(/^(#{1,6})\s+(.+)/);
        if (hMatch) {
          const level = hMatch[1].length;
          elements.push(
            <Text key={nextKey()} style={[styles[`h${level}`], { color: colors.text }, textStyle]}>
              {renderInline(parseInline(hMatch[2]), { color: colors.text, ...textStyle }, colors.info)}
            </Text>
          );
          continue;
        }
        const ulMatch = line.match(/^[-*+]\s+(.+)/);
        if (ulMatch) {
          elements.push(
            <View key={nextKey()} style={styles.listRow}>
              <Text style={[styles.bullet, { color: colors.text }]}>•</Text>
              <Text style={[styles.listText, { color: colors.text }, textStyle]}>{renderInline(parseInline(ulMatch[1]), { color: colors.text, ...textStyle }, colors.info)}</Text>
            </View>
          );
          continue;
        }
        const olMatch = line.match(/^(\d+)\.\s+(.+)/);
        if (olMatch) {
          elements.push(
            <View key={nextKey()} style={styles.listRow}>
              <Text style={[styles.bullet, { color: colors.text }]}>{olMatch[1]}.</Text>
              <Text style={[styles.listText, { color: colors.text }, textStyle]}>{renderInline(parseInline(olMatch[2]), { color: colors.text, ...textStyle }, colors.info)}</Text>
            </View>
          );
          continue;
        }
        if (line.match(/^[-*_]{3,}$/)) { elements.push(<View key={nextKey()} style={[styles.hr, { backgroundColor: colors.border }]} />); continue; }

        elements.push(
          <Text key={nextKey()} style={[styles.paragraph, { color: colors.text }, textStyle]}>
            {renderInline(parseInline(line), { color: colors.text, ...textStyle }, colors.info)}
          </Text>
        );
      } catch (e) {
        elements.push(<Text key={nextKey()} style={[styles.paragraph, { color: colors.text }, textStyle]}>{line}</Text>);
      }
    }
    flushTable();
    if (inCodeBlock && codeBlockLines.length > 0) {
      elements.push(
        <View key={nextKey()} style={[styles.codeBlock, { backgroundColor: colors.surfaceSecondary, borderLeftColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={[styles.codeText, { color: colors.text }]} selectable>{codeBlockLines.join('\n')}</Text>
          </ScrollView>
        </View>
      );
    }
    return <View style={styles.container}>{elements}</View>;
  } catch (e) {
    return <Text style={[styles.paragraph, { color: colors.text }, textStyle]} selectable>{content}</Text>;
  }
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  paragraph: { fontSize: FONTS.md, lineHeight: 24, marginBottom: 2 },
  h1: { fontSize: 22, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  h2: { fontSize: 19, fontWeight: '700', marginTop: 6, marginBottom: 3 },
  h3: { fontSize: 17, fontWeight: '600', marginTop: 5, marginBottom: 3 },
  h4: { fontSize: 15, fontWeight: '600', marginTop: 4, marginBottom: 2 },
  h5: { fontSize: 14, fontWeight: '600', marginTop: 3 },
  h6: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  bold: { fontWeight: '700' },
  inlineCode: { fontFamily: 'monospace', fontSize: FONTS.sm, borderRadius: 3, paddingHorizontal: 4 },
  codeBlock: { borderRadius: 8, padding: SPACING.md, marginVertical: 4, borderLeftWidth: 3 },
  codeText: { fontFamily: 'monospace', fontSize: FONTS.sm, lineHeight: 18 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2, paddingLeft: SPACING.sm },
  bullet: { width: 20, fontSize: FONTS.md },
  listText: { flex: 1, fontSize: FONTS.md, lineHeight: 24 },
  hr: { height: 1, marginVertical: 8 },
  tableOuter: { marginVertical: 6, borderRadius: 6, borderWidth: 1, overflow: 'hidden' },
  tableInner: {},
  tableRow: { flexDirection: 'row' },
  tCell: { paddingHorizontal: 6, paddingVertical: 5, borderRightWidth: 1, borderBottomWidth: 1 },
  tHeaderText: { fontWeight: '600', fontSize: FONTS.xs, lineHeight: 16 },
  tCellText: { fontSize: FONTS.xs, lineHeight: 16 },
});

export default MarkdownRenderer;
