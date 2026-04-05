import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { Card } from '../../src/components/ui/Card';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { StarRating } from '../../src/components/ui/StarRating';
import { PnLChart } from '../../src/components/charts/PnLChart';
import { WinRateCircle } from '../../src/components/charts/WinRateCircle';
import { useBacktestStore } from '../../src/store/backtest-store';
import type { SavedBacktestResult } from '../../src/store/backtest-store';
import { useSettingsStore } from '../../src/store/settings-store';
import { useAppStore } from '../../src/store/app-store';
import { runBacktest } from '../../src/engine/backtest';
import {
  generateTickerPrices,
  periodToTradingDays,
} from '../../src/data/sample-prices';
import { formatDollar } from '../../src/utils/format';
import { backtestToShareText, backtestToCsv } from '../../src/utils/export';
import type { BacktestInput, BacktestResult } from '../../src/utils/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_WIDTH = Dimensions.get('window').width;

interface LivePrice {
  symbol: string;
  price: number;
  change_pct: number;
}

// ── Strategy definitions ──
const STRATEGIES: { key: BacktestInput['strategy']; label: string }[] = [
  { key: 'sell_put', label: 'Sell Put' },
  { key: 'sell_call', label: 'Sell Call' },
  { key: 'iron_condor', label: 'Iron Condor' },
  { key: 'bull_put_spread', label: 'Bull Put Spread' },
];

const PERIODS: { key: BacktestInput['period']; label: string }[] = [
  { key: '3mo', label: '3mo' },
  { key: '6mo', label: '6mo' },
  { key: '1y', label: '1y' },
  { key: '2y', label: '2y' },
];

// ── Rating helper ──
function computeRating(r: BacktestResult): number {
  let score = 0;
  if (r.winRate >= 70) score += 1.5;
  else if (r.winRate >= 55) score += 1;
  if (r.sharpe >= 1.5) score += 1.5;
  else if (r.sharpe >= 0.8) score += 1;
  if (r.maxDrawdown < 200) score += 1;
  else if (r.maxDrawdown < 500) score += 0.5;
  if (r.profitFactor >= 2) score += 1;
  else if (r.profitFactor >= 1.2) score += 0.5;
  return Math.min(score, 5);
}

