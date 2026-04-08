import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBacktestStore } from '../../src/store/backtest-store';
import { useTheme } from '../../src/theme';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useAppStore } from '../../src/store/app-store';
import { fetchDashboardData } from '../../src/data/github-api';
import { GITHUB_OWNER, GITHUB_REPO } from '../../src/utils/constants';
import { formatDollar, formatPct, formatStrategy } from '../../src/utils/format';
import { mapTslaMatrix } from '../../src/data/mappers';
import { probabilityOfProfit } from '../../src/engine/pop';
import { SparkLine } from '../../src/components/charts/SparkLine';
import { StockChart } from '../../src/components/charts/StockChart';
import { TickerTape } from '../../src/components/charts/TickerTape';
import { Card } from '../../src/components/ui/Card';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { TabPage } from '../../src/components/ui/TabPage';
import { UpgradePrompt } from '../../src/components/ui/UpgradePrompt';
import { PoweredByDappGo } from '../../src/components/ui/PoweredByDappGo';
import { AppVersion } from '../../src/components/ui/AppVersion';
import { LastUpdated } from '../../src/components/ui/LastUpdated';
import { DashboardSkeleton } from '../../src/components/ui/Skeleton';
import { FadeIn } from '../../src/components/ui/FadeIn';
import { WelcomeCard } from '../../src/components/onboarding/WelcomeCard';
import { lightHaptic } from '../../src/utils/haptics';
import { useWatchlistStore } from '../../src/store/watchlist-store';
import { useT } from '../../src/utils/i18n';
import type { WatchlistItem } from '../../src/store/watchlist-store';
import type { TickerVerdict } from '../../src/utils/types';

// ── Refresh Banner ──

function RefreshBanner({ visible, label }: { visible: boolean; label: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.refreshBanner, { opacity }]}>
      <Text style={styles.refreshBannerText}>{'\u2713'} {label}</Text>
    </Animated.View>
  );
}

// ── Market Status Helper ──

function getMarketStatus(): { label: string; isOpen: boolean } {
  const now = new Date();
  const etOffset = -5; // ET is UTC-5 (EST); for simplicity we ignore DST
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const etHour = (utcHour + etOffset + 24) % 24;
  const etMin = utcMin;
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  const isWeekday = day >= 1 && day <= 5;
  const minutesSinceMidnight = etHour * 60 + etMin;
  const marketOpen = 9 * 60 + 30; // 9:30
  const marketClose = 16 * 60; // 16:00
  const isOpen = isWeekday && minutesSinceMidnight >= marketOpen && minutesSinceMidnight < marketClose;
  return { label: isOpen ? 'Open' : 'Closed', isOpen };
}

// ── Timing Data Types ──

interface TimingEntry {
  action: string;
  combined_score: number;
  overall_recommendation: string;
  wait_until?: string;
}

const TIMING_ACTION_COLORS: Record<string, { emoji: string; color: string }> = {
  SELL_NOW: { emoji: '\uD83D\uDFE2', color: '#2dd4a8' },
  BUY_NOW: { emoji: '\uD83D\uDD35', color: '#5b6cf7' },
  WAIT: { emoji: '\uD83D\uDFE1', color: '#e8b84b' },
  NEUTRAL: { emoji: '\u26AA', color: '#6b7084' },
};

// ── Type helpers for dashboard JSON ──

interface LivePrice {
  symbol: string;
  price: number;
  change_pct: number;
  market_state?: string;
  intraday_prices?: number[];
}

interface TopPick {
  symbol: string;
  strategy: string;
  strike: number;
  premium: number;
  pop: number | null;
  annualized: number;
  expiry?: string;
  dte?: number;
}

// ── Memoized Price Card ──

