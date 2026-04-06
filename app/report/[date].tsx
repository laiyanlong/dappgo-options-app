import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { useAppStore } from '../../src/store/app-store';
import { fetchReportContent } from '../../src/data/github-api';
import { parseReport, extractTickerMetrics } from '../../src/data/parser';
import { formatDollar, formatPct, formatDateFull } from '../../src/utils/format';
import { GITHUB_OWNER, GITHUB_REPO } from '../../src/utils/constants';
import Markdown from 'react-native-markdown-display';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { useBacktestStore } from '../../src/store/backtest-store';
import { trackEvent } from '../../src/data/analytics';
import type { DailyReport, TickerReport } from '../../src/utils/types';

const TABS = ['Overview', 'Options', 'Strategy', 'Model', 'AI'];

// ── Section rendering helpers ──

function SectionBlock({
  title,
  content,
  colors,
}: {
  title: string;
  content: string;
  colors: any;
}) {
  if (!content) {
    return (
      <View style={styles.emptySection}>
        <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>
          No {title.toLowerCase()} data available.
        </Text>
      </View>
    );
  }

  const mdStyles = {
    body: { color: colors.text, fontSize: 14, lineHeight: 22 },
    heading1: { color: colors.textHeading, fontSize: 22, fontWeight: '700' as const, marginVertical: 8 },
    heading2: { color: colors.textHeading, fontSize: 18, fontWeight: '700' as const, marginVertical: 8 },
    heading3: { color: colors.gold, fontSize: 16, fontWeight: '600' as const, marginVertical: 6 },
    heading4: { color: colors.accent, fontSize: 14, fontWeight: '600' as const, marginVertical: 4 },
    paragraph: { color: colors.text, marginVertical: 4 },
    strong: { color: colors.textHeading, fontWeight: '700' as const },
    em: { color: colors.textMuted, fontStyle: 'italic' as const },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { color: colors.text, marginVertical: 2 },
    code_inline: { color: colors.gold, backgroundColor: colors.backgroundAlt, paddingHorizontal: 4, borderRadius: 3, fontSize: 13 },
    code_block: { color: colors.text, backgroundColor: colors.backgroundAlt, padding: 12, borderRadius: 8, fontSize: 12, marginVertical: 8 },
    fence: { color: colors.text, backgroundColor: colors.backgroundAlt, padding: 12, borderRadius: 8, fontSize: 12, marginVertical: 8 },
    table: { borderColor: colors.border, marginVertical: 8 },
    thead: { backgroundColor: colors.backgroundAlt },
    th: { color: colors.textHeading, fontWeight: '600' as const, padding: 6, borderColor: colors.border },
    td: { color: colors.text, padding: 6, borderColor: colors.border },
    tr: { borderColor: colors.border },
    blockquote: { backgroundColor: colors.backgroundAlt, borderLeftColor: colors.accent, borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, marginVertical: 6 },
    hr: { backgroundColor: colors.border, marginVertical: 12 },
    link: { color: colors.accent },
    image: { marginVertical: 8 },
  };

  return (
    <View style={styles.sectionBlock}>
      <Markdown style={mdStyles}>{content}</Markdown>
    </View>
  );
}

// Keep old line-based renderer as fallback reference
function _LegacySectionBlock({
  content,
  colors,
}: {
  title: string;
  content: string;
  colors: any;
}) {
  const lines = content.split('\n');
  return (
    <View style={styles.sectionBlock}>
      {lines.map((line: string, i: number) => {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('### ')) {
          return (
            <Text key={i} style={[styles.h3, { color: colors.gold }]}>
              {trimmed.replace('### ', '')}
            </Text>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <Text key={i} style={[styles.h2, { color: colors.textHeading }]}>
              {trimmed.replace('## ', '')}
            </Text>
          );
        }
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return (
            <Text key={i} style={[styles.boldLine, { color: colors.textHeading }]}>
              {trimmed.replace(/\*\*/g, '')}
            </Text>
          );
        }

        // Table rows — render as styled row
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          // Skip separator rows
          if (trimmed.includes('---')) return null;
          const cells = trimmed
            .split('|')
            .filter(Boolean)
            .map((c) => c.trim());
          return (
            <View key={i} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              {cells.map((cell, ci) => (
                <Text
                  key={ci}
                  style={[
                    styles.tableCell,
                    ci === 0 && styles.tableCellFirst,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {cell}
                </Text>
              ))}
            </View>
          );
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <Text key={i} style={[styles.bullet, { color: colors.text }]}>
              {'  \u2022  '}
              {trimmed.slice(2)}
            </Text>
          );
        }

        // Empty lines
        if (!trimmed) return <View key={i} style={styles.spacer} />;

        // Regular text
        return (
          <Text key={i} style={[styles.bodyText, { color: colors.text }]}>
            {trimmed}
          </Text>
        );
      })}
    </View>
  );
}

// ── Overview tab ──

function OverviewTab({ report, colors }: { report: DailyReport; colors: any }) {
  return (
    <View>
      {report.tickers.map((t) => (
        <PriceCard key={t.symbol} ticker={t} colors={colors} />
      ))}
    </View>
  );
}

