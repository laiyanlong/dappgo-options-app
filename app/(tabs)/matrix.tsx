import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { useAppStore } from '../../src/store/app-store';
import { fetchDashboardData } from '../../src/data/github-api';
import { GITHUB_OWNER, GITHUB_REPO } from '../../src/utils/constants';
import { mapTslaMatrix } from '../../src/data/mappers';
import { useBacktestStore } from '../../src/store/backtest-store';
import { useCompareStore, type CompareItem } from '../../src/store/compare-store';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= IPAD_WIDTH;

  // ── Store data (split selectors to reduce re-renders) ──
  const matrices = useAppStore((s) => s.matrices);
  const setMatrix = useAppStore((s) => s.setMatrix);
  const setDashboardData = useAppStore((s) => s.setDashboardData);
  const quotes = useAppStore((s) => s.quotes);

  // ── Compare store ──
  const compareItems = useCompareStore((s) => s.items);
  const clearAllCompare = useCompareStore((s) => s.clearAll);
  const removeCompareItem = useCompareStore((s) => s.removeItem);

  // ── Compare bottom sheet visibility ──
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);

  // ── Local UI state ──
  const [selectedTicker, setSelectedTicker] = useState<Ticker>('TSLA');
  const [selectedExpiryIdx, setSelectedExpiryIdx] = useState(0);
  const [typeIndex, setTypeIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Auto-fetch if no matrix data for selected ticker
  useEffect(() => {
    if (!matrices[selectedTicker] && !loading) {
      setLoading(true);
      fetchDashboardData(GITHUB_OWNER, GITHUB_REPO)
        .then((data) => {
          setDashboardData(data);
          // Load all matrices
          const allMatrices = (data as Record<string, unknown>)?.options_matrices as Record<string, unknown> | undefined;
          if (allMatrices) {
            for (const [sym, raw] of Object.entries(allMatrices)) {
              const mapped = mapTslaMatrix(raw);
              if (mapped) setMatrix(sym, mapped);
            }
          }
          // Fallback: legacy tsla_matrix
          if (!allMatrices) {
            const raw = (data as Record<string, unknown>)?.tsla_matrix;
            if (raw) {
              const mapped = mapTslaMatrix(raw);
              if (mapped) setMatrix('TSLA', mapped);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [selectedTicker, matrices]);

  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchDashboardData(GITHUB_OWNER, GITHUB_REPO);
      setDashboardData(data);
      const allMatrices = (data as Record<string, unknown>)?.options_matrices as Record<string, unknown> | undefined;
      if (allMatrices) {
        for (const [sym, raw] of Object.entries(allMatrices)) {
          const mapped = mapTslaMatrix(raw);
          if (mapped) setMatrix(sym, mapped);
        }
      }
      if (!allMatrices) {
        const raw = (data as Record<string, unknown>)?.tsla_matrix;
        if (raw) {
          const mapped = mapTslaMatrix(raw);
          if (mapped) setMatrix('TSLA', mapped);
        }
      }
    } catch {
      // silently ignore
    } finally {
      setRefreshing(false);
    }
  }, [setDashboardData, setMatrix]);

  // ── Resolve matrix data for current ticker ──
  const matrix: StrikeComparison | null = matrices[selectedTicker] ?? null;

  const currentPrice = matrix?.price ?? quotes[selectedTicker]?.price ?? 0;

  // ── Derive expiries and strikes ──
  const expiries = matrix?.expiries ?? [];
  const activeExpiry = expiries[selectedExpiryIdx] ?? null;
  const optionType = typeIndex === 0 ? 'puts' : 'calls';
  const strikes: OptionEntry[] = activeExpiry?.[optionType] ?? [];

  // ── Find best strike (highest annualized among good-spread options) ──
  const bestStrike = useMemo(() => {
    if (!strikes || strikes.length === 0) return null;
    try {
      const candidates = strikes.filter(
        (s) => s.spreadQuality === 'Excellent' || s.spreadQuality === 'Good'
      );
      const pool = candidates.length > 0 ? candidates : strikes;
      return pool.reduce((best, cur) =>
        calculateStarRating(cur) > calculateStarRating(best) ? cur : best
      );
    } catch {
      return null;
    }
  }, [strikes]);

  // ── Backtest action ──
  const addToPortfolio = useBacktestStore((s) => s.addToPortfolio);
  const setSimpleInput = useBacktestStore((s) => s.setSimpleInput);

  const handleBacktest = useCallback(
    (entry: OptionEntry) => {
      setSimpleInput({
        symbol: selectedTicker,
        strategy: typeIndex === 0 ? 'sell_put' : 'sell_call',
        otmPct: Math.abs(entry.otmPct ?? 5),
      });
      router.navigate('/(tabs)/backtest');
    },
    [selectedTicker, typeIndex, setSimpleInput, router]
  );

  const handleCompareBacktest = useCallback(() => {
    compareItems.forEach((item) => {
      addToPortfolio({
        symbol: item.symbol,
        strategy: 'sell_put',
        otmPct: 5,
        period: '6mo',
        strike: item.strike,
      });
    });
    clearAllCompare();
    setCompareSheetOpen(false);
    router.navigate('/(tabs)/backtest');
  }, [compareItems, addToPortfolio, clearAllCompare, router]);

  // ── Render helpers ──

  const strategyLabel = typeIndex === 0 ? 'sell_put' : 'sell_call';
  const activeExpiryDate = activeExpiry?.date ?? '';
  const activeDte = activeExpiry?.dte ?? 0;

  const renderStrikeCard = useCallback(
    ({ item }: { item: OptionEntry }) => (
      <View style={isWide ? styles.gridItem : undefined}>
        <StrikeCard
          entry={item}
          currentPrice={currentPrice}
          isBest={bestStrike?.strike === item.strike}
          onBacktest={() => handleBacktest(item)}
          symbol={selectedTicker}
          strategy={strategyLabel}
          expiry={activeExpiryDate}
          dte={activeDte}
          compact={!isWide}
        />
      </View>
    ),
    [currentPrice, bestStrike, isWide, handleBacktest, selectedTicker, strategyLabel, activeExpiryDate, activeDte]
  );

  const keyExtractor = useCallback((item: OptionEntry) => `${item.strike}`, []);

  // ── Empty / Loading state ──
  if (!matrix) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
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
                : `${selectedTicker} matrix coming soon.\nCurrently only TSLA has live options data.\nSelect TSLA to view strike comparison.`}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.accent }]}
              onPress={() => {
                setLoading(true);
                fetchDashboardData(GITHUB_OWNER, GITHUB_REPO)
                  .then((data) => {
                    setDashboardData(data);
                    const m = (data as Record<string, unknown>)?.tsla_matrix;
                    const mapped = mapTslaMatrix(m); if (mapped) setMatrix('TSLA', mapped);
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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      {/* ── Header with glossary link ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textHeading }]}>Options Matrix</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Strike comparison & analysis
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/glossary')}
          activeOpacity={0.7}
          style={styles.glossaryBtn}
        >
          <Ionicons name="help-circle-outline" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Ticker chips ── */}
      <View style={styles.tickerRow}>
        <View style={styles.tickerContent}>
        {TICKERS.map((ticker) => {
          const active = ticker === selectedTicker;
          return (
            <TouchableOpacity
              key={ticker}
              style={[
                styles.tickerChip,
                {
                  backgroundColor: active ? colors.accent : 'transparent',
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}
              onPress={() => {
                setSelectedTicker(ticker);
                setSelectedExpiryIdx(0);
                // Do NOT clear compare list — cross-ticker compare persists
              }}
              activeOpacity={0.7}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.tickerSymbol,
                  { color: active ? '#fff' : colors.textMuted },
                ]}
              >
                {ticker}
              </Text>
            </TouchableOpacity>
          );
        })}
        </View>
      </View>

      {/* ── Selected ticker price row (fixed height to prevent layout shift) ── */}
      <View style={styles.priceRow}>
        <Text style={[styles.priceRowTicker, { color: colors.textHeading }]}>
          {selectedTicker}
        </Text>
        <Text style={[styles.priceRowPrice, { color: colors.textHeading }]}>
          {formatDollar(matrix?.price ?? quotes[selectedTicker]?.price ?? 0)}
        </Text>
      </View>

      {/* ── Expiry tabs ── */}
      {expiries.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.expiryScroll}
          contentContainerStyle={styles.expiryContent}
          scrollEventThrottle={16}
          bounces
        >
          {expiries.map((exp, idx) => {
            const active = idx === selectedExpiryIdx;
            const dte = exp.dte > 0 ? exp.dte : daysUntil(exp.date);
            return (
              <TouchableOpacity
                key={exp.date}
                style={styles.expiryTab}
                onPress={() => {
                  setSelectedExpiryIdx(idx);
                }}
                activeOpacity={0.7}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.expiryDate,
                    { color: active ? colors.gold : colors.textMuted },
                  ]}
                >
                  {formatDate(exp.date)}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.expiryDte,
                    { color: active ? colors.gold : colors.tabInactive },
                  ]}
                >
                  ({dte}d)
                </Text>
                {/* Underline indicator — sits flush at the bottom of the tab */}
                <View
                  style={[
                    styles.expiryUnderline,
                    { backgroundColor: active ? colors.gold : 'transparent' },
                  ]}
                />
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
          contentContainerStyle={[
            styles.listContent,
            compareItems.length > 0 && { paddingBottom: 180 },
          ]}
          numColumns={isWide ? 2 : 1}
          key={isWide ? 'wide' : 'narrow'}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          bounces
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        />
      )}

      {/* ── Floating compare bar (when items > 0) ── */}
      {compareItems.length > 0 && !compareSheetOpen && (
        <TouchableOpacity
          style={[styles.floatingBar, { backgroundColor: colors.accent }]}
          onPress={() => setCompareSheetOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.floatingBarText}>
            Compare ({compareItems.length})
          </Text>
          <Ionicons name="chevron-up" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Compare bottom sheet ── */}
      {compareSheetOpen && compareItems.length > 0 && (
        <View style={[styles.compareSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Sheet header */}
          <View style={styles.compareHeader}>
            <Text style={[styles.compareTitle, { color: colors.textHeading }]}>
              Compare ({compareItems.length})
            </Text>
            <TouchableOpacity onPress={() => setCompareSheetOpen(false)} activeOpacity={0.7}>
              <Ionicons name="chevron-down" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Compared items */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            bounces
            contentContainerStyle={styles.compareScroll}
          >
            {compareItems.map((item) => (
              <View key={`${item.symbol}-${item.strike}`} style={[styles.compareCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.compareCardHeader}>
                  <Text style={[styles.compareSymbol, { color: colors.gold }]}>
                    {item.symbol} {formatDollar(item.strike)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeCompareItem(item.symbol, item.strike)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.compareStat, { color: colors.textMuted }]}>
                  Bid {formatDollar(item.bid)}
                </Text>
                <Text style={[styles.compareStat, { color: colors.textMuted }]}>
                  POP {item.pop.toFixed(1)}%
                </Text>
                <Text style={[styles.compareStat, { color: colors.textMuted }]}>
                  Ann {item.annualized.toFixed(1)}%
                </Text>
                <Text style={[styles.compareStat, { color: colors.textMuted }]}>
                  IV {item.iv.toFixed(1)}%
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.compareActions}>
            <TouchableOpacity
              style={[styles.clearBtn, { borderColor: colors.border }]}
              onPress={() => {
                clearAllCompare();
                setCompareSheetOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.clearBtnText, { color: colors.textMuted }]}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.backtestBtn, { backgroundColor: colors.accent }]}
              onPress={handleCompareBacktest}
              activeOpacity={0.7}
            >
              <Text style={styles.backtestBtnText}>Compare in Backtest {'\u2192'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create<Record<string, any>>({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 4,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  glossaryBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ticker chips
  tickerRow: {
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  tickerContent: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  tickerChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    height: 44,
  },
  tickerSymbol: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Selected ticker price row
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 28,
    marginBottom: 8,
    gap: 6,
  },
  priceRowTicker: {
    fontSize: 13,
    fontWeight: '700',
  },
  priceRowPrice: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceRowChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Expiry tabs
  expiryScroll: {
    marginBottom: 8,
  },
  expiryContent: {
    paddingHorizontal: 16,
    gap: 4,
    paddingVertical: 4,
  },
  expiryTab: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
    minHeight: 52,
  },
  expiryDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  expiryDte: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 4,
  },
  expiryUnderline: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  // Type toggle
  typeToggle: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
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
    paddingBottom: 120, // room for compare bar
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
  // Floating compare bar
  floatingBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  floatingBarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
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
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  compareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  compareTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  compareScroll: {
    gap: 10,
    paddingBottom: 8,
  },
  compareCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minWidth: 120,
  },
  compareCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compareSymbol: {
    fontSize: 13,
    fontWeight: '700',
  },
  compareStat: {
    fontSize: 12,
    marginBottom: 2,
  },
  compareActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  clearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  backtestBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  backtestBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
