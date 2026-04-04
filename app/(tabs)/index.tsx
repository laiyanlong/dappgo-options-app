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
import { useTheme } from '../../src/theme';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useAppStore } from '../../src/store/app-store';
import { fetchDashboardData } from '../../src/data/github-api';
import { GITHUB_OWNER, GITHUB_REPO } from '../../src/utils/constants';
import { formatDollar, formatPct } from '../../src/utils/format';
import { SparkLine } from '../../src/components/charts/SparkLine';
import { Card } from '../../src/components/ui/Card';
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
  pop: number;
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
  const {
    dashboardData,
    isLoadingDashboard,
    setDashboardData,
    setLoading,
  } = useAppStore();

  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading('isLoadingDashboard', true);
      const data = await fetchDashboardData(GITHUB_OWNER, GITHUB_REPO);
      setDashboardData(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load dashboard data';
      setError(msg);
    } finally {
      setLoading('isLoadingDashboard', false);
    }
  }, [setDashboardData, setLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ── Parse dashboard data ──

  const livePrices: LivePrice[] = (dashboardData as Record<string, unknown>)?.live_prices as LivePrice[] ?? [];
  const verdict: DashboardVerdict | null =
    ((dashboardData as Record<string, unknown>)?.model_verdict as DashboardVerdict) ??
    ((dashboardData as Record<string, unknown>)?.tsla_matrix ? { regime: { name: 'Unknown' } } : null);
  const topPicks: TopPick[] = (dashboardData as Record<string, unknown>)?.top_picks as TopPick[] ??
    ((dashboardData as Record<string, unknown>)?.strike_comparison as TopPick[] ?? []).slice(0, 3);

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

  // ── Error state ──

  if (error && !dashboardData) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorEmoji]}>!</Text>
        <Text style={[styles.errorText, { color: colors.negative }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
          onPress={loadData}
          activeOpacity={0.7}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
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
      contentContainerStyle={styles.contentContainer}
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
      )}

      {/* ── Model Verdict Banner ── */}
      {verdict && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textHeading }]}>
            Model Verdict
          </Text>
          <Card>
            {/* Regime header row */}
            {verdict.regime && (
              <View style={styles.regimeRow}>
                <Text style={[styles.regimeEmoji]}>
                  {regimeEmoji(verdict.regime.name)}
                </Text>
                <View style={styles.regimeInfo}>
                  <Text style={[styles.regimeName, { color: colors.gold }]}>
                    {verdict.regime.name.toUpperCase()}
                  </Text>
                  <View style={styles.regimeMeta}>
                    {verdict.regime.vix != null && (
                      <Text style={[typography.bodySmall, { color: colors.textMuted }]}>
                        VIX: {String(verdict?.regime?.vix ?? "N/A")}
                      </Text>
                    )}
                    {verdict.regime.positionSize != null && (
                      <Text style={[typography.bodySmall, { color: colors.textMuted, marginLeft: spacing.md }]}>
                        Position: {verdict.regime.positionSize}%
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Ticker verdicts */}
            {verdict.tickers && verdict.tickers.length > 0 && (
              <View style={[styles.tickerVerdicts, { borderTopColor: colors.border }]}>
                {verdict.tickers.map((t) => (
                  <View key={t.symbol} style={styles.tickerRow}>
                    <Text style={[styles.tickerSymbol, { color: colors.textHeading }]}>
                      {t.symbol}
                    </Text>
                    <Text
                      style={[
                        styles.tickerIv,
                        { color: ivSignalColor(t.ivSignal, colors.positive, colors.negative, colors.textMuted) },
                      ]}
                    >
                      {t.ivSignal}
                    </Text>
                    <Text style={[styles.tickerDir, { color: colors.textMuted }]}>
                      {t.direction}
                    </Text>
                    <Text
                      style={[
                        styles.tickerVerdict,
                        { color: colors.accent },
                      ]}
                      numberOfLines={1}
                    >
                      {t.verdict}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Overall conclusion */}
            {verdict.overallConclusion && (
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textMuted, marginTop: spacing.sm },
                ]}
              >
                {verdict.overallConclusion}
              </Text>
            )}
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
                  {pick.strategy}
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
                    {formatPct(pick.pop, 0)}
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

      {/* Bottom spacer for tab bar */}
      <View style={{ height: spacing.xxxl }} />
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