const PriceCard = React.memo(function PriceCard({
  item,
  colors,
  isDark,
}: {
  item: LivePrice;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  const isPositive = item.change_pct >= 0;
  const changeColor = isPositive ? colors.positive : colors.negative;
  const arrow = isPositive ? '\u25B2' : '\u25BC';

  return (
    <View
      style={[
        styles.priceCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 0.5,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: isDark ? 4 : 2 },
              shadowOpacity: isDark ? 0.25 : 0.08,
              shadowRadius: isDark ? 12 : 6,
            },
            android: { elevation: isDark ? 8 : 3 },
          }),
        },
      ]}
    >
      <View style={styles.priceCardHeader}>
        <Text style={[styles.priceSymbol, { color: colors.gold }]}>
          {item.symbol}
        </Text>
        {item.market_state && (
          <Text style={[styles.marketState, { color: colors.textMuted }]}>
            {item.market_state}
          </Text>
        )}
      </View>

      <Text style={[styles.priceValue, { color: colors.textHeading }]}>
        {formatDollar(item.price)}
      </Text>

      <Text style={[styles.priceChange, { color: changeColor }]}>
        {arrow} {formatPct(item.change_pct)}
      </Text>

      {item.intraday_prices && item.intraday_prices.length >= 2 && (
        <View style={styles.sparkContainer}>
          <SparkLine
            prices={item.intraday_prices}
            color={changeColor}
            width={120}
            height={36}
          />
        </View>
      )}
    </View>
  );
});

// ── DTE helper ──