function PriceCard({ ticker, colors }: { ticker: TickerReport; colors: any }) {
  const changeColor = ticker.changePct >= 0 ? colors.positive : colors.negative;

  return (
    <Card>
      <View style={styles.priceCardHeader}>
        <Text style={[styles.priceSymbol, { color: colors.gold }]}>{ticker.symbol}</Text>
        <Text style={[styles.priceValue, { color: colors.textHeading }]}>
          {formatDollar(ticker.price)}
        </Text>
        <Text style={[styles.priceChange, { color: changeColor }]}>
          {formatPct(ticker.changePct)}
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricItem label="Avg IV" value={`${(ticker.avgIv ?? 0).toFixed(1)}%`} colors={colors} />
        {ticker.ivRank !== undefined && (
          <MetricItem label="IV Rank" value={`${(ticker.ivRank ?? 0).toFixed(0)}%`} colors={colors} highlight />
        )}
        {ticker.pcRatio && (
          <MetricItem label="P/C Ratio" value={(ticker.pcRatio?.volumeRatio ?? 0).toFixed(2)} colors={colors} />
        )}
        {ticker.maxPain && (
          <MetricItem label="Max Pain" value={formatDollar(ticker.maxPain.price)} colors={colors} />
        )}
        {ticker.expectedMove && (
          <MetricItem
            label="Exp Move"
            value={`${formatPct(ticker.expectedMove.pct)}`}
            colors={colors}
          />
        )}
      </View>

      {/* IV Rank bar */}
      {ticker.ivRank !== undefined && (
        <View style={styles.ivBarContainer}>
          <Text style={[styles.ivBarLabel, { color: colors.textMuted }]}>IV Rank</Text>
          <View style={[styles.ivBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.ivBarFill,
                {
                  width: `${Math.min(ticker.ivRank, 100)}%`,
                  backgroundColor:
                    ticker.ivRank >= 70
                      ? colors.positive
                      : ticker.ivRank >= 40
                        ? colors.gold
                        : colors.negative,
                },
              ]}
            />
          </View>
          <Text style={[styles.ivBarValue, { color: colors.textHeading }]}>
            {(ticker.ivRank ?? 0).toFixed(0)}%
          </Text>
        </View>
      )}
    </Card>
  );
}

