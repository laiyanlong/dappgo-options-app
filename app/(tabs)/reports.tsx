import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { useAppStore } from '../../src/store/app-store';
import { fetchReportDates, fetchReportContent } from '../../src/data/github-api';
import { parseReport, extractTickerMetrics } from '../../src/data/parser';
import { formatDate, formatPct, formatDollar } from '../../src/utils/format';
import { GITHUB_OWNER, GITHUB_REPO, DEFAULT_TICKERS } from '../../src/utils/constants';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
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

// ── Chip component ──

function Chip({
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
}

// ── Main screen ──

export default function ReportsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // Store
  const reportDates = useAppStore((s) => s.reportDates);
  const reports = useAppStore((s) => s.reports);
  const isLoading = useAppStore((s) => s.isLoadingReports);
  const setReportDates = useAppStore((s) => s.setReportDates);
  const setReport = useAppStore((s) => s.setReport);
  const setLoading = useAppStore((s) => s.setLoading);

  // Local state
  const [error, setError] = useState<string | null>(null);
  const [tickerFilter, setTickerFilter] = useState('All');
  const [dateRange, setDateRange] = useState<DateRange>('Month');

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
        const report: DailyReport = { date: parsed.date || date, tickers };
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

    return dates;
  }, [reportDates, reports, tickerFilter, dateRange]);

  // ── Render helpers ──

  const renderCard = useCallback(
    ({ item: date }: { item: string }) => {
      const report = reports[date];
      const trade = report ? bestTradeLabel(report) : null;

      return (
        <Card
          onPress={() => router.push({ pathname: '/report/[date]', params: { date } })}
          style={{ borderColor: colors.border }}
        >
          {/* Header row */}
          <View style={styles.cardHeader}>
            <Text style={[styles.cardDate, { color: colors.textHeading }]}>
              {formatDate(date)}
            </Text>
            <Text style={[styles.cardDateFull, { color: colors.textMuted }]}>{date}</Text>
          </View>

          {/* Ticker summaries */}
          {report ? (
            <View style={styles.tickerGrid}>
              {report.tickers.map((t) => {
                const iv = ivRankBadge(t.ivRank);
                return (
                  <View key={t.symbol} style={[styles.tickerRow, { borderBottomColor: colors.border }]}>
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
                    <Text style={styles.verdictEmoji}>{verdictEmoji(t)}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 8 }} />
          )}

          {/* Best trade */}
          {trade && (
            <View style={[styles.bestTradeRow, { backgroundColor: colors.backgroundAlt }]}>
              <Text style={[styles.bestTradeLabel, { color: colors.textMuted }]}>Best trade</Text>
              <Text style={[styles.bestTradeValue, { color: colors.accent }]}>{trade}</Text>
            </View>
          )}

          {/* Tap hint */}
          <Text style={[styles.tapHint, { color: colors.textMuted }]}>Tap for details →</Text>
        </Card>
      );
    },
    [reports, colors, router]
  );

  // ── Screen ──

  if (isLoading && reportDates.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading reports...</Text>
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
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Title */}
      <Text style={[styles.title, { color: colors.textHeading }]}>Reports</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {filteredDates.length} report{filteredDates.length !== 1 ? 's' : ''}
      </Text>

      {/* Filter bar — ticker chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {TICKER_FILTERS.map((t) => (
          <Chip
            key={t}
            label={t}
            active={tickerFilter === t}
            onPress={() => setTickerFilter(t)}
            accentColor={colors.accent}
            textColor={colors.textMuted}
            borderColor={colors.border}
          />
        ))}
        <View style={styles.filterSpacer} />
        {DATE_RANGE_FILTERS.map((r) => (
          <Chip
            key={r}
            label={r}
            active={dateRange === r}
            onPress={() => setDateRange(r)}
            accentColor={colors.gold}
            textColor={colors.textMuted}
            borderColor={colors.border}
          />
        ))}
      </ScrollView>

      {/* Report list */}
      <FlatList
        data={filteredDates}
        keyExtractor={(d) => d}
        renderItem={renderCard}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadDates}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No reports found for this filter.
          </Text>
        }
      />
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8, paddingHorizontal: 16, marginBottom: 2 },
  subtitle: { fontSize: 13, paddingHorizontal: 16, marginBottom: 12 },

  // Filter bar
  filterRow: { maxHeight: 48, marginBottom: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterSpacer: { width: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 32 },

  // Card
  cardHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  cardDate: { fontSize: 17, fontWeight: '700' },
  cardDateFull: { fontSize: 12 },

  tickerGrid: { gap: 2, marginBottom: 10 },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tickerSymbol: { fontSize: 14, fontWeight: '700', width: 48 },
  tickerPrice: { fontSize: 14, fontWeight: '600', width: 72 },
  tickerChange: { fontSize: 13, fontWeight: '600', width: 52, textAlign: 'right' },
  verdictEmoji: { fontSize: 16, marginLeft: 4 },

  bestTradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  bestTradeLabel: { fontSize: 12, fontWeight: '600' },
  bestTradeValue: { fontSize: 13, fontWeight: '700', flex: 1 },

  tapHint: { fontSize: 11, textAlign: 'right' },

  // States
  loadingText: { fontSize: 14, marginTop: 12 },
  errorText: { fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 48, fontSize: 14 },
});
