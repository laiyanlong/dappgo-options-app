import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
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
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Store
  const reportDates = useAppStore((s) => s.reportDates);
  const reports = useAppStore((s) => s.reports);
  const isLoading = useAppStore((s) => s.isLoadingReports);
  const setReportDates = useAppStore((s) => s.setReportDates);
  const setReport = useAppStore((s) => s.setReport);
  const setLoading = useAppStore((s) => s.setLoading);

  // Settings (for badge tracking)
  const setLastViewedReportCount = useSettingsStore((s) => s.setLastViewedReportCount);

  // Local state
  const [error, setError] = useState<string | null>(null);
  const [tickerFilter, setTickerFilter] = useState('All');
  const [dateRange, setDateRange] = useState<DateRange>('Month');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search (300ms)
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(text.trim().toLowerCase());
    }, 300);
  }, []);

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

      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/report/[date]', params: { date } })}
          style={[
            styles.reportCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Colored left edge bar */}
          <View style={[styles.leftBar, { backgroundColor: barColor }]} />

          <View style={styles.reportCardContent}>
            {/* Header row */}
            <View style={styles.cardHeader}>
              <Text style={[styles.cardDate, { color: colors.textHeading }]}>
                {formatDate(date)}
              </Text>
              <Text style={[styles.cardDateFull, { color: colors.textMuted }]}>{date}</Text>
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
              <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 8 }} />
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
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
          scrollEventThrottle={16}
          bounces
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

        {/* Search bar */}
        <View style={[styles.searchContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textHeading }]}
            placeholder="Search reports..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedQuery(''); }} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

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
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadDates}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState emoji="📰" message="No reports found" hint="Try adjusting your filters or pull down to refresh" />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──

const styles = StyleSheet.create<Record<string, any>>({
  container: { flex: 1, paddingTop: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -1, marginTop: 8, paddingHorizontal: 16, marginBottom: 2 },
  subtitle: { fontSize: 13, paddingHorizontal: 16, marginBottom: 12 },

  // Filter bar
  filterRow: { marginBottom: 10 },
  filterContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingVertical: 4 },
  filterSpacer: { width: 8 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '600', lineHeight: 16 },

  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },

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
  tickerEmojiVerdict: { fontSize: 12, width: 20 },

  // Redesigned report card
  reportCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  leftBar: {
    width: 4,
  },
  reportCardContent: {
    flex: 1,
    padding: 16,
  },
  bestTradeInline: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  // States
  loadingText: { fontSize: 14, marginTop: 12 },
  errorText: { fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 48, fontSize: 14 },
});
