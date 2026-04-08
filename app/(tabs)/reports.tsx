import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { useAppStore } from '../../src/store/app-store';
import { useSettingsStore } from '../../src/store/settings-store';
import { fetchReportDates, fetchReportContent } from '../../src/data/github-api';
import { parseReport, extractTickerMetrics } from '../../src/data/parser';
import { formatDate, formatPct, formatDollar } from '../../src/utils/format';
import { GITHUB_OWNER, GITHUB_REPO, DEFAULT_TICKERS } from '../../src/utils/constants';
import { Card, CARD_RADIUS, cardShadow } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { useT } from '../../src/utils/i18n';
import { InsightCard } from '../../src/components/ui/InsightCard';
import type { DailyReport, TickerReport } from '../../src/utils/types';

// ── Filter chips ──

const TICKER_FILTERS = ['All', ...DEFAULT_TICKERS];
const DATE_RANGE_FILTERS = ['Week', 'Month', 'All'] as const;
type DateRange = (typeof DATE_RANGE_FILTERS)[number];

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

// ── Helpers ──

function ivRankBadge(ivRank: number | undefined): { label: string; color: string } {
  if (ivRank === undefined) return { label: 'N/A', color: '#616161' };
  if (ivRank >= 70) return { label: `IV ${(ivRank ?? 0).toFixed(0)}%`, color: '#00e676' };
  if (ivRank >= 40) return { label: `IV ${(ivRank ?? 0).toFixed(0)}%`, color: '#f5c542' };
  return { label: `IV ${(ivRank ?? 0).toFixed(0)}%`, color: '#ff9800' };
}

function verdictEmoji(ticker: TickerReport): string {
  if (!ticker.bestCall && !ticker.bestPut) return '—';
  if (ticker.changePct > 0) return '📈';
  if (ticker.changePct < 0) return '📉';
  return '➡️';
}

function bestTradeLabel(report: DailyReport): string | null {
  for (const t of report.tickers) {
    if (t.bestPut) return `Sell ${t.symbol} Put @${formatDollar(t.bestPut.strike)}`;
    if (t.bestCall) return `Sell ${t.symbol} Call @${formatDollar(t.bestCall.strike)}`;
  }
  return null;
}

// ── Chip component (memoized) ──

