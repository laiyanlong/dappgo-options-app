import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { useAppStore } from '../../src/store/app-store';
import { fetchDashboardData } from '../../src/data/github-api';
import { GITHUB_OWNER, GITHUB_REPO } from '../../src/utils/constants';
import { mapTslaMatrix } from '../../src/data/mappers';
import { useBacktestStore } from '../../src/store/backtest-store';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { StrikeCard, calculateStarRating } from '../../src/components/trade/StrikeCard';
import { formatDollar, formatDate, daysUntil } from '../../src/utils/format';
import type { OptionEntry, StrikeComparison } from '../../src/utils/types';

// ── Supported tickers (extend as matrix data grows) ──
const TICKERS = ['TSLA', 'AMZN', 'NVDA'] as const;
type Ticker = (typeof TICKERS)[number];

// ── Type toggle options ──
const TYPE_SEGMENTS = ['Sell Put', 'Sell Call'];

// ── iPad breakpoint ──
const IPAD_WIDTH = 768;

export default function MatrixScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= IPAD_WIDTH;

  // ── Store data ──
  const tslaMatrix = useAppStore((s) => s.tslaMatrix);
  const dashboardData = useAppStore((s) => s.dashboardData);
  const setTslaMatrix = useAppStore((s) => s.setTslaMatrix);
  const setDashboardData = useAppStore((s) => s.setDashboardData);
  const quotes = useAppStore((s) => s.quotes);
  const [loading, setLoading] = useState(false);

  // Auto-fetch if no matrix data
  useEffect(() => {
    if (!tslaMatrix && !loading) {
      setLoading(true);
      fetchDashboardData(GITHUB_OWNER, GITHUB_REPO)
        .then((data) => {
          setDashboardData(data);
          const rawMatrix = (data as Record<string, unknown>)?.tsla_matrix;
          const mapped = mapTslaMatrix(rawMatrix); if (mapped) setTslaMatrix(mapped);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [tslaMatrix]);

  // ── Local UI state ──
  const [selectedTicker, setSelectedTicker] = useState<Ticker>('TSLA');
  const [selectedExpiryIdx, setSelectedExpiryIdx] = useState(0);
  const [typeIndex, setTypeIndex] = useState(0); // 0 = Sell Put, 1 = Sell Call
  const [checkedStrikes, setCheckedStrikes] = useState<Set<number>>(new Set());

  // ── Resolve matrix data for current ticker ──
  // Currently only TSLA has matrix data; others show a placeholder message
  const matrix: StrikeComparison | null = selectedTicker === 'TSLA' ? tslaMatrix : null;

  const currentPrice = matrix?.price ?? quotes[selectedTicker]?.price ?? 0;

  // ── Derive expiries and strikes ──
  const expiries = matrix?.expiries ?? [];
  const activeExpiry = expiries[selectedExpiryIdx] ?? null;
  const optionType = typeIndex === 0 ? 'puts' : 'calls';
  const strikes: OptionEntry[] = activeExpiry?.[optionType] ?? [];

  // ── Find best strike (highest annualized among good-spread options) ──
  const bestStrike = useMemo(() => {
    if (strikes.length === 0) return null;
    const candidates = strikes.filter(
      (s) => s.spreadQuality === 'Excellent' || s.spreadQuality === 'Good'
    );
    const pool = candidates.length > 0 ? candidates : strikes;
    return pool.reduce((best, cur) =>
      calculateStarRating(cur) > calculateStarRating(best) ? cur : best
    );
  }, [strikes]);

  // ── Compare mode ──
  const comparedEntries = useMemo(
    () => strikes.filter((s) => checkedStrikes.has(s.strike)),
    [strikes, checkedStrikes]
  );

  const toggleCompare = useCallback((strike: number) => {
    setCheckedStrikes((prev) => {
      const next = new Set(prev);
      if (next.has(strike)) {
        next.delete(strike);
      } else if (next.size < 3) {
        next.add(strike);
      }
      return next;
    });
  }, []);

  // ── Backtest action ──
  const addToPortfolio = useBacktestStore((s) => s.addToPortfolio);
  const setSimpleInput = useBacktestStore((s) => s.setSimpleInput);

  const handleBacktest = useCallback(
    (entry: OptionEntry) => {
      setSimpleInput({
        symbol: selectedTicker,
        strategy: typeIndex === 0 ? 'sell_put' : 'sell_call',
        otmPct: Math.abs(entry.otmPct),
      });
    },
    [selectedTicker, typeIndex, setSimpleInput]
  );

  const handleCompareBacktest = useCallback(() => {
    comparedEntries.forEach((entry) => {
      addToPortfolio({
        symbol: selectedTicker,
        strategy: typeIndex === 0 ? 'sell_put' : 'sell_call',
        otmPct: Math.abs(entry.otmPct),
        period: '6mo',
        strike: entry.strike,
      });
    });
  }, [comparedEntries, selectedTicker, typeIndex, addToPortfolio]);

  // ── Render helpers ──

  const renderStrikeCard = useCallback(
    ({ item }: { item: OptionEntry }) => (
      <View style={isWide ? styles.gridItem : undefined}>
        <StrikeCard
          entry={item}
          currentPrice={currentPrice}
          isBest={bestStrike?.strike === item.strike}
          isChecked={checkedStrikes.has(item.strike)}
          onToggleCompare={() => toggleCompare(item.strike)}
          onBacktest={() => handleBacktest(item)}
        />
      </View>
    ),
    [currentPrice, bestStrike, checkedStrikes, isWide, toggleCompare, handleBacktest]
  );

  const keyExtractor = useCallback((item: OptionEntry) => `${item.strike}`, []);

  // ── Empty / Loading state ──
  if (!matrix) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.emptySubtitle, { color: colors.textMuted, marginTop: 12 }]}>
              Loading options data...
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.emptyIcon, { color: colors.textMuted }]}>{'\u26A0'}</Text>
            <Text style={[styles.emptyTitle, { color: colors.textHeading }]}>
              No Matrix Data
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {selectedTicker === 'TSLA'
                ? 'Data loading failed. Check your connection.'
                : `Matrix data for ${selectedTicker} is not yet available`}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.accent }]}
              onPress={() => {
                setLoading(true);
                fetchDashboardData(GITHUB_OWNER, GITHUB_REPO)
                  .then((data) => {
                    setDashboardData(data);
                    const m = (data as Record<string, unknown>)?.tsla_matrix;
                    if (m) setTslaMatrix(m as any);
                  })
                  .catch(() => {})
                  .finally(() => setLoading(false));
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textHeading }]}>Options Matrix</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Strike comparison & analysis
        </Text>
      </View>

      {/* ── Ticker chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tickerRow}
        contentContainerStyle={styles.tickerContent}
      >
        {TICKERS.map((ticker) => {
          const active = ticker === selectedTicker;
          const price = ticker === 'TSLA' && matrix ? matrix.price : quotes[ticker]?.price;
          return (
            <TouchableOpacity
              key={ticker}
              style={[
                styles.tickerChip,
                {
                  backgroundColor: active ? colors.accent : colors.card,
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}
              onPress={() => {
                setSelectedTicker(ticker);
                setSelectedExpiryIdx(0);
                setCheckedStrikes(new Set());
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tickerSymbol,
                  { color: active ? '#fff' : colors.textHeading },
                ]}
              >
                {ticker}
              </Text>
              {price != null && (
                <Text
                  style={[
                    styles.tickerPrice,
                    { color: active ? 'rgba(255,255,255,0.8)' : colors.textMuted },
                  ]}
                >
                  {formatDollar(price)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Expiry tabs ── */}
      {expiries.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.expiryScroll}
          contentContainerStyle={styles.expiryContent}
        >
          {expiries.map((exp, idx) => {
            const active = idx === selectedExpiryIdx;
            const dte = exp.dte > 0 ? exp.dte : daysUntil(exp.date);
            return (
              <TouchableOpacity
                key={exp.date}
                style={[
                  styles.expiryTab,
                  active && { borderBottomColor: colors.gold, borderBottomWidth: 2 },
                ]}
                onPress={() => {
                  setSelectedExpiryIdx(idx);
                  setCheckedStrikes(new Set());
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.expiryDate,
                    { color: active ? colors.gold : colors.textMuted },
                  ]}
                >
                  {formatDate(exp.date)}
                </Text>
                <Text
                  style={[
                    styles.expiryDte,
                    { color: active ? colors.gold : colors.tabInactive },
                  ]}
                >
                  ({dte}d)
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Type toggle ── */}
      <View style={styles.typeToggle}>
        <SegmentedControl
          segments={TYPE_SEGMENTS}
          selectedIndex={typeIndex}
          onChange={(idx) => {
            setTypeIndex(idx);
            setCheckedStrikes(new Set());
          }}
        />
      </View>

      {/* ── Strike count ── */}
      <Text style={[styles.countLabel, { color: colors.textMuted }]}>
        {strikes.length} strikes
        {bestStrike ? ` \u2022 Best: ${formatDollar(bestStrike.strike)}` : ''}
      </Text>

      {/* ── Strike cards FlatList ── */}
      {strikes.length === 0 ? (
        <View style={styles.noStrikes}>
          <Text style={[styles.noStrikesText, { color: colors.textMuted }]}>
            No {typeIndex === 0 ? 'put' : 'call'} data for this expiry
          </Text>
        </View>
      ) : (
        <FlatList
          data={strikes}
          renderItem={renderStrikeCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          numColumns={isWide ? 2 : 1}
          key={isWide ? 'wide' : 'narrow'} // Force re-mount when numColumns changes
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Compare bottom sheet ── */}
      {comparedEntries.length >= 2 && (
        <View style={[styles.compareSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.compareTitle, { color: colors.textHeading }]}>
            Compare ({comparedEntries.length})
          </Text>

          {/* Side-by-side summary */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.compareRow}>
              {comparedEntries.map((entry) => (
                <View key={entry.strike} style={styles.compareCol}>
                  <Text style={[styles.compareStrike, { color: colors.gold }]}>
                    {formatDollar(entry.strike)}
                  </Text>
                  <Text style={[styles.compareStat, { color: colors.textMuted }]}>
                    POP {entry.pop.toFixed(1)}%
                  </Text>
                  <Text style={[styles.compareStat, { color: colors.textMuted }]}>
                    Ann {entry.annualized.toFixed(1)}%
                  </Text>
                  <Text style={[styles.compareStat, { color: colors.textMuted }]}>
                    IV {entry.iv.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Comparison insight */}
          {comparedEntries.length === 2 && (
            <CompareInsight a={comparedEntries[0]} b={comparedEntries[1]} colors={colors} />
          )}

          {/* Compare in Backtest button */}
          <TouchableOpacity
            style={[styles.compareBtn, { backgroundColor: colors.accent }]}
            onPress={handleCompareBacktest}
            activeOpacity={0.7}
          >
            <Text style={styles.compareBtnText}>Compare in Backtest {'\u2192'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Compare insight sub-component ──

function CompareInsight({
  a,
  b,
  colors,
}: {
  a: OptionEntry;
  b: OptionEntry;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const popDiff = Math.abs(a.pop - b.pop);
  const annDiff = Math.abs(a.annualized - b.annualized);

  // Determine which is higher-POP and which is higher-annualized
  const higherPop = a.pop >= b.pop ? a : b;
  const higherAnn = a.annualized >= b.annualized ? a : b;

  if (higherPop.strike === higherAnn.strike) {
    // Same strike dominates both metrics
    return (
      <Text style={[styles.insightText, { color: colors.textMuted }]}>
        {formatDollar(higherPop.strike)} leads in both POP (+{popDiff.toFixed(1)}%) and annualized (+{annDiff.toFixed(1)}%)
      </Text>
    );
  }

  return (
    <Text style={[styles.insightText, { color: colors.textMuted }]}>
      {formatDollar(higherPop.strike)} has {popDiff.toFixed(1)}% more POP but{' '}
      {formatDollar(higherAnn.strike)} has {annDiff.toFixed(1)}% more annualized return
    </Text>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  // Ticker chips
  tickerRow: {
    maxHeight: 56,
    marginBottom: 8,
  },
  tickerContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  tickerSymbol: {
    fontSize: 15,
    fontWeight: '700',
  },
  tickerPrice: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Expiry tabs
  expiryScroll: {
    maxHeight: 48,
    marginBottom: 4,
  },
  expiryContent: {
    paddingHorizontal: 16,
    gap: 4,
  },
  expiryTab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  expiryDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  expiryDte: {
    fontSize: 11,
    marginTop: 1,
  },
  // Type toggle
  typeToggle: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  // Count label
  countLabel: {
    fontSize: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  // FlatList
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 120, // room for compare sheet
  },
  gridItem: {
    flex: 1,
    paddingHorizontal: 4,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  noStrikes: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noStrikesText: {
    fontSize: 14,
  },
  // Compare bottom sheet
  compareSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32, // safe area
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  compareTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  compareRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  compareCol: {
    minWidth: 90,
  },
  compareStrike: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  compareStat: {
    fontSize: 12,
    marginBottom: 2,
  },
  insightText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginVertical: 6,
    lineHeight: 18,
  },
  compareBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  compareBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