// ── Main Screen ──
export default function BacktestScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tickers = useSettingsStore((s) => s.tickers);
  const {
    mode,
    setMode,
    simpleInput,
    setSimpleInput,
    portfolio,
    addToPortfolio,
    removeFromPortfolio,
    results,
    setResults,
    saveResult,
    removeSavedResult,
    savedResults,
    clearResults,
    pendingAutoRun,
    setPendingAutoRun,
  } = useBacktestStore();

  const [computing, setComputing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<SavedBacktestResult | null>(null);

  // Auto-run backtest when navigated from dashboard "Backtest" button
  const autoRunRef = useRef(false);
  useEffect(() => {
    if (pendingAutoRun && !autoRunRef.current) {
      autoRunRef.current = true;
      setPendingAutoRun(false);
      // Small delay so the screen renders first
      const timer = setTimeout(() => {
        autoRunRef.current = false;
        runSimpleRef.current?.();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pendingAutoRun, setPendingAutoRun]);

  // Dashboard data for enriching sample prices with real starting prices
  const dashboardData = useAppStore((s) => s.dashboardData);
  const livePrices: LivePrice[] = (dashboardData as Record<string, unknown> | null)?.live_prices as LivePrice[] ?? [];

  /**
   * Generate prices enriched with real starting price from live data when available.
   */
  const getEnrichedPrices = useCallback(
    (symbol: string, days: number) => {
      const { prices, dates } = generateTickerPrices(symbol, days + 60);
      const realPrice = livePrices.find((lp) => lp.symbol === symbol)?.price;
      if (realPrice && prices.length > 0) {
        // Scale sample prices so the starting price matches the real price
        const scale = realPrice / prices[0];
        for (let i = 0; i < prices.length; i++) {
          prices[i] = Math.round(prices[i] * scale * 100) / 100;
        }
      }
      return { prices, dates };
    },
    [livePrices]
  );

  // Advanced mode form state
  const [newTicker, setNewTicker] = useState('TSLA');
  const [newStrategy, setNewStrategy] = useState<BacktestInput['strategy']>('sell_put');
  const [newStrike, setNewStrike] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  // Ref to allow auto-run to call runSimple
  const runSimpleRef = useRef<(() => void) | null>(null);

  // ── Run single backtest (simple mode) ──
  const runSimple = useCallback(() => {
    setComputing(true);
    clearResults();
    // Use setTimeout to let the UI show the loading state
    setTimeout(() => {
      const days = periodToTradingDays(simpleInput.period);
      const { prices, dates } = getEnrichedPrices(simpleInput.symbol, days);
      const input: BacktestInput = {
        symbol: simpleInput.symbol,
        strategy: simpleInput.strategy,
        otmPct: simpleInput.otmPct,
        period: simpleInput.period,
      };
      const result = runBacktest(prices, dates, input);
      if (result) {
        result.rating = computeRating(result);
        setResults([result]);
      }
      setComputing(false);
    }, 50);
  }, [simpleInput, clearResults, setResults, getEnrichedPrices]);

  // Keep ref in sync so auto-run can call the latest version
  runSimpleRef.current = runSimple;

  // ── Run all portfolio backtests (advanced mode) ──
  const runAll = useCallback(() => {
    if (portfolio.length === 0) return;
    setComputing(true);
    clearResults();
    setTimeout(() => {
      const allResults: BacktestResult[] = [];
      for (const input of portfolio) {
        const days = periodToTradingDays(input.period);
        const { prices, dates } = getEnrichedPrices(input.symbol, days);
        const result = runBacktest(prices, dates, input);
        if (result) {
          result.rating = computeRating(result);
          allResults.push(result);
        }
      }
      setResults(allResults);
      setComputing(false);
    }, 50);
  }, [portfolio, clearResults, setResults, getEnrichedPrices]);

  // ── Add to portfolio ──
  const handleAddPosition = useCallback(() => {
    const input: BacktestInput = {
      symbol: newTicker.toUpperCase(),
      strategy: newStrategy,
      strike: newStrike ? parseFloat(newStrike) : undefined,
      period: '6mo',
    };
    addToPortfolio(input);
    setAddModalVisible(false);
    setNewStrike('');
    setNewExpiry('');
  }, [newTicker, newStrategy, newStrike, newExpiry, addToPortfolio]);

  // ── Best pick logic ──
  const bestPick = useMemo(() => {
    if (results.length < 2) return null;
    return results.reduce((best, r) =>
      r.sharpe > best.sharpe || (r.sharpe === best.sharpe && r.maxDrawdown < best.maxDrawdown)
        ? r
        : best
    );
  }, [results]);

  // ── Column highlight helpers ──
  const bestInColumn = useMemo(() => {
    if (results.length < 2) return null;
    return {
      winRate: Math.max(...results.map((r) => r.winRate)),
      totalPnl: Math.max(...results.map((r) => r.totalPnl)),
      sharpe: Math.max(...results.map((r) => r.sharpe)),
      maxDD: Math.min(...results.map((r) => r.maxDrawdown)),
      rating: Math.max(...results.map((r) => r.rating)),
    };
  }, [results]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 8 }]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textHeading }]}>Backtest</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Validate strategies with historical simulation
          </Text>
        </View>
      </View>

      {/* ── Mode toggle ── */}
      <SegmentedControl
        segments={['Simple', 'Advanced']}
        selectedIndex={mode === 'simple' ? 0 : 1}
        onChange={(i) => setMode(i === 0 ? 'simple' : 'advanced')}
      />

      {/* ═══════════════ SIMPLE MODE ═══════════════ */}
      {mode === 'simple' && (
        <>
          {/* Ticker chips */}
          <Card>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TICKER</Text>
            <View style={styles.chipRow}>
              {tickers.map((t) => {
                const active = t === simpleInput.symbol;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.accent : colors.background,
                        borderColor: active ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setSimpleInput({ symbol: t })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? '#fff' : colors.text },
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Strategy chips */}
          <Card>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>STRATEGY</Text>
            <View style={styles.chipRow}>
              {STRATEGIES.map((s) => {
                const active = s.key === simpleInput.strategy;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.accent : colors.background,
                        borderColor: active ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setSimpleInput({ strategy: s.key })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? '#fff' : colors.text },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* OTM% slider (button-based) */}
          <Card>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>OTM %</Text>
              <Text style={[styles.sliderValue, { color: colors.accent }]}>
                {simpleInput.otmPct}%
              </Text>
            </View>
            <View style={styles.sliderRow}>
              <TouchableOpacity
                style={[styles.sliderBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() =>
                  setSimpleInput({ otmPct: Math.max(3, simpleInput.otmPct - 1) })
                }
              >
                <Text style={[styles.sliderBtnText, { color: colors.text }]}>-</Text>
              </TouchableOpacity>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    {
                      backgroundColor: colors.accent,
                      width: `${((simpleInput.otmPct - 3) / 12) * 100}%`,
                    },
                  ]}
                />
                {/* Tick marks */}
                {[3, 5, 7, 10, 12, 15].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.sliderTick,
                      { left: `${((v - 3) / 12) * 100}%` },
                    ]}
                    onPress={() => setSimpleInput({ otmPct: v })}
                  >
                    <Text
                      style={[
                        styles.tickLabel,
                        {
                          color: v === simpleInput.otmPct ? colors.accent : colors.textMuted,
                          fontWeight: v === simpleInput.otmPct ? '700' : '400',
                        },
                      ]}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.sliderBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() =>
                  setSimpleInput({ otmPct: Math.min(15, simpleInput.otmPct + 1) })
                }
              >
                <Text style={[styles.sliderBtnText, { color: colors.text }]}>+</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Period picker */}
          <Card>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PERIOD</Text>
            <View style={styles.chipRow}>
              {PERIODS.map((p) => {
                const active = p.key === simpleInput.period;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[
                      styles.periodChip,
                      {
                        backgroundColor: active ? colors.accent : colors.background,
                        borderColor: active ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setSimpleInput({ period: p.key })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? '#fff' : colors.text },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Run button */}
          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: colors.accent }]}
            onPress={runSimple}
            activeOpacity={0.8}
            disabled={computing}
          >
            {computing ? (
              <View style={styles.runBtnInner}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.runBtnText}> Computing...</Text>
              </View>
            ) : (
              <Text style={styles.runBtnText}>Run Backtest</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* ═══════════════ ADVANCED MODE ═══════════════ */}
      {mode === 'advanced' && (
        <>
          {/* Portfolio list */}
          <Card>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PORTFOLIO</Text>
            {portfolio.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No positions added. Tap "+ Add Position" to start.
              </Text>
            ) : (
              portfolio.map((p, idx) => (
                <View
                  key={idx}
                  style={[styles.portfolioRow, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.portfolioInfo}>
                    <Text style={[styles.portfolioTicker, { color: colors.textHeading }]}>
                      {p.symbol}
                    </Text>
                    <Text style={[styles.portfolioDetail, { color: colors.textMuted }]}>
                      {STRATEGIES.find((s) => s.key === p.strategy)?.label ?? p.strategy}
                      {p.strike ? ` @ $${p.strike}` : ''}
                      {p.otmPct ? ` ${p.otmPct}% OTM` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: colors.negative + '20' }]}
                    onPress={() => removeFromPortfolio(idx)}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.negative }]}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </Card>

          {/* Add position button */}
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.accent }]}
            onPress={() => setAddModalVisible(true)}
          >
            <Text style={[styles.addBtnText, { color: colors.accent }]}>+ Add Position</Text>
          </TouchableOpacity>

          {/* Compare All button */}
          {portfolio.length > 0 && (
            <TouchableOpacity
              style={[styles.runBtn, { backgroundColor: colors.accent }]}
              onPress={runAll}
              activeOpacity={0.8}
              disabled={computing}
            >
              {computing ? (
                <View style={styles.runBtnInner}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.runBtnText}> Computing...</Text>
                </View>
              ) : (
                <Text style={styles.runBtnText}>Compare All</Text>
              )}
            </TouchableOpacity>
          )}

          {/* ── Add Position Modal ── */}
          <Modal
            visible={addModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setAddModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitle, { color: colors.textHeading }]}>
                  Add Position
                </Text>

                {/* Ticker selection */}
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Ticker</Text>
                <View style={styles.chipRow}>
                  {tickers.map((t) => {
                    const active = t === newTicker;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? colors.accent : colors.background,
                            borderColor: active ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => setNewTicker(t)}
                      >
                        <Text
                          style={[styles.chipText, { color: active ? '#fff' : colors.text }]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Strategy */}
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Strategy</Text>
                <View style={styles.chipRow}>
                  {STRATEGIES.map((s) => {
                    const active = s.key === newStrategy;
                    return (
                      <TouchableOpacity
                        key={s.key}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? colors.accent : colors.background,
                            borderColor: active ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => setNewStrategy(s.key)}
                      >
                        <Text
                          style={[styles.chipText, { color: active ? '#fff' : colors.text }]}
                        >
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Strike input */}
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                  Strike (optional)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={newStrike}
                  onChangeText={setNewStrike}
                  placeholder="e.g. 340"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />

                {/* Expiry input */}
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                  Holding Days (optional)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={newExpiry}
                  onChangeText={setNewExpiry}
                  placeholder="e.g. 7 (default)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />

                {/* Modal buttons */}
                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                    onPress={() => setAddModalVisible(false)}
                  >
                    <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, { backgroundColor: colors.accent }]}
                    onPress={handleAddPosition}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* ═══════════════ RESULTS SECTION ═══════════════ */}
      {results.length > 0 && (
        <>
          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.resultsTitle, { color: colors.textHeading }]}>
            Results
          </Text>
          <Text style={[styles.simNote, { color: colors.textMuted }]}>
            Using simulated prices. Real historical data coming soon.
          </Text>

          {/* ── Best Pick Banner (multi-result only) ── */}
          {bestPick && (
            <View style={[styles.bestBanner, { backgroundColor: colors.gold + '18', borderColor: colors.gold + '50' }]}>
              <Text style={[styles.bestBannerText, { color: colors.gold }]}>
                {'★ '}
                {bestPick.input.symbol}{' '}
                {STRATEGIES.find((s) => s.key === bestPick.input.strategy)?.label ?? ''}{' '}
                {bestPick.input.strike ? `$${bestPick.input.strike}` : `${bestPick.input.otmPct ?? 5}% OTM`}
                {' — Highest Sharpe + Lowest MaxDD'}
              </Text>
            </View>
          )}

          {/* ── Professional Result Card(s) ── */}
          {results.map((r, idx) => {
            const isProfitable = r.totalPnl >= 0;
            const bgTint = isProfitable ? `${colors.positive}08` : `${colors.negative}08`;

            return (
              <Card
                key={idx}
                style={{ backgroundColor: bgTint }}
              >
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={[styles.summaryTicker, { color: colors.textHeading }]}>
                      {r.input.symbol}
                    </Text>
                    <Text style={[styles.summaryStrategy, { color: colors.textMuted }]}>
                      {STRATEGIES.find((s) => s.key === r.input.strategy)?.label ?? r.input.strategy}
                      {r.input.otmPct ? ` | ${r.input.otmPct}% OTM` : ''}
                      {' | '}{r.input.period}
                    </Text>
                  </View>
                  <StarRating score={r.rating} size={18} />
                </View>

                {/* Hero: Win Rate Circle */}
                <View style={styles.heroCircle}>
                  <WinRateCircle percentage={r.winRate} size={120} />
                </View>

                {/* 2x2 metric cards */}
                <View style={styles.metricGrid2x2}>
                  <View style={[styles.metricCard2x2, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>Total P&L</Text>
                    <Text style={[styles.metricCardValue, { color: isProfitable ? colors.positive : colors.negative }]}>
                      {formatDollar(r.totalPnl)}
                    </Text>
                  </View>
                  <View style={[styles.metricCard2x2, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>Sharpe</Text>
                    <Text style={[styles.metricCardValue, { color: r.sharpe >= 1 ? colors.positive : r.sharpe >= 0.5 ? colors.gold : colors.negative }]}>
                      {r.sharpe.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.metricCard2x2, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>Max Drawdown</Text>
                    <Text style={[styles.metricCardValue, { color: colors.negative }]}>
                      {formatDollar(r.maxDrawdown)}
                    </Text>
                  </View>
                  <View style={[styles.metricCard2x2, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>Profit Factor</Text>
                    <Text style={[styles.metricCardValue, { color: r.profitFactor >= 1.5 ? colors.positive : colors.gold }]}>
                      {r.profitFactor >= 999 ? 'INF' : r.profitFactor.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Full-width P&L Curve */}
                <View style={[styles.curveContainer, { borderColor: colors.border }]}>
                  <Text style={[styles.curveLabel, { color: colors.textMuted }]}>
                    P&L CURVE
                  </Text>
                  <PnLChart
                    data={r.pnlCurve}
                    width={SCREEN_WIDTH - 64}
                    height={200}
                  />
                </View>
              </Card>
            );
          })}

          {/* ── Comparison Table (multi-result) ── */}
          {results.length > 1 && bestInColumn && (
            <Card>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                SIDE-BY-SIDE COMPARISON
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Header row */}
                  <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.tableHeader, styles.tableColWide, { color: colors.textMuted }]}>Strategy</Text>
                    <Text style={[styles.tableHeader, styles.tableCol, { color: colors.textMuted }]}>Trades</Text>
                    <Text style={[styles.tableHeader, styles.tableCol, { color: colors.textMuted }]}>Win%</Text>
                    <Text style={[styles.tableHeader, styles.tableCol, { color: colors.textMuted }]}>P&L</Text>
                    <Text style={[styles.tableHeader, styles.tableCol, { color: colors.textMuted }]}>Sharpe</Text>
                    <Text style={[styles.tableHeader, styles.tableCol, { color: colors.textMuted }]}>MaxDD</Text>
                    <Text style={[styles.tableHeader, styles.tableCol, { color: colors.textMuted }]}>Rating</Text>
                  </View>
                  {/* Data rows */}
                  {results.map((r, idx) => (
                    <View
                      key={idx}
                      style={[styles.tableRow, { borderBottomColor: colors.border }]}
                    >
                      <Text
                        style={[styles.tableCell, styles.tableColWide, { color: colors.textHeading }]}
                        numberOfLines={1}
                      >
                        {r.input.symbol}{' '}
                        {STRATEGIES.find((s) => s.key === r.input.strategy)?.label ?? ''}
                      </Text>
                      <Text style={[styles.tableCell, styles.tableCol, { color: colors.text }]}>
                        {r.trades}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCol,
                          { color: r.winRate === bestInColumn.winRate ? colors.gold : colors.text },
                          r.winRate === bestInColumn.winRate && styles.tableBold,
                        ]}
                      >
                        {r.winRate}%
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCol,
                          { color: r.totalPnl === bestInColumn.totalPnl ? colors.gold : r.totalPnl >= 0 ? colors.positive : colors.negative },
                          r.totalPnl === bestInColumn.totalPnl && styles.tableBold,
                        ]}
                      >
                        {formatDollar(r.totalPnl)}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCol,
                          { color: r.sharpe === bestInColumn.sharpe ? colors.gold : colors.text },
                          r.sharpe === bestInColumn.sharpe && styles.tableBold,
                        ]}
                      >
                        {r.sharpe.toFixed(2)}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.tableCol,
                          { color: r.maxDrawdown === bestInColumn.maxDD ? colors.gold : colors.negative },
                          r.maxDrawdown === bestInColumn.maxDD && styles.tableBold,
                        ]}
                      >
                        {formatDollar(r.maxDrawdown)}
                      </Text>
                      <View style={[styles.tableCol, { justifyContent: 'center' }]}>
                        <StarRating score={r.rating} size={12} />
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card>
          )}

          {/* ── Action buttons ── */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.accent }]}
              onPress={() => {
                results.forEach((r) => saveResult(r));
                Alert.alert('Saved', 'Backtest results saved to history.');
              }}
            >
              <Text style={styles.actionBtnText}>Save to History</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.backgroundAlt, borderColor: colors.border, borderWidth: 1 }]}
              onPress={async () => {
                try {
                  const text = results.map((r) => backtestToShareText(r)).join('\n\n');
                  await Share.share({ message: text, title: 'DappGo Backtest Results' });
                } catch {}
              }}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>{'\uD83D\uDCF8'} Share Results</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.backgroundAlt, borderColor: colors.border, borderWidth: 1 }]}
              onPress={async () => {
                try {
                  const csv = results.map((r) => backtestToCsv(r)).join('\n\n');
                  await Share.share({ message: csv, title: 'DappGo Backtest CSV' });
                } catch {}
              }}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ═══════════════ HISTORY SECTION ═══════════════ */}
      {savedResults.length > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.resultsTitle, { color: colors.textHeading }]}>
            {'\uD83D\uDCDA'} History
          </Text>
          <Text style={[styles.simNote, { color: colors.textMuted }]}>
            {savedResults.length} saved result{savedResults.length !== 1 ? 's' : ''}. Swipe left to delete.
          </Text>
          {savedResults.map((sr, idx) => (
            <SwipeToDeleteCard
              key={`${sr.input.symbol}-${sr.savedAt}-${idx}`}
              onDelete={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                removeSavedResult(idx);
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setHistoryDetail(sr)}
              >
                <Card>
                  <View style={styles.historyCardRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.historyCardHeader}>
                        <Text style={[styles.historySymbol, { color: colors.gold }]}>
                          {sr.input.symbol}
                        </Text>
                        <Text style={[styles.historyStrategy, { color: colors.accent }]}>
                          {STRATEGIES.find((s) => s.key === sr.input.strategy)?.label ?? sr.input.strategy}
                        </Text>
                      </View>
                      <View style={styles.historyMetrics}>
                        <Text style={[styles.historyMetric, { color: colors.textMuted }]}>
                          Win: <Text style={{ color: sr.winRate >= 55 ? colors.positive : colors.negative, fontWeight: '700' }}>{sr.winRate}%</Text>
                        </Text>
                        <Text style={[styles.historyMetric, { color: colors.textMuted }]}>
                          P&L: <Text style={{ color: sr.totalPnl >= 0 ? colors.positive : colors.negative, fontWeight: '700' }}>{formatDollar(sr.totalPnl)}</Text>
                        </Text>
                      </View>
                      <Text style={[styles.historySavedAt, { color: colors.textMuted }]}>
                        Saved {formatSavedAt(sr.savedAt)}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 18 }}>{'\u203A'}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            </SwipeToDeleteCard>
          ))}
        </>
      )}

      {/* ═══════════════ HISTORY DETAIL MODAL ═══════════════ */}
      <Modal
        visible={historyDetail !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.historyModalContent, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {historyDetail && (
                <>
                  <View style={styles.summaryHeader}>
                    <View>
                      <Text style={[styles.summaryTicker, { color: colors.textHeading }]}>
                        {historyDetail.input.symbol}
                      </Text>
                      <Text style={[styles.summaryStrategy, { color: colors.textMuted }]}>
                        {STRATEGIES.find((s) => s.key === historyDetail.input.strategy)?.label ?? historyDetail.input.strategy}
                        {historyDetail.input.otmPct ? ` | ${historyDetail.input.otmPct}% OTM` : ''}
                        {' | '}{historyDetail.input.period}
                      </Text>
                    </View>
                    <StarRating score={historyDetail.rating} size={18} />
                  </View>

                  <View style={styles.metricsGrid}>
                    <MetricCell label="Total P&L" value={formatDollar(historyDetail.totalPnl)} color={historyDetail.totalPnl >= 0 ? colors.positive : colors.negative} />
                    <MetricCell label="Win Rate" value={`${historyDetail.winRate}%`} color={historyDetail.winRate >= 55 ? colors.positive : colors.negative} />
                    <MetricCell label="Sharpe" value={historyDetail.sharpe.toFixed(2)} color={historyDetail.sharpe >= 1 ? colors.positive : colors.gold} />
                    <MetricCell label="Max DD" value={formatDollar(historyDetail.maxDrawdown)} color={colors.negative} />
                    <MetricCell label="Avg Win" value={formatDollar(historyDetail.avgWin)} color={colors.positive} />
                    <MetricCell label="Avg Loss" value={formatDollar(Math.abs(historyDetail.avgLoss))} color={colors.negative} />
                    <MetricCell label="Trades" value={`${historyDetail.trades}`} color={colors.text} />
                    <MetricCell label="Profit Factor" value={historyDetail.profitFactor >= 999 ? 'INF' : historyDetail.profitFactor.toFixed(2)} color={historyDetail.profitFactor >= 1.5 ? colors.positive : colors.gold} />
                  </View>

                  <View style={[styles.curveContainer, { borderColor: colors.border }]}>
                    <Text style={[styles.curveLabel, { color: colors.textMuted }]}>P&L CURVE</Text>
                    <PnLChart
                      data={historyDetail.pnlCurve}
                      width={SCREEN_WIDTH - 80}
                      height={180}
                    />
                  </View>
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.runBtn, { backgroundColor: colors.accent, marginTop: 16 }]}
              onPress={() => setHistoryDetail(null)}
            >
              <Text style={styles.runBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom spacing */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── MetricCell sub-component ──
function MetricCell({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metricCell}>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

// ── Swipe-to-delete wrapper for history cards ──
function SwipeToDeleteCard({
  onDelete,
  children,
}: {
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const threshold = -80;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          translateX.setValue(g.dx);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < threshold) {
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDelete());
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={{ overflow: 'hidden' }}>
      {/* Delete background */}
      <View style={swipeStyles.deleteBackground}>
        <Text style={swipeStyles.deleteText}>Delete</Text>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});

// ── Format saved-at timestamp ──
function formatSavedAt(iso: string | undefined | null): string {
  if (!iso) return 'recently';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'recently';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

// ── Styles ──
const styles = StyleSheet.create<Record<string, any>>({
  container: { flex: 1 },
  contentContainer: { padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8, marginBottom: 2 },
  subtitle: { fontSize: 14 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  periodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },

  // Slider
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: { fontSize: 20, fontWeight: '700' },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  sliderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderBtnText: { fontSize: 20, fontWeight: '700', marginTop: -2 },
  sliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  sliderTick: {
    position: 'absolute',
    top: 10,
    transform: [{ translateX: -8 }],
  },
  tickLabel: { fontSize: 10, width: 16, textAlign: 'center' },

  // Section labels
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },

  // Run button
  runBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  runBtnInner: { flexDirection: 'row', alignItems: 'center' },
  runBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Portfolio items (advanced)
  emptyText: { fontSize: 13, marginTop: 8, marginBottom: 4, fontStyle: 'italic' },
  portfolioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  portfolioInfo: { flex: 1 },
  portfolioTicker: { fontSize: 15, fontWeight: '700' },
  portfolioDetail: { fontSize: 12, marginTop: 2 },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText: { fontSize: 12, fontWeight: '600' },
  addBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  addBtnText: { fontSize: 14, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  // Results
  divider: { height: 1, marginVertical: 20 },
  resultsTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  simNote: { fontSize: 12, fontStyle: 'italic', marginBottom: 16 },

  // Best pick banner
  bestBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  bestBannerText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },

  // Summary card
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryTicker: { fontSize: 20, fontWeight: '800' },
  summaryStrategy: { fontSize: 12, marginTop: 2 },

  // Hero win rate circle
  heroCircle: {
    alignItems: 'center',
    marginBottom: 16,
  },
  // 2x2 metric grid
  metricGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metricCard2x2: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  } as const,
  metricCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricCardValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  // Metrics grid (legacy / comparison table)
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  metricCell: {
    width: '25%',
    paddingVertical: 8,
    alignItems: 'center',
  } as const,
  metricLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  metricValue: { fontSize: 15, fontWeight: '700' },

  // P&L chart
  curveContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  curveLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },

  // Comparison table
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tableHeader: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  tableCell: { fontSize: 12, fontWeight: '500' },
  tableCol: { width: 65, paddingHorizontal: 4 },
  tableColWide: { width: 110, paddingHorizontal: 4 },
  tableBold: { fontWeight: '800' },

  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // History section
  historyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  historySymbol: { fontSize: 16, fontWeight: '800' },
  historyStrategy: { fontSize: 12, fontWeight: '600' },
  historyMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 2,
  },
  historyMetric: { fontSize: 12 },
  historySavedAt: { fontSize: 10, marginTop: 2 },

  // History detail modal
  historyModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
});