const Chip = React.memo(function Chip({
  label,
  active,
  onPress,
  accentColor,
  textColor,
  borderColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accentColor: string;
  textColor: string;
  borderColor: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: active ? accentColor : 'transparent',
          borderColor: active ? accentColor : borderColor,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#fff' : textColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// ── Main screen ──

export default function ReportsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();

  // Store
  const reportDates = useAppStore((s) => s.reportDates);
  const reports = useAppStore((s) => s.reports);
  const isLoading = useAppStore((s) => s.isLoadingReports);
  const setReportDates = useAppStore((s) => s.setReportDates);
  const setReport = useAppStore((s) => s.setReport);
  const setLoading = useAppStore((s) => s.setLoading);

  // Settings (for badge tracking)
  const setLastViewedReportCount = useSettingsStore((s) => s.setLastViewedReportCount);
  const viewedDates = useSettingsStore((s) => s.viewedReportDates);
  const markViewed = useSettingsStore((s) => s.markReportViewed);

  // Insight cards
  // Session-only: dismissed cards reset when app restarts
  const [dismissedCards, setDismissedCards] = useState<string[]>([]);
  const dismissCard = useCallback((id: string) => {
    setDismissedCards((prev) => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  // Preview modal state (long-press peek)
  const [previewDate, setPreviewDate] = useState<string | null>(null);

  // Local state
  const [error, setError] = useState<string | null>(null);
  const [tickerFilter, setTickerFilter] = useState('All');
  const [dateRange, setDateRange] = useState<DateRange>('Month');
  const debouncedQuery = '';

  // Mark reports as viewed when this screen loads
  useEffect(() => {
    if (reportDates.length > 0) {
      setLastViewedReportCount(reportDates.length);
    }
  }, [reportDates.length, setLastViewedReportCount]);

  // ── Fetch dates ──

  const loadDates = useCallback(async () => {
    setLoading('isLoadingReports', true);
    setError(null);
    try {
      const dates = await fetchReportDates(GITHUB_OWNER, GITHUB_REPO);
      setReportDates(dates);
      // Prefetch the first few reports for card summaries
      await Promise.all(dates.slice(0, 8).map((d) => loadReport(d)));
    } catch (e: any) {
      setError(e.message ?? 'Failed to load reports');
    } finally {
      setLoading('isLoadingReports', false);
    }
  }, []);

  const loadReport = useCallback(
    async (date: string) => {
      if (reports[date]) return reports[date];
      try {
        const md = await fetchReportContent(GITHUB_OWNER, GITHUB_REPO, date);
        const parsed = parseReport(md);
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
        const report: DailyReport = { date: parsed.date || date, generatedAt: parsed.generatedAt, tickers };
        // Attach raw sections for InsightCards (not in the type but accessed via `as any`)
        (report as any)._sections = parsed.sections;
        setReport(date, report);
        return report;
      } catch {
        // Silently skip — card will show minimal info
        return null;
      }
    },
    [reports]
  );

  useEffect(() => {
    if (reportDates.length === 0) loadDates();
  }, []);

  // ── Filtering ──

  const filteredDates = useMemo(() => {
    let dates = reportDates;

    // Date range
    if (dateRange === 'Week') dates = dates.filter((d) => daysAgo(d) <= 7);
    else if (dateRange === 'Month') dates = dates.filter((d) => daysAgo(d) <= 31);

    // Ticker — only show dates whose report contains the ticker
    if (tickerFilter !== 'All') {
      dates = dates.filter((d) => {
        const r = reports[d];
        if (!r) return true; // keep if not yet loaded
        return r.tickers.some((t) => t.symbol === tickerFilter);
      });
    }

    // Search query — filter by date string, ticker names
    if (debouncedQuery) {
      dates = dates.filter((d) => {
        // Match against date string
        if (d.toLowerCase().includes(debouncedQuery)) return true;
        // Match against formatted date
        if (formatDate(d).toLowerCase().includes(debouncedQuery)) return true;
        // Match against ticker symbols in the report
        const r = reports[d];
        if (r) {
          for (const t of r.tickers) {
            if (t.symbol.toLowerCase().includes(debouncedQuery)) return true;
          }
        }
        return false;
      });
    }

    return dates;
  }, [reportDates, reports, tickerFilter, dateRange, debouncedQuery]);

  // ── Insight cards from latest report (dynamic — only sections with content) ──
  const { cards: insightCards, total: totalInsightCards } = useMemo(() => {
    if (reportDates.length === 0) return { cards: [], total: 0 };
    const latestDate = reportDates[0];
    const latestReport = reports[latestDate];
    if (!latestReport) return { cards: [], total: 0 };

    // Get parsed sections from the raw markdown if available
    const sections = (latestReport as any)._sections as Record<string, string> | undefined;
    if (!sections) return { cards: [], total: 0 };

    const allCards: Array<{ id: string; icon: string; title: string; content: string; linkText: string; tab: number }> = [];

    // Extract first meaningful paragraph from a section
    const extractSummary = (text: string, maxLen = 120): string => {
      const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('---'));
      const combined = lines.slice(0, 3).join(' ').replace(/\*\*/g, '').replace(/[#>]/g, '').trim();
      return combined.length > maxLen ? combined.slice(0, maxLen) + '...' : combined;
    };

    // Find sections by partial key matching
    const findSection = (keywords: string[]): string | undefined => {
      for (const [key, val] of Object.entries(sections)) {
        if (keywords.some(kw => key.toLowerCase().includes(kw))) return val;
      }
      return undefined;
    };

    const optionsContent = findSection(['選擇權', 'options', '核心表格']);
    if (optionsContent) {
      allCards.push({ id: `options-${latestDate}`, icon: '📊', title: t('report.options'), content: extractSummary(optionsContent), linkText: t('report.options') + ' →', tab: 1 });
    }

    const strategyContent = findSection(['策略', 'strategy', '多腳']);
    if (strategyContent) {
      allCards.push({ id: `strategy-${latestDate}`, icon: '🎯', title: t('report.strategy'), content: extractSummary(strategyContent), linkText: t('report.strategy') + ' →', tab: 2 });
    }

    const modelContent = findSection(['模型', 'model', '綜合評價']);
    if (modelContent) {
      allCards.push({ id: `model-${latestDate}`, icon: '🧠', title: t('report.model'), content: extractSummary(modelContent), linkText: t('report.model') + ' →', tab: 3 });
    }

    const aiContent = findSection(['ai', 'gemini', '市場解讀']);
    if (aiContent) {
      allCards.push({ id: `ai-${latestDate}`, icon: '🤖', title: 'AI', content: extractSummary(aiContent), linkText: 'AI →', tab: 4 });
    }

    const visibleCards = allCards.filter(c => !dismissedCards.includes(c.id));
    return { cards: visibleCards, total: allCards.length };
  }, [reportDates, reports, dismissedCards, t]);

  // ── Stable key extractor ──
  const reportKeyExtractor = useCallback((d: string) => d, []);

  // ── Render helpers ──

  // Determine if market was net up or down for a report
  const reportMarketDirection = useCallback((report: DailyReport | undefined): 'up' | 'down' | 'neutral' => {
    if (!report || report.tickers.length === 0) return 'neutral';
    const avg = report.tickers.reduce((sum, t) => sum + t.changePct, 0) / report.tickers.length;
    if (avg > 0.1) return 'up';
    if (avg < -0.1) return 'down';
    return 'neutral';
  }, []);

  // Emoji verdict per ticker: green/yellow/red circle
  const tickerEmoji = useCallback((t: TickerReport): string => {
    if (t.changePct > 1) return '\uD83D\uDFE2'; // green
    if (t.changePct > -1) return '\uD83D\uDFE1'; // yellow
    return '\uD83D\uDD34'; // red
  }, []);

  const renderCard = useCallback(
    ({ item: date }: { item: string }) => {
      const report = reports[date];
      const trade = report ? bestTradeLabel(report) : null;
      const direction = reportMarketDirection(report);
      const barColor = direction === 'up' ? colors.positive : direction === 'down' ? colors.negative : colors.border;

      // Unread logic: unread if not in viewedDates AND less than 3 days old
      const daysDiff = Math.floor((Date.now() - new Date(date + 'T00:00:00').getTime()) / 86400000);
      const isViewed = viewedDates.includes(date) || daysDiff > 3;
      const isUnread = !isViewed;

      return (
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => {
            markViewed(date);
            router.push({ pathname: '/report/[date]', params: { date } });
          }}
          onLongPress={() => setPreviewDate(date)}
          delayLongPress={400}
          style={[
            styles.reportCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            cardShadow(isDark),
          ]}
        >
          {/* Colored left edge bar — thicker + accent glow for unread */}
          <View style={[
            styles.leftBar,
            { backgroundColor: isUnread ? colors.accent : barColor },
            isUnread && { width: 4 },
          ]} />

          {/* Unread badge */}
          {isUnread && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.unreadText}>NEW</Text>
            </View>
          )}

          <View style={styles.reportCardContent}>
            {/* Chevron — indicates tappable */}
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.tabInactive}
              style={{ position: 'absolute', right: 12, top: 18 }}
            />
            {/* Header row */}
            <View style={styles.cardHeader}>
              <Text style={[styles.cardDate, { color: colors.textHeading }]}>
                {formatDate(date)}
              </Text>
              <Text style={[styles.cardDateFull, { color: colors.textMuted }]}>
                {report?.generatedAt ? `${date} · ${report.generatedAt.split(' ')[1]} UTC` : date}
              </Text>
            </View>

            {/* Ticker summaries with emoji verdicts */}
            {report ? (
              <View style={styles.tickerGrid}>
                {report.tickers.map((t) => {
                  const iv = ivRankBadge(t.ivRank);
                  return (
                    <View key={t.symbol} style={[styles.tickerRow, { borderBottomColor: colors.border }]}>
                      <Text style={styles.tickerEmojiVerdict}>{tickerEmoji(t)}</Text>
                      <Text style={[styles.tickerSymbol, { color: colors.gold }]}>{t.symbol}</Text>
                      <Text style={[styles.tickerPrice, { color: colors.textHeading }]}>
                        {formatDollar(t.price)}
                      </Text>
                      <Text
                        style={[
                          styles.tickerChange,
                          { color: t.changePct >= 0 ? colors.positive : colors.negative },
                        ]}
                      >
                        {formatPct(t.changePct)}
                      </Text>
                      <Badge label={iv.label} color={iv.color} />
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8 }}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 8 }}>Loading...</Text>
              </View>
            )}

            {/* Best trade inline */}
            {trade && (
              <Text style={[styles.bestTradeInline, { color: colors.accent }]}>
                {'\u2605'} {trade}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [reports, colors, router, reportMarketDirection, tickerEmoji]
  );

  // ── Screen ──

  if (isLoading && reportDates.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('reports.loading')}</Text>
        <Text style={[styles.loadingHint, { color: colors.textMuted }]}>{t('reports.loadingHint')}</Text>
      </View>
    );
  }

  if (error && reportDates.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.negative }]}>{error}</Text>
        <TouchableOpacity
          onPress={loadDates}
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.textHeading }]}>{t('reports.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {filteredDates.length} {t('reports.count')}
        </Text>

        {/* Filter bar — date range only */}
        <View style={styles.filterRow}>
          {DATE_RANGE_FILTERS.map((r) => {
            const rangeLabel = r === 'Week' ? t('reports.week') : r === 'Month' ? t('reports.month') : t('reports.all');
            return (
              <Chip
                key={r}
                label={rangeLabel}
                active={dateRange === r}
                onPress={() => setDateRange(r)}
                accentColor={colors.gold}
                textColor={colors.textMuted}
                borderColor={colors.border}
              />
            );
          })}
        </View>

        {/* ── Insight Cards (stacked — show one at a time) ── */}
        {insightCards.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <View style={styles.insightHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                {t('reports.todayInsights') || "TODAY'S INSIGHTS"}
              </Text>
              {totalInsightCards > 1 && (
                <Text style={[styles.insightCounter, { color: colors.textMuted }]}>
                  {totalInsightCards - insightCards.length + 1}/{totalInsightCards}
                </Text>
              )}
            </View>
            <InsightCard
              key={insightCards[0].id}
              icon={insightCards[0].icon}
              title={insightCards[0].title}
              content={insightCards[0].content}
              linkText={insightCards[0].linkText}
              onPress={() => {
                const latestDate = reportDates[0];
                if (latestDate) {
                  markViewed(latestDate);
                  router.push({ pathname: '/report/[date]', params: { date: latestDate, tab: String(insightCards[0].tab) } });
                }
              }}
              onDismiss={() => dismissCard(insightCards[0].id)}
              accentColor={colors.accent}
              stackBehind={Math.min(insightCards.length - 1, 2)}
              dismissHint={t('reports.dismissHint')}
            />
          </View>
        )}

        {/* Section label for past reports */}
        {filteredDates.length > 0 && (
          <Text style={[styles.sectionLabel, { color: colors.textMuted, paddingHorizontal: 16, marginBottom: 8 }]}>
            {t('reports.pastReports') || 'PAST REPORTS'}
          </Text>
        )}

        {/* Report list */}
        <FlatList
          data={filteredDates}
          keyExtractor={reportKeyExtractor}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          bounces
          initialNumToRender={8}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadDates}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState emoji={'\uD83D\uDCF0'} message={t('reports.noReports')} hint={t('reports.noReportsHint')} />
          }
        />
      </View>

      {/* ── Long-press preview modal ── */}
      <Modal
        visible={previewDate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewDate(null)}
      >
        <Pressable
          style={styles.previewOverlay}
          onPress={() => setPreviewDate(null)}
        >
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(() => {
              const report = previewDate ? reports[previewDate] : null;
              if (!report) {
                return (
                  <Text style={[styles.previewEmpty, { color: colors.textMuted }]}>
                    {t('reports.loadingData')}
                  </Text>
                );
              }
              const trade = bestTradeLabel(report);
              return (
                <>
                  <Text style={[styles.previewTitle, { color: colors.textHeading }]}>
                    {previewDate ? formatDate(previewDate) : ''}
                  </Text>
                  {report.tickers.map((t) => {
                    const iv = ivRankBadge(t.ivRank);
                    return (
                      <View key={t.symbol} style={[styles.previewTickerRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.previewSymbol, { color: colors.gold }]}>{t.symbol}</Text>
                        <Text style={[styles.previewPrice, { color: colors.textHeading }]}>{formatDollar(t.price)}</Text>
                        <Text style={[styles.previewChange, { color: t.changePct >= 0 ? colors.positive : colors.negative }]}>
                          {formatPct(t.changePct)}
                        </Text>
                        <Badge label={iv.label} color={iv.color} />
                      </View>
                    );
                  })}
                  {trade && (
                    <Text style={[styles.previewTrade, { color: colors.accent }]}>
                      {'\u2605'} {trade}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.previewOpenBtn, { backgroundColor: colors.accent }]}
                    onPress={() => {
                      setPreviewDate(null);
                      router.push({ pathname: '/report/[date]', params: { date: previewDate! } });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.previewOpenBtnText}>{t('reports.openFull')}</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──

const styles = StyleSheet.create<Record<string, any>>({
  container: { flex: 1, paddingTop: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -1, marginTop: 8, paddingHorizontal: 16, marginBottom: 2 },
  subtitle: { fontSize: 14, paddingHorizontal: 16, marginBottom: 12 },

  // Filter bar
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12, marginTop: 4 },
  filterSpacer: { width: 8 },
  chip: {
    // Apple HIG pill chip: generous padding, clear pill shape, 44pt+ touch target
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '600', lineHeight: 18 },

  // Insight header (title + counter)
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  insightCounter: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'] as any,
  },

  // List
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },

  // Card
  cardHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  cardDate: { fontSize: 17, fontWeight: '700' },
  cardDateFull: { fontSize: 13 },

  tickerGrid: { gap: 2, marginBottom: 10 },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tickerSymbol: { fontSize: 14, fontWeight: '700', width: 48 },
  tickerPrice: { fontSize: 14, fontWeight: '600', width: 72 },
  tickerChange: { fontSize: 14, fontWeight: '600', width: 56, textAlign: 'right' },
  tickerEmojiVerdict: { fontSize: 13, width: 22 },

  // Redesigned report card
  reportCard: {
    flexDirection: 'row',
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  leftBar: {
    width: 3,
  },
  unreadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 1,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  reportCardContent: {
    flex: 1,
    padding: 16,
  },
  bestTradeInline: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },

  // States
  loadingText: { fontSize: 15, marginTop: 12, fontWeight: '600' },
  loadingHint: { fontSize: 13, marginTop: 4, opacity: 0.7 },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  // 44pt touch target for retry button
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10, minHeight: 44, justifyContent: 'center' },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyText: { textAlign: 'center', marginTop: 48, fontSize: 15 },

  // Preview modal (long-press peek)
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },
  previewTickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewSymbol: { fontSize: 14, fontWeight: '700', width: 50 },
  previewPrice: { fontSize: 14, fontWeight: '600', width: 72 },
  previewChange: { fontSize: 14, fontWeight: '600', width: 56, textAlign: 'right' },
  previewTrade: { fontSize: 14, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  previewEmpty: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  previewOpenBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  previewOpenBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