function calcDte(expiry: string): number | null {
  if (!expiry) return null;
  const expiryDate = new Date(expiry);
  if (isNaN(expiryDate.getTime())) return null;
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

// ── Memoized Watchlist Card ──

const WatchlistCard = React.memo(function WatchlistCard({
  item,
  colors,
  onPress,
  onRemove,
  onBacktest,
}: {
  item: WatchlistItem;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
  onRemove: () => void;
  onBacktest: () => void;
}) {
  const dte = calcDte(item.expiry);

  return (
    <TouchableOpacity
      style={[
        styles.watchlistCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Remove button */}
      <TouchableOpacity
        onPress={onRemove}
        activeOpacity={0.7}
        style={styles.watchlistRemoveBtn}
        hitSlop={8}
      >
        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Text style={[styles.watchlistSymbol, { color: colors.gold }]}>
        {item.symbol}
      </Text>
      <Text style={[styles.watchlistStrategy, { color: colors.accent }]}>
        {formatStrategy(item.strategy)}
      </Text>
      <Text style={[styles.watchlistStrike, { color: colors.textHeading }]}>
        {formatDollar(item.strike)}
      </Text>
      {item.expiry ? (
        <Text style={[styles.watchlistExpiry, { color: colors.textMuted }]}>
          {item.expiry}{dte != null ? ` (${dte}d)` : ''}
        </Text>
      ) : null}

      {/* Backtest quick action */}
      <TouchableOpacity
        onPress={onBacktest}
        activeOpacity={0.7}
        style={[styles.watchlistBacktestBtn, { borderColor: colors.accent }]}
      >
        <Text style={[styles.watchlistBacktestText, { color: colors.accent }]}>Backtest</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// ── Main Screen ──

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const t = useT();
  const backtestSetSimpleInput = useBacktestStore((s) => s.setSimpleInput);
  const backtestSetMode = useBacktestStore((s) => s.setMode);
  const backtestSetPendingAutoRun = useBacktestStore((s) => s.setPendingAutoRun);

  // Watchlist - split selectors to reduce re-renders
  const watchlistItems = useWatchlistStore((s) => s.items);
  const clearWatchlist = useWatchlistStore((s) => s.clearAll);
  const removeWatchlistByKey = useWatchlistStore((s) => s.removeByKey);

  // Split store selectors for granular re-renders
  const dashboardData = useAppStore((s) => s.dashboardData);
  const isLoadingDashboard = useAppStore((s) => s.isLoadingDashboard);
  const setDashboardData = useAppStore((s) => s.setDashboardData);
  const setLoading = useAppStore((s) => s.setLoading);
  const setNetworkStatus = useAppStore((s) => s.setNetworkStatus);
  const setMatrix = useAppStore((s) => s.setMatrix);

  const [error, setError] = useState<string | null>(null);
  const [showRefreshBanner, setShowRefreshBanner] = useState(false);
  const [chartTicker, setChartTicker] = useState<string>('TSLA');
  const refreshBannerKey = useRef(0);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading('isLoadingDashboard', true);
      const data = await fetchDashboardData(GITHUB_OWNER, GITHUB_REPO);
      setDashboardData(data);
      setNetworkStatus('online');
      // Store all options matrices
      const allMatrices = (data as Record<string, unknown>)?.options_matrices as Record<string, unknown> | undefined;
      if (allMatrices) {
        for (const [sym, raw] of Object.entries(allMatrices)) {
          const mapped = mapTslaMatrix(raw);
          if (mapped) setMatrix(sym, mapped);
        }
      }
      // Fallback: legacy tsla_matrix field
      if (!allMatrices) {
        const rawMatrix = (data as Record<string, unknown>)?.tsla_matrix;
        if (rawMatrix) {
          const mapped = mapTslaMatrix(rawMatrix);
          if (mapped) setMatrix('TSLA', mapped);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load dashboard data';
      setError(msg);
      setNetworkStatus('offline');
    } finally {
      setLoading('isLoadingDashboard', false);
    }
  }, [setDashboardData, setMatrix, setLoading, setNetworkStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    await loadData();
    // Show success banner briefly
    setShowRefreshBanner(false);
    refreshBannerKey.current += 1;
    requestAnimationFrame(() => setShowRefreshBanner(true));
    setTimeout(() => setShowRefreshBanner(false), 2200);
  }, [loadData]);

  // ── Parse dashboard data (memoized) ──
  const dd = dashboardData as Record<string, unknown> | null;

  const livePrices: LivePrice[] = useMemo(
    () => (dd?.live_prices as LivePrice[]) ?? [],
    [dd],
  );

  // Top picks from strike_comparison - memoized
  const topPicks: TopPick[] = useMemo(() => {
    const rawStrikes = (dd?.strike_comparison as Record<string, unknown>[]) ?? [];
    return rawStrikes.slice(0, 4).map((s: any) => {
      const symbol: string = s.symbol ?? '';
      const strike: number = s.strike ?? 0;
      const dte: number = s.dte ?? 0;
      const iv: number = s.iv ?? 30;
      const strategy: string = s.strategy ?? 'sell_put';
      const livePrice = livePrices.find((lp) => lp.symbol === symbol)?.price;
      const optionType: 'put' | 'call' = strategy.includes('call') ? 'call' : 'put';
      const pop = livePrice != null && strike > 0 && dte > 0
        ? probabilityOfProfit(strike, livePrice, dte, iv, optionType)
        : null;
      return {
        symbol,
        strategy,
        strike,
        premium: s.premium ?? 0,
        pop,
        annualized: s.annualized ?? 0,
        expiry: s.expiry ?? '',
        dte,
      };
    });
  }, [dd, livePrices]);

  // Timing data from dashboard
  const timingData: Record<string, TimingEntry> = useMemo(
    () => (dd?.timing as Record<string, TimingEntry>) ?? {},
    [dd],
  );
  const timingTickers = useMemo(() => Object.keys(timingData), [timingData]);

  // Market status
  const marketStatus = useMemo(() => getMarketStatus(), []);

  // Reports count
  const reportsCount = useAppStore((s) => Object.keys(s.reports).length);

  // ── Ticker tape data (memoized to avoid re-creating on every render) ──
  const tickerTapeData = useMemo(
    () => livePrices.map((lp) => ({
      symbol: lp.symbol,
      price: lp.price,
      changePct: lp.change_pct,
    })),
    [livePrices],
  );

  // ── Stable keyExtractors and renderItem callbacks ──
  const priceKeyExtractor = useCallback((item: LivePrice) => item.symbol, []);

  const renderPriceCard = useCallback(
    ({ item }: { item: LivePrice }) => <PriceCard item={item} colors={colors} isDark={isDark} />,
    [colors, isDark],
  );

  const watchlistKeyExtractor = useCallback(
    (item: WatchlistItem, idx: number) => `${item.symbol}-${item.strike}-${idx}`,
    [],
  );

  const navigateToMatrix = useCallback(() => {
    router.navigate('/(tabs)/matrix');
  }, [router]);

  const renderWatchlistCard = useCallback(
    ({ item }: { item: WatchlistItem }) => (
      <WatchlistCard
        item={item}
        colors={colors}
        onPress={navigateToMatrix}
        onRemove={() => removeWatchlistByKey(item.symbol, item.strike)}
        onBacktest={() => {
          const strategyKey = item.strategy.toLowerCase().replace(/[\s-]+/g, '_');
          const validStrategies = ['sell_put', 'sell_call', 'iron_condor', 'bull_put_spread', 'bear_call_spread'] as const;
          const strategy = validStrategies.find((s) => strategyKey.includes(s)) ?? 'sell_put';
          backtestSetMode('simple');
          backtestSetSimpleInput({
            symbol: item.symbol,
            strategy,
            period: '6mo',
          });
          backtestSetPendingAutoRun(true);
          lightHaptic();
          router.navigate('/(tabs)/backtest');
        }}
      />
    ),
    [colors, navigateToMatrix, removeWatchlistByKey, backtestSetMode, backtestSetSimpleInput, backtestSetPendingAutoRun, router],
  );

  const topPickKeyExtractor = useCallback(
    (pick: TopPick, idx: number) => `${pick.symbol}-${pick.strike}-${idx}`,
    [],
  );

  const renderTopPick = useCallback(
    ({ item: pick, index: idx }: { item: TopPick; index: number }) => (
      <View
        style={[
          styles.pickCard,
          {
            backgroundColor: colors.card,
            borderColor: idx === 0 ? colors.gold : colors.border,
            borderWidth: idx === 0 ? 2 : 1,
          },
        ]}
      >
        {idx === 0 && (
          <View style={[styles.pickBestBadge, { backgroundColor: colors.gold }]}>
            <Text style={styles.pickBestBadgeText}>#1 PICK</Text>
          </View>
        )}

        <View style={styles.pickHeader}>
          <Text style={[styles.pickSymbol, { color: colors.gold }]}>
            {pick.symbol}
          </Text>
          <Text style={[styles.pickStrategy, { color: colors.accent }]}>
            {formatStrategy(pick.strategy)}
          </Text>
        </View>

        <View style={styles.pickGrid}>
          <View style={styles.pickCell}>
            <Text style={[styles.pickLabel, { color: colors.textMuted }]}>Strike</Text>
            <Text style={[styles.pickNum, { color: colors.textHeading }]}>
              {formatDollar(pick.strike)}
            </Text>
          </View>
          <View style={styles.pickCell}>
            <Text style={[styles.pickLabel, { color: colors.textMuted }]}>Premium</Text>
            <Text style={[styles.pickNum, { color: colors.positive }]}>
              {formatDollar(pick.premium)}
            </Text>
          </View>
          <View style={styles.pickCell}>
            <Text style={[styles.pickLabel, { color: colors.textMuted }]}>POP</Text>
            <Text style={[styles.pickNum, { color: colors.textHeading }]}>
              {pick.pop != null ? formatPct(pick.pop, 0) : 'N/A'}
            </Text>
          </View>
          <View style={styles.pickCell}>
            <Text style={[styles.pickLabel, { color: colors.textMuted }]}>Ann.</Text>
            <Text style={[styles.pickNum, { color: colors.positive }]}>
              {formatPct(pick.annualized, 1)}
            </Text>
          </View>
        </View>

        {pick.expiry && (
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
            Exp: {pick.expiry}{pick.dte != null ? ` (${pick.dte}d)` : ''}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.backtestBtn, { borderColor: colors.accent }]}
          activeOpacity={0.7}
          onPress={() => {
            const strategyKey = pick.strategy.toLowerCase().replace(/[\s-]+/g, '_');
            const validStrategies = ['sell_put', 'sell_call', 'iron_condor', 'bull_put_spread', 'bear_call_spread'] as const;
            const strategy = validStrategies.find((s) => strategyKey.includes(s)) ?? 'sell_put';

            backtestSetMode('simple');
            backtestSetSimpleInput({
              symbol: pick.symbol,
              strategy,
              period: '6mo',
            });
            backtestSetPendingAutoRun(true);
            lightHaptic();
            router.navigate('/(tabs)/backtest');
          }}
        >
          <Text style={[styles.backtestBtnText, { color: colors.accent }]}>
            Backtest
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [colors, backtestSetMode, backtestSetSimpleInput, backtestSetPendingAutoRun, router],
  );

  // ── Loading state with skeleton ──
  if (isLoadingDashboard && !dashboardData) {
    return (
      <TabPage title={t('dashboard.title')} subtitle={t('dashboard.loading')}>
        <DashboardSkeleton />
      </TabPage>
    );
  }

  // ── Error / empty state ──
  if ((error || !dashboardData) && !isLoadingDashboard) {
    return (
      <TabPage title={t('dashboard.title')} onRefresh={loadData}>
        <View style={[styles.welcomeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.welcomeTitle, { color: colors.gold }]}>
            {t('dashboard.welcome')}
          </Text>
          <Text style={[styles.welcomeBody, { color: colors.textMuted }]}>
            {t('dashboard.pullDown')}
          </Text>
          {error && (
            <Text style={[styles.welcomeError, { color: colors.negative }]}>
              {error}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.accent }]}
            onPress={loadData}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>{t('dashboard.loadData')}</Text>
          </TouchableOpacity>
        </View>
      </TabPage>
    );
  }

  return (
    <TabPage
      title={t('dashboard.title')}
      subtitle={t('dashboard.subtitle')}
      onRefresh={onRefresh}
      headerRight={
        <TouchableOpacity
          onPress={() => router.push('/glossary')}
          activeOpacity={0.7}
          style={{ padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="help-circle-outline" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      }
    >
      {/* ── Refresh Success Banner ── */}
      <RefreshBanner key={refreshBannerKey.current} visible={showRefreshBanner} label={t('dashboard.dataUpdated')} />

      {/* ── Last Updated ── */}
      <View style={{ marginBottom: spacing.lg }}>
        <LastUpdated />
      </View>

      {/* ── Ticker Tape ── */}
      {livePrices.length > 0 && (
        <TickerTape
          prices={tickerTapeData}
          backgroundColor={colors.backgroundAlt}
          textColor={colors.text}
          textMutedColor={colors.textMuted}
        />
      )}

      {/* ── Live Price Cards ── */}
      {livePrices.length > 0 && (
        <FadeIn>
          <View style={styles.section}>
            <SectionHeader title={t('dashboard.livePrices')} />
            <FlatList
              data={livePrices}
              renderItem={renderPriceCard}
              keyExtractor={priceKeyExtractor}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.priceListContent}
              scrollEventThrottle={16}
              bounces
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              removeClippedSubviews={Platform.OS !== 'web'}
            />
          </View>
        </FadeIn>
      )}

      {/* ── Stock Chart Section ── */}
      {livePrices.length > 0 && (
        <FadeIn delay={100}>
          <View style={styles.section}>
            <SectionHeader title={`\uD83D\uDCC8 ${t('dashboard.chart')}`} />
            {/* Ticker selector pills */}
            <View style={styles.chartTickerRow}>
              {livePrices.map((lp) => (
                <TouchableOpacity
                  key={lp.symbol}
                  style={[
                    styles.chartTickerPill,
                    {
                      backgroundColor: chartTicker === lp.symbol ? colors.accent : colors.backgroundAlt,
                      borderColor: chartTicker === lp.symbol ? colors.accent : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setChartTicker(lp.symbol)}
                >
                  <Text
                    style={[
                      styles.chartTickerText,
                      { color: chartTicker === lp.symbol ? '#fff' : colors.textMuted },
                    ]}
                  >
                    {lp.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Chart */}
            {(() => {
              const selected = livePrices.find((lp) => lp.symbol === chartTicker) ?? livePrices[0];
              if (!selected) return null;
              const isPos = selected.change_pct >= 0;
              return (
                <StockChart
                  symbol={selected.symbol}
                  currentPrice={selected.price}
                  intradayPrices={selected.intraday_prices}
                  color={isPos ? colors.positive : colors.negative}
                  height={280}
                />
              );
            })()}
          </View>
        </FadeIn>
      )}

      {/* ── Quick Stats Row ── */}
      <View style={styles.quickStatsRow}>
        <Text style={[styles.quickStatText, { color: colors.textMuted }]}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        <Text style={[styles.quickStatDot, { color: colors.border }]}>{'\u00B7'}</Text>
        <Text style={[styles.quickStatText, { color: marketStatus.isOpen ? colors.positive : colors.textMuted }]}>
          Market {marketStatus.isOpen ? t('dashboard.marketOpen') : t('dashboard.marketClosed')}
        </Text>
        <Text style={[styles.quickStatDot, { color: colors.border }]}>{'\u00B7'}</Text>
        <Text style={[styles.quickStatText, { color: colors.textMuted }]}>
          {reportsCount} {t('reports.count')}
        </Text>
      </View>

      {/* ── Market Summary ── */}
      {dd && (
        <View style={styles.section}>
          <SectionHeader title={t('dashboard.marketSummary')} />
          <Card>
            {dd.summary != null ? (() => {
              const s = dd.summary as Record<string, number>;
              return (
                <View>
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: colors.gold }]}>{s.total_trades ?? 0}</Text>
                      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Trades</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: (s.win_rate ?? 0) >= 60 ? colors.positive : colors.negative }]}>
                        {(s.win_rate ?? 0).toFixed(1)}%
                      </Text>
                      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Win Rate</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: (s.sharpe_ratio ?? 0) >= 0 ? colors.positive : colors.negative }]}>
                        {(s.sharpe_ratio ?? 0).toFixed(2)}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Sharpe</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: (s.profit_factor ?? 0) >= 1 ? colors.positive : colors.negative }]}>
                        {(s.profit_factor ?? 0).toFixed(2)}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>P. Factor</Text>
                    </View>
                  </View>

                  {/* Ticker stats */}
                  {dd.ticker_stats != null ? (
                    <View style={[styles.tickerVerdicts, { borderTopColor: colors.border }]}>
                      {Object.entries(dd.ticker_stats as Record<string, any>).map(([sym, ts]) => (
                        <View key={sym} style={styles.tickerRow}>
                          <Text style={[styles.tickerSymbol, { color: colors.gold }]}>{sym}</Text>
                          <Text style={[styles.tickerIv, { color: (ts.win_rate ?? 0) >= 60 ? colors.positive : colors.textMuted }]}>
                            WR {(ts.win_rate ?? 0).toFixed(0)}%
                          </Text>
                          <Text style={[styles.tickerDir, { color: colors.textMuted }]}>
                            {ts.trades ?? 0} trades
                          </Text>
                          <Text style={[styles.tickerVerdict, { color: (ts.total_pnl ?? 0) >= 0 ? colors.positive : colors.negative }]}>
                            {formatDollar(ts.total_pnl ?? 0)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })() : null}
          </Card>
        </View>
      )}

      {/* ── Best Time to Trade ── */}
      {timingTickers.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={`\u23F0 ${t('dashboard.bestTime')}`} />
          <Card>
            {timingTickers.map((ticker, idx) => {
              const entry = timingData[ticker];
              const actionStyle = TIMING_ACTION_COLORS[entry.action] ?? TIMING_ACTION_COLORS.NEUTRAL;
              return (
                <View key={ticker}>
                  {idx > 0 && <View style={[styles.timingDivider, { backgroundColor: colors.border }]} />}
                  <View style={styles.timingRow}>
                    <Text style={[styles.timingTicker, { color: colors.gold }]}>{ticker}</Text>
                    <Text style={{ fontSize: 13 }}>{actionStyle.emoji}</Text>
                    <Text style={[styles.timingAction, { color: actionStyle.color }]}>
                      {entry.action.replace('_', ' ')}
                    </Text>
                    <Text style={[styles.timingRec, { color: colors.textMuted }]} numberOfLines={1}>
                      {entry.overall_recommendation}
                    </Text>
                    <Text style={[styles.timingScore, { color: colors.textMuted }]}>
                      ({entry.combined_score})
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      )}

      {/* ── Watchlist ── */}
      <View style={styles.section}>
        <SectionHeader
          title={`\u2764\uFE0F Watchlist${watchlistItems.length > 0 ? ` (${watchlistItems.length})` : ''}`}
          action={watchlistItems.length > 0 ? { label: 'Clear All', onPress: clearWatchlist } : undefined}
        />
        {watchlistItems.length > 0 ? (
          <FlatList
            data={watchlistItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.watchlistList}
            keyExtractor={watchlistKeyExtractor}
            renderItem={renderWatchlistCard}
            scrollEventThrottle={16}
            bounces
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            removeClippedSubviews={Platform.OS !== 'web'}
          />
        ) : (
          <Card>
            <View style={styles.watchlistEmpty}>
              <Text style={[styles.watchlistEmptyText, { color: colors.textMuted }]}>
                Tap {'\u2764\uFE0F'} on any strike in Matrix to save it here
              </Text>
            </View>
          </Card>
        )}
      </View>

      {/* ── Today's Top Picks ── */}
      {topPicks.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Today's Top Picks" />
          <FlatList
            data={topPicks}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={288}
            decelerationRate="fast"
            contentContainerStyle={styles.pickCarouselContent}
            keyExtractor={topPickKeyExtractor}
            renderItem={renderTopPick}
            scrollEventThrottle={16}
            bounces
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            removeClippedSubviews={Platform.OS !== 'web'}
          />
        </View>
      )}

      {/* ── Upgrade Prompt ── */}
      <FadeIn delay={300}>
        <UpgradePrompt />
      </FadeIn>

      {/* ── Footer branding ── */}
      <PoweredByDappGo />
      <AppVersion />

      {/* ── Onboarding overlay ── */}
      <WelcomeCard />
    </TabPage>
  );
}

// ── Styles ──

const styles = StyleSheet.create<Record<string, any>>({
  // Refresh banner
  refreshBanner: {
    backgroundColor: '#2dd4a820',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#2dd4a840',
  },
  refreshBannerText: {
    color: '#2dd4a8',
    fontSize: 14,
    fontWeight: '600',
  },

  // Quick stats row
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  quickStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickStatDot: {
    fontSize: 14,
    marginHorizontal: 8,
  },

  // Timing section
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: 6,
  },
  timingDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  timingTicker: {
    fontSize: 13,
    fontWeight: '700',
    width: 44,
  },
  timingAction: {
    fontSize: 12,
    fontWeight: '700',
    width: 64,
  },
  timingRec: {
    flex: 1,
    fontSize: 12,
  },
  timingScore: {
    fontSize: 11,
    fontWeight: '500',
  },

  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  welcomeCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  welcomeBody: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  welcomeError: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },

  // Price cards (horizontal)
  priceListContent: {
    paddingRight: spacing.lg,
    paddingVertical: spacing.xs,
  },
  priceCard: {
    width: 160,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
  },
  priceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priceSymbol: {
    ...typography.label,
    letterSpacing: 1.5,
  },
  marketState: {
    ...typography.small,
    textTransform: 'uppercase',
  },
  priceValue: {
    ...typography.monoHero,
    marginBottom: 2,
  },
  priceChange: {
    ...typography.mono,
    fontWeight: '600',
  },
  sparkContainer: {
    marginTop: spacing.xs,
    alignItems: 'center',
  },

  // Model verdict
  tickerVerdicts: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  tickerSymbol: {
    width: 52,
    fontWeight: '700',
    fontSize: 13,
  },
  tickerIv: {
    width: 60,
    fontSize: 12,
    fontWeight: '600',
  },
  tickerDir: {
    width: 56,
    fontSize: 12,
  },
  tickerVerdict: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },

  // Summary grid
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    ...typography.monoLarge,
  },
  summaryLabel: {
    ...typography.label,
    marginTop: 2,
  },

  // Watchlist
  watchlistList: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  watchlistCard: {
    width: 160,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    position: 'relative' as const,
  },
  watchlistRemoveBtn: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    zIndex: 1,
    padding: 2,
  },
  watchlistBacktestBtn: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: 'center' as const,
  },
  watchlistBacktestText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  watchlistEmpty: {
    paddingVertical: spacing.lg,
    alignItems: 'center' as const,
  },
  watchlistEmptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  watchlistSymbol: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  watchlistStrategy: {
    ...typography.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  watchlistStrike: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  watchlistExpiry: {
    ...typography.small,
    marginTop: 2,
  },

  // Chart section
  chartTickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  chartTickerPill: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTickerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // Top picks carousel
  pickCarouselContent: {
    paddingRight: spacing.lg,
    paddingVertical: spacing.xs,
  },
  pickCard: {
    width: 280,
    padding: spacing.md,
    paddingTop: spacing.xl,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
  },
  pickBestBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    borderTopLeftRadius: borderRadius.lg - 1,
    borderTopRightRadius: borderRadius.lg - 1,
    alignItems: 'center',
  },
  pickBestBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 1,
  },
  pickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pickSymbol: {
    ...typography.h3,
    fontWeight: '700',
  },
  pickStrategy: {
    ...typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pickCell: {
    width: '50%',
    paddingVertical: spacing.xs,
  },
  pickLabel: {
    ...typography.label,
    marginBottom: 2,
  },
  pickNum: {
    ...typography.monoLarge,
  },

  // Quick backtest button
  backtestBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  backtestBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
