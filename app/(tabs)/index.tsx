import React, { useEffect, useCallback, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Card } from '../../src/components/ui/Card';
import { UpgradePrompt } from '../../src/components/ui/UpgradePrompt';
import { PoweredByDappGo } from '../../src/components/ui/PoweredByDappGo';
import { FadeIn } from '../../src/components/ui/FadeIn';
import { WelcomeCard } from '../../src/components/onboarding/WelcomeCard';
import { lightHaptic } from '../../src/utils/haptics';
import type { TickerVerdict } from '../../src/utils/types';

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
  pop: number | null; // null when live price unavailable
  annualized: number;
  expiry?: string;
  dte?: number;
}

interface DashboardVerdict {
  regime?: { name: string; vix?: number; hv20?: number; positionSize?: number; strategies?: string[] };
  tickers?: TickerVerdict[];
  overallConclusion?: string;
}

// ── Regime color mapping ──

function regimeEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('low')) return '\u{1F7E2}';   // green circle
  if (n.includes('moderate') || n.includes('normal')) return '\u{1F7E1}'; // yellow
  if (n.includes('elevated')) return '\u{1F7E0}'; // orange
  return '\u{1F534}'; // red
}

function ivSignalColor(signal: string, positive: string, negative: string, muted: string): string {
  const s = signal.toLowerCase();
  if (s.includes('high') || s.includes('rich')) return negative;
  if (s.includes('low') || s.includes('cheap')) return positive;
  return muted;
}

// ── Main Screen ──

export default function DashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    dashboardData,
    isLoadingDashboard,
    setDashboardData,
    setLoading,
  } = useAppStore();

  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const setMatrix = useAppStore((s) => s.setMatrix);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading('isLoadingDashboard', true);
      const data = await fetchDashboardData(GITHUB_OWNER, GITHUB_REPO);
      setDashboardData(data);
      // Store all options matrices (TSLA, AMZN, NVDA)
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
    } finally {
      setLoading('isLoadingDashboard', false);
    }
  }, [setDashboardData, setMatrix, setLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ── Parse dashboard data ──
  const dd = dashboardData as Record<string, unknown> | null;

  const livePrices: LivePrice[] = (dd?.live_prices as LivePrice[]) ?? [];

  // Build verdict from tsla_matrix or summary data (model_verdict not in data.json)
  const verdict: DashboardVerdict | null = dd?.tsla_matrix
    ? { regime: { name: 'Active', vix: undefined, hv20: undefined, positionSize: undefined, strategies: [] } }
    : null;

  // Top picks from strike_comparison (map fields to match TopPick interface)
  // POP is calculated locally since strike_comparison doesn't include it
  const rawStrikes = (dd?.strike_comparison as Record<string, unknown>[]) ?? [];
  const topPicks: TopPick[] = rawStrikes.slice(0, 4).map((s: any) => {
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

  // ── Loading state ──

  if (isLoadingDashboard && !dashboardData) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Loading market data...
        </Text>
      </View>
    );
  }

  // ── Error / empty state — show welcome card ──

  if ((error || !dashboardData) && !isLoadingDashboard) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.centered, { paddingTop: insets.top + 8 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={[styles.welcomeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.welcomeTitle, { color: colors.gold }]}>
            Welcome to DappGo Options
          </Text>
          <Text style={[styles.welcomeBody, { color: colors.textMuted }]}>
            Pull down to load market data
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
            <Text style={styles.retryText}>Load Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Price Card ──

  const renderPriceCard = ({ item }: { item: LivePrice }) => {
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
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
              },
              android: { elevation: 3 },
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
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 8 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <Text style={[typography.h1, { color: colors.textHeading, marginBottom: spacing.xs }]}>
        Dashboard
      </Text>
      <Text style={[typography.bodySmall, { color: colors.textMuted, marginBottom: spacing.lg }]}>
        Live market data & model verdict
      </Text>

      {/* ── Live Price Cards ── */}
      {livePrices.length > 0 && (
        <FadeIn>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textHeading }]}>
              Live Prices
            </Text>
            <FlatList
              data={livePrices}
              renderItem={renderPriceCard}
              keyExtractor={(item) => item.symbol}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.priceListContent}
            />
          </View>
        </FadeIn>
      )}

      {/* ── Market Summary ── */}
      {dd && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textHeading }]}>
            Market Summary
          </Text>
          <Card>
            {/* Backtest stats from summary */}
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

      {/* ── Today's Top Picks ── */}
      {topPicks.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textHeading }]}>
            Today's Top Picks
          </Text>
          {topPicks.map((pick, idx) => (
            <Card key={`${pick.symbol}-${pick.strike}-${idx}`}>
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
                  <Text style={[styles.pickLabel, { color: colors.textMuted }]}>Ann. Return</Text>
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
            </Card>
          ))}
        </View>
      )}

      {/* ── Upgrade Prompt ── */}
      <FadeIn delay={300}>
        <UpgradePrompt />
      </FadeIn>

      {/* ── Footer branding ── */}
      <PoweredByDappGo />

      {/* Bottom spacer for tab bar */}
      <View style={{ height: spacing.xxxl }} />

      {/* ── Onboarding overlay ── */}
      <WelcomeCard />
    </ScrollView>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorEmoji: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ff5252',
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
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
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  priceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priceSymbol: {
    ...typography.h3,
    fontWeight: '700',
  },
  marketState: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  priceChange: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  sparkContainer: {
    marginTop: spacing.xs,
    alignItems: 'center',
  },

  // Model verdict
  regimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  regimeEmoji: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  regimeInfo: {
    flex: 1,
  },
  regimeName: {
    ...typography.h3,
    fontWeight: '700',
  },
  regimeMeta: {
    flexDirection: 'row',
    marginTop: 2,
  },
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
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Top picks
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
    ...typography.caption,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickNum: {
    fontSize: 16,
    fontWeight: '700',
  },
});