function MetricItem({
  label,
  value,
  colors,
  highlight,
}: {
  label: string;
  value: string;
  colors: any;
  highlight?: boolean;
}) {
  return (
    <View style={styles.metricItem}>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          { color: highlight ? colors.accent : colors.textHeading },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Main screen ──

export default function ReportDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const addToPortfolio = useBacktestStore((s) => s.addToPortfolio);

  const cachedReport = useAppStore((s) => s.reports[date ?? '']);
  const setReport = useAppStore((s) => s.setReport);

  const [tabIndex, setTabIndex] = useState(0);
  const [rawMarkdown, setRawMarkdown] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [report, setLocalReport] = useState<DailyReport | null>(cachedReport ?? null);
  const [loading, setLoading] = useState(!cachedReport);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const linkCopiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch full report ──

  const loadFull = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const md = await fetchReportContent(GITHUB_OWNER, GITHUB_REPO, date);
      setRawMarkdown(md);
      const parsed = parseReport(md);
      setSections(parsed.sections);

      const tickers: TickerReport[] = parsed.tickers.map((sym) => {
        const section = parsed.sections[sym] ?? '';
        const metrics = extractTickerMetrics(section, sym);
        return {
          symbol: sym,
          price: metrics.price ?? 0,
          changePct: metrics.changePct ?? 0,
          avgIv: metrics.avgIv ?? 0,
          ivRank: metrics.ivRank,
          expiries: [],
        };
      });

      const r: DailyReport = { date: parsed.date || date, tickers };
      setLocalReport(r);
      setReport(date, r);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadFull();
    if (date) trackEvent('report_view', { date });
  }, [date]);

  // ── Section content for each tab ──

  function getSectionContent(tab: string): string {
    switch (tab) {
      case 'Overview':
        // Overview uses structured data, not raw section
        return '';
      case 'Options': {
        // Collect all ticker sections that contain table data
        const parts: string[] = [];
        for (const [name, content] of Object.entries(sections)) {
          if (content.includes('Strike') || content.includes('|') && content.includes('IV')) {
            parts.push(content);
          }
        }
        return parts.join('\n\n') || '';
      }
      case 'Strategy': {
        const keys = Object.keys(sections).filter(
          (k) => k.includes('策略') || k.includes('Strategy') || k.includes('建議') || k.includes('組合')
        );
        return keys.map((k) => sections[k]).join('\n\n');
      }
      case 'Model': {
        const keys = Object.keys(sections).filter(
          (k) =>
            k.includes('模型') ||
            k.includes('Model') ||
            k.includes('Verdict') ||
            k.includes('regime') ||
            k.includes('總結')
        );
        return keys.map((k) => sections[k]).join('\n\n');
      }
      case 'AI': {
        const keys = Object.keys(sections).filter(
          (k) => k.includes('🤖') || k.includes('AI') || k.includes('GPT') || k.includes('Commentary')
        );
        return keys.map((k) => sections[k]).join('\n\n');
      }
      default:
        return '';
    }
  }

  // ── Actions ──

  const handleCopySummary = useCallback(async () => {
    try {
      const r = useAppStore.getState().reports[date ?? ''];
      const lines: string[] = [`Options Report - ${date}`];
      if (r?.tickers) {
        for (const t of r.tickers) {
          const dir = t.changePct >= 0 ? '+' : '';
          lines.push(`${t.symbol}: $${t.price.toFixed(2)} (${dir}${t.changePct.toFixed(2)}%) | IV ${(t.avgIv ?? 0).toFixed(1)}%`);
        }
      }
      await Clipboard.setStringAsync(lines.join('\n'));
      Alert.alert('Copied', 'Report summary copied to clipboard.');
    } catch {
      // Silent fail
    }
  }, [date]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Options Report — ${date}\nhttps://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/main/reports/${date}.md`,
      });
    } catch {}
  }, [date]);

  const handleCopyLink = useCallback(async () => {
    try {
      const url = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/main/reports/${date}.md`;
      await Clipboard.setStringAsync(url);
      setLinkCopied(true);
      if (linkCopiedTimer.current) clearTimeout(linkCopiedTimer.current);
      linkCopiedTimer.current = setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Silent fail
    }
  }, [date]);

  const handleAddToBacktest = useCallback(() => {
    // Use report data from app-store
    const report = useAppStore.getState().reports[date];
    if (report?.tickers) {
      report.tickers.forEach((t) => {
        addToPortfolio({
          symbol: t.symbol || 'TSLA',
          strategy: 'sell_put',
          otmPct: 5,
          period: '6mo',
        });
      });
    } else {
      addToPortfolio({
        symbol: 'TSLA',
        strategy: 'sell_put',
        otmPct: 5,
        period: '6mo',
      });
    }
    router.navigate('/(tabs)/backtest');
  }, [date, addToPortfolio, router]);

  // ── Render ──

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading report...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.negative }]}>{error}</Text>
        <TouchableOpacity
          onPress={loadFull}
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentTab = TABS[tabIndex];
  const sectionContent = getSectionContent(currentTab);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.accent }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerDate, { color: colors.textHeading }]}>
            {date ? formatDateFull(date) : 'Report'}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Segmented control */}
      <View style={styles.segmentContainer}>
        <SegmentedControl segments={TABS} selectedIndex={tabIndex} onChange={setTabIndex} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {currentTab === 'Overview' && report ? (
          <OverviewTab report={report} colors={colors} />
        ) : (
          <SectionBlock title={currentTab} content={sectionContent} colors={colors} />
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleAddToBacktest}
          style={[styles.actionBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.actionBtnText}>+ Add to Backtest</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCopySummary}
          style={[styles.actionBtn, { backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={[styles.actionBtnText, { color: colors.textHeading }]}>
            {'\uD83D\uDCCB'} Copy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShare}
          style={[styles.actionBtn, { backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={[styles.actionBtnText, { color: colors.textHeading }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCopyLink}
          style={[styles.actionBtn, { backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: linkCopied ? colors.positive : colors.border }]}
        >
          <Text style={[styles.actionBtnText, { color: linkCopied ? colors.positive : colors.textHeading }]}>
            {linkCopied ? 'Copied!' : '\uD83D\uDD17 Link'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 72 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerDate: { fontSize: 17, fontWeight: '700' },
  headerRight: { width: 72 },

  // Segments
  segmentContainer: { paddingHorizontal: 16, paddingTop: 12 },

  // Scroll content
  scrollContent: { flex: 1 },
  scrollInner: { padding: 16, paddingBottom: 32 },

  // Section rendering
  sectionBlock: {},
  h2: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  h3: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  boldLine: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  bodyText: { fontSize: 14, lineHeight: 22, marginBottom: 2 },
  bullet: { fontSize: 14, lineHeight: 22, marginBottom: 2 },
  spacer: { height: 8 },

  // Table
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableCell: { flex: 1, fontSize: 12, paddingHorizontal: 2 },
  tableCellFirst: { fontWeight: '600' },

  // Overview
  priceCardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 12,
  },
  priceSymbol: { fontSize: 18, fontWeight: '800' },
  priceValue: { fontSize: 22, fontWeight: '700' },
  priceChange: { fontSize: 15, fontWeight: '600' },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metricItem: { minWidth: 72 },
  metricLabel: { fontSize: 11, marginBottom: 2 },
  metricValue: { fontSize: 15, fontWeight: '700' },

  ivBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  ivBarLabel: { fontSize: 12, width: 52 },
  ivBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  ivBarFill: { height: 6, borderRadius: 3 },
  ivBarValue: { fontSize: 13, fontWeight: '600', width: 36, textAlign: 'right' },

  // Empty section
  emptySection: { paddingVertical: 48, alignItems: 'center' },
  emptySectionText: { fontSize: 14 },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // States
  loadingText: { fontSize: 14, marginTop: 12 },
  errorText: { fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
