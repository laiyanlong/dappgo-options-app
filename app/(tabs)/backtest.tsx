import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTheme } from '../../src/theme';
import { Card } from '../../src/components/ui/Card';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { StarRating } from '../../src/components/ui/StarRating';
import { useBacktestStore } from '../../src/store/backtest-store';
import { useSettingsStore } from '../../src/store/settings-store';
import { runBacktest } from '../../src/engine/backtest';
import {
  generateTickerPrices,
  periodToTradingDays,
} from '../../src/data/sample-prices';
import { formatDollar } from '../../src/utils/format';
import type { BacktestInput, BacktestResult } from '../../src/utils/types';

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
    clearResults,
  } = useBacktestStore();

  const [computing, setComputing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Advanced mode form state
  const [newTicker, setNewTicker] = useState('TSLA');
  const [newStrategy, setNewStrategy] = useState<BacktestInput['strategy']>('sell_put');
  const [newStrike, setNewStrike] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  // ── Run single backtest (simple mode) ──
  const runSimple = useCallback(() => {
    setComputing(true);
    clearResults();
    // Use setTimeout to let the UI show the loading state
    setTimeout(() => {
      const days = periodToTradingDays(simpleInput.period);
      const { prices, dates } = generateTickerPrices(simpleInput.symbol, days + 60);
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
  }, [simpleInput, clearResults, setResults]);

  // ── Run all portfolio backtests (advanced mode) ──
  const runAll = useCallback(() => {
    if (portfolio.length === 0) return;
    setComputing(true);
    clearResults();
    setTimeout(() => {
      const allResults: BacktestResult[] = [];
      for (const input of portfolio) {
        const days = periodToTradingDays(input.period);
        const { prices, dates } = generateTickerPrices(input.symbol, days + 60);
        const result = runBacktest(prices, dates, input);
        if (result) {
          result.rating = computeRating(result);
          allResults.push(result);
        }
      }
      setResults(allResults);
      setComputing(false);
    }, 50);
  }, [portfolio, clearResults, setResults]);

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
      contentContainerStyle={styles.contentContainer}
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

          {/* ── Summary Card(s) ── */}
          {results.map((r, idx) => (
            <Card key={idx}>
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

              {/* Metrics grid */}
              <View style={styles.metricsGrid}>
                <MetricCell
                  label="Total P&L"
                  value={formatDollar(r.totalPnl)}
                  color={r.totalPnl >= 0 ? colors.positive : colors.negative}
                />
                <MetricCell
                  label="Win Rate"
                  value={`${r.winRate}%`}
                  color={r.winRate >= 55 ? colors.positive : colors.negative}
                />
                <MetricCell
                  label="Sharpe"
                  value={r.sharpe.toFixed(2)}
                  color={r.sharpe >= 1 ? colors.positive : r.sharpe >= 0.5 ? colors.gold : colors.negative}
                />
                <MetricCell
                  label="Max DD"
                  value={formatDollar(r.maxDrawdown)}
                  color={colors.negative}
                />
                <MetricCell
                  label="Avg Win"
                  value={formatDollar(r.avgWin)}
                  color={colors.positive}
                />
                <MetricCell
                  label="Avg Loss"
                  value={formatDollar(Math.abs(r.avgLoss))}
                  color={colors.negative}
                />
                <MetricCell
                  label="Trades"
                  value={`${r.trades}`}
                  color={colors.text}
                />
                <MetricCell
                  label="Profit Factor"
                  value={r.profitFactor >= 999 ? 'INF' : r.profitFactor.toFixed(2)}
                  color={r.profitFactor >= 1.5 ? colors.positive : colors.gold}
                />
              </View>

              {/* P&L Curve (simplified text sparkline) */}
              <View style={[styles.curveContainer, { borderColor: colors.border }]}>
                <Text style={[styles.curveLabel, { color: colors.textMuted }]}>
                  P&L CURVE
                </Text>
                <PnlMiniChart curve={r.pnlCurve} colors={colors} />
              </View>
            </Card>
          ))}

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
              }}
            >
              <Text style={styles.actionBtnText}>Save Result</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.backgroundAlt, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => {
                // Export placeholder: copy-to-clipboard or share
              }}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Export</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

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

// ── Mini P&L chart using View bars ──
function PnlMiniChart({
  curve,
  colors,
}: {
  curve: { date: string; pnl: number }[];
  colors: Record<string, string>;
}) {
  if (curve.length === 0) return null;

  // Sample down to ~50 bars for display
  const step = Math.max(1, Math.floor(curve.length / 50));
  const sampled = curve.filter((_, i) => i % step === 0);

  const maxAbs = Math.max(
    ...sampled.map((p) => Math.abs(p.pnl)),
    1
  );
  const halfHeight = 30;

  return (
    <View style={styles.miniChart}>
      {/* Top half (positive) */}
      <View style={styles.miniChartHalf}>
        <View style={styles.miniChartBars}>
          {sampled.map((point, i) => {
            const barH = point.pnl > 0 ? (point.pnl / maxAbs) * halfHeight : 0;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  justifyContent: 'flex-end',
                  marginHorizontal: 0.5,
                }}
              >
                <View
                  style={{
                    height: Math.max(barH, point.pnl > 0 ? 1 : 0),
                    backgroundColor: colors.positive,
                    borderRadius: 1,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
      {/* Zero line */}
      <View style={[styles.zeroLine, { backgroundColor: colors.border }]} />
      {/* Bottom half (negative) */}
      <View style={styles.miniChartHalf}>
        <View style={styles.miniChartBars}>
          {sampled.map((point, i) => {
            const barH = point.pnl < 0 ? (Math.abs(point.pnl) / maxAbs) * halfHeight : 0;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  justifyContent: 'flex-start',
                  marginHorizontal: 0.5,
                }}
              >
                <View
                  style={{
                    height: Math.max(barH, point.pnl < 0 ? 1 : 0),
                    backgroundColor: colors.negative,
                    borderRadius: 1,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
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
  resultsTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },

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

  // Metrics grid
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

  // P&L mini chart
  curveContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  curveLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  miniChart: {
    height: 62,
  },
  miniChartHalf: {
    height: 30,
    overflow: 'hidden',
  },
  miniChartBars: {
    flex: 1,
    flexDirection: 'row',
  },
  zeroLine: {
    height: StyleSheet.hairlineWidth,
  },

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
});
