import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Path,
  Line,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../theme';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatDollar } from '../../utils/format';
import {
  intradayToOHLC,
  generateDailyOHLC,
  type OHLCBar,
} from '../../data/ohlc-generator';

// ── Types ──

type TimeFrame = '1D' | '1W' | '1M' | '3M';

export interface StockChartProps {
  symbol: string;
  currentPrice: number;
  intradayPrices?: number[];
  intradayTimes?: string[];
  color: string;
  height?: number;
}

// ── Helpers ──

const CHART_PADDING = { top: 16, right: 56, bottom: 28, left: 8 };
const VOLUME_HEIGHT_RATIO = 0.18;
const CANDLE_BAR_COUNT = 40;

/**
 * Convert array of points to a smooth SVG path using Catmull-Rom to cubic bezier.
 */
function smoothPath(
  points: { x: number; y: number }[],
  tension: number = 0.3
): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

/** Generate time labels for intraday (market hours 9:30-16:00). */
function generateIntradayTimes(count: number): string[] {
  const labels: string[] = [];
  const startMin = 9 * 60 + 30; // 9:30 AM
  const endMin = 16 * 60; // 4:00 PM
  const totalMin = endMin - startMin;

  for (let i = 0; i < count; i++) {
    const min = startMin + (i / (count - 1)) * totalMin;
    const h = Math.floor(min / 60);
    const m = Math.floor(min % 60);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h;
    labels.push(`${h12}:${String(m).padStart(2, '0')} ${suffix}`);
  }
  return labels;
}

// ── Pill Button ──

function PillButton({
  label,
  active,
  onPress,
  minWidth,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  minWidth?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: active ? colors.accent : colors.backgroundAlt,
          borderColor: active ? colors.accent : colors.border,
          minWidth: minWidth ?? 48,
        },
      ]}
      onTouchEnd={onPress}
      // accessibility
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[
          styles.pillText,
          { color: active ? '#fff' : colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Toggle Button ──

function ToggleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.toggleBtn,
        {
          backgroundColor: active ? `${colors.accent}30` : colors.backgroundAlt,
          borderColor: active ? colors.accent : colors.border,
        },
      ]}
      onTouchEnd={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[
          styles.toggleText,
          { color: active ? colors.accent : colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Main Component ──

export function StockChart({
  symbol,
  currentPrice,
  intradayPrices,
  intradayTimes: intradayTimesFromProps,
  color,
  height = 280,
}: StockChartProps) {
  const { colors } = useTheme();

  // State
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1D');
  const [showCandles, setShowCandles] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width - 32);

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [timeFrame, fadeAnim]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  }, []);

  // Chart area dimensions
  const plotWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const volumeHeight = plotHeight * VOLUME_HEIGHT_RATIO;
  const priceAreaHeight = plotHeight - volumeHeight - 8; // 8px gap

  // ── Data generation per timeframe ──

  const { prices, times, ohlcBars } = useMemo(() => {
    const seedHash = symbol
      .split('')
      .reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0);

    if (timeFrame === '1D') {
      const p = intradayPrices && intradayPrices.length >= 2
        ? intradayPrices
        : generateFallbackIntraday(currentPrice, 78, seedHash);
      const t = intradayTimesFromProps && intradayTimesFromProps.length === p.length
        ? intradayTimesFromProps
        : generateIntradayTimes(p.length);
      const bars = intradayToOHLC(p, t, CANDLE_BAR_COUNT);
      return { prices: p, times: t, ohlcBars: bars };
    }

    const daysMap: Record<string, number> = { '1W': 5, '1M': 22, '3M': 66 };
    const days = daysMap[timeFrame] ?? 22;
    const vol: Record<string, number> = {
      TSLA: 0.55, AMZN: 0.35, NVDA: 0.50, AAPL: 0.25,
      MSFT: 0.25, META: 0.40, GOOG: 0.30, SPY: 0.18,
    };
    const bars = generateDailyOHLC(currentPrice, days, vol[symbol] ?? 0.35, seedHash);
    const p = bars.map((b) => b.close);
    const t = bars.map((b) => b.time);
    return { prices: p, times: t, ohlcBars: bars };
  }, [symbol, currentPrice, intradayPrices, intradayTimesFromProps, timeFrame]);

  // ── Price range ──

  const { priceMin, priceMax, priceRange } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    if (showCandles && ohlcBars.length > 0) {
      for (const bar of ohlcBars) {
        if (bar.low < min) min = bar.low;
        if (bar.high > max) max = bar.high;
      }
    } else {
      for (const p of prices) {
        if (p < min) min = p;
        if (p > max) max = p;
      }
    }
    // Add 5% padding
    const range = max - min || 1;
    min -= range * 0.05;
    max += range * 0.05;
    return { priceMin: min, priceMax: max, priceRange: max - min };
  }, [prices, ohlcBars, showCandles]);

  // ── Volume range ──

  const maxVolume = useMemo(() => {
    if (!showVolume || ohlcBars.length === 0) return 1;
    return Math.max(...ohlcBars.map((b) => b.volume));
  }, [ohlcBars, showVolume]);

  // ── Coordinate mappers ──

  const priceToY = useCallback(
    (price: number) => {
      return (
        CHART_PADDING.top +
        priceAreaHeight -
        ((price - priceMin) / priceRange) * priceAreaHeight
      );
    },
    [priceAreaHeight, priceMin, priceRange]
  );

  const indexToX = useCallback(
    (i: number, total: number) => {
      return CHART_PADDING.left + (i / Math.max(1, total - 1)) * plotWidth;
    },
    [plotWidth]
  );

  // ── Line points ──

  const linePoints = useMemo(() => {
    return prices.map((p, i) => ({
      x: indexToX(i, prices.length),
      y: priceToY(p),
    }));
  }, [prices, indexToX, priceToY]);

  const linePath = useMemo(() => smoothPath(linePoints), [linePoints]);

  // Gradient fill path (closed polygon)
  const fillPath = useMemo(() => {
    if (linePoints.length < 2) return '';
    const bottom = CHART_PADDING.top + priceAreaHeight;
    return (
      linePath +
      ` L${linePoints[linePoints.length - 1].x},${bottom}` +
      ` L${linePoints[0].x},${bottom} Z`
    );
  }, [linePath, linePoints, priceAreaHeight]);

  // ── Grid lines ──

  const gridLines = useMemo(() => {
    const count = 4;
    const lines: { y: number; price: number }[] = [];
    for (let i = 0; i <= count; i++) {
      const price = priceMin + (priceRange * i) / count;
      lines.push({ y: priceToY(price), price });
    }
    return lines;
  }, [priceMin, priceRange, priceToY]);

  // ── Time labels ──

  const timeLabels = useMemo(() => {
    const count = 5;
    const labels: { x: number; label: string }[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round((i / (count - 1)) * (times.length - 1));
      const t = times[idx] ?? '';
      // Shorten: for dates show MM/DD, for times show as-is
      const display = t.includes('-')
        ? t.slice(5) // MM-DD
        : t.length > 5
          ? t.slice(0, 5) // HH:MM
          : t;
      labels.push({
        x: indexToX(idx, times.length),
        label: display,
      });
    }
    return labels;
  }, [times, indexToX]);

  // ── Current price line ──

  const currentPriceY = priceToY(currentPrice);

  // ── Touch / crosshair ──

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gs) => setTouchX(gs.x0),
      onPanResponderMove: (_, gs) => setTouchX(gs.moveX),
      onPanResponderRelease: () => setTouchX(null),
      onPanResponderTerminate: () => setTouchX(null),
    })
  ).current;

  // Snap to nearest data point
  const crosshairData = useMemo(() => {
    if (touchX == null) return null;
    // Account for chart container padding (16px outer margin)
    const relativeX = touchX - 16 - CHART_PADDING.left;
    const ratio = relativeX / plotWidth;
    const idx = Math.round(ratio * (prices.length - 1));
    const clampedIdx = Math.max(0, Math.min(prices.length - 1, idx));
    const price = prices[clampedIdx];
    const time = times[clampedIdx] ?? '';
    const x = indexToX(clampedIdx, prices.length);
    const y = priceToY(price);
    return { x, y, price, time, idx: clampedIdx };
  }, [touchX, prices, times, plotWidth, indexToX, priceToY]);

  // ── Render ──

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* ── Header row: toggles ── */}
      <View style={styles.headerRow}>
        <Text style={[styles.chartSymbol, { color: colors.gold }]}>{symbol}</Text>
        <View style={styles.toggleRow}>
          <ToggleButton
            label={'\uD83D\uDD6F\uFE0F Candles'}
            active={showCandles}
            onPress={() => setShowCandles((v) => !v)}
          />
          <ToggleButton
            label={'\uD83D\uDCCA Volume'}
            active={showVolume}
            onPress={() => setShowVolume((v) => !v)}
          />
        </View>
      </View>

      {/* ── Crosshair info ── */}
      {crosshairData && (
        <View style={[styles.crosshairInfo, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
          <Text style={[styles.crosshairPrice, { color: colors.textHeading }]}>
            {formatDollar(crosshairData.price)}
          </Text>
          <Text style={[styles.crosshairTime, { color: colors.textMuted }]}>
            {crosshairData.time}
          </Text>
        </View>
      )}

      {/* ── SVG Chart ── */}
      <Animated.View
        style={{ opacity: fadeAnim }}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        <Svg width={chartWidth} height={height}>
          <Defs>
            <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.35" />
              <Stop offset="0.7" stopColor={color} stopOpacity="0.08" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* ── Grid lines ── */}
          {gridLines.map((gl, i) => (
            <G key={`grid-${i}`}>
              <Line
                x1={CHART_PADDING.left}
                y1={gl.y}
                x2={chartWidth - CHART_PADDING.right}
                y2={gl.y}
                stroke={colors.border}
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
              <SvgText
                x={chartWidth - CHART_PADDING.right + 6}
                y={gl.y + 4}
                fill={colors.textMuted}
                fontSize={10}
                fontFamily="SpaceMono"
              >
                {gl.price.toFixed(gl.price >= 100 ? 0 : 1)}
              </SvgText>
            </G>
          ))}

          {/* ── Time labels ── */}
          {timeLabels.map((tl, i) => (
            <SvgText
              key={`time-${i}`}
              x={tl.x}
              y={height - 4}
              fill={colors.textMuted}
              fontSize={9}
              textAnchor="middle"
              fontFamily="SpaceMono"
            >
              {tl.label}
            </SvgText>
          ))}

          {/* ── Current price dashed line ── */}
          {currentPriceY >= CHART_PADDING.top &&
            currentPriceY <= CHART_PADDING.top + priceAreaHeight && (
              <Line
                x1={CHART_PADDING.left}
                y1={currentPriceY}
                x2={chartWidth - CHART_PADDING.right}
                y2={currentPriceY}
                stroke={colors.gold}
                strokeWidth={0.8}
                strokeDasharray="6,4"
                opacity={0.6}
              />
            )}

          {/* ── Volume bars ── */}
          {showVolume &&
            ohlcBars.length > 0 &&
            ohlcBars.map((bar, i) => {
              const barWidth = Math.max(
                2,
                (plotWidth / ohlcBars.length) * 0.65
              );
              const x =
                CHART_PADDING.left +
                (i / Math.max(1, ohlcBars.length - 1)) * plotWidth -
                barWidth / 2;
              const volH =
                (bar.volume / maxVolume) * volumeHeight;
              const volY =
                CHART_PADDING.top + priceAreaHeight + 8 + (volumeHeight - volH);
              const isUp = bar.close >= bar.open;

              return (
                <Rect
                  key={`vol-${i}`}
                  x={x}
                  y={volY}
                  width={barWidth}
                  height={Math.max(1, volH)}
                  fill={isUp ? colors.positive : colors.negative}
                  opacity={0.25}
                  rx={1}
                />
              );
            })}

          {/* ── Candlestick bars ── */}
          {showCandles &&
            ohlcBars.length > 0 &&
            ohlcBars.map((bar, i) => {
              const barWidth = Math.max(
                3,
                (plotWidth / ohlcBars.length) * 0.55
              );
              const cx =
                CHART_PADDING.left +
                (i / Math.max(1, ohlcBars.length - 1)) * plotWidth;
              const isUp = bar.close >= bar.open;
              const bodyTop = priceToY(Math.max(bar.open, bar.close));
              const bodyBottom = priceToY(Math.min(bar.open, bar.close));
              const bodyH = Math.max(1, bodyBottom - bodyTop);
              const wickTop = priceToY(bar.high);
              const wickBottom = priceToY(bar.low);
              const fillColor = isUp ? colors.positive : colors.negative;

              return (
                <G key={`candle-${i}`}>
                  {/* Wick */}
                  <Line
                    x1={cx}
                    y1={wickTop}
                    x2={cx}
                    y2={wickBottom}
                    stroke={fillColor}
                    strokeWidth={1}
                  />
                  {/* Body */}
                  <Rect
                    x={cx - barWidth / 2}
                    y={bodyTop}
                    width={barWidth}
                    height={bodyH}
                    fill={fillColor}
                    rx={1}
                  />
                </G>
              );
            })}

          {/* ── Line chart (shown when candles OFF) ── */}
          {!showCandles && linePoints.length >= 2 && (
            <>
              {/* Gradient fill */}
              <Path d={fillPath} fill="url(#lineGrad)" />
              {/* Line */}
              <Path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          )}

          {/* ── Crosshair ── */}
          {crosshairData && (
            <G>
              {/* Vertical line */}
              <Line
                x1={crosshairData.x}
                y1={CHART_PADDING.top}
                x2={crosshairData.x}
                y2={CHART_PADDING.top + plotHeight}
                stroke={colors.textMuted}
                strokeWidth={0.8}
                strokeDasharray="3,3"
              />
              {/* Horizontal line */}
              <Line
                x1={CHART_PADDING.left}
                y1={crosshairData.y}
                x2={chartWidth - CHART_PADDING.right}
                y2={crosshairData.y}
                stroke={colors.textMuted}
                strokeWidth={0.5}
                strokeDasharray="3,3"
              />
              {/* Dot */}
              <Circle
                cx={crosshairData.x}
                cy={crosshairData.y}
                r={5}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
              />
            </G>
          )}
        </Svg>
      </Animated.View>

      {/* ── Time Frame Selector ── */}
      <View style={styles.controlsRow}>
        <View style={styles.timeFrameRow}>
          {(['1D', '1W', '1M', '3M'] as TimeFrame[]).map((tf) => (
            <PillButton
              key={tf}
              label={tf}
              active={timeFrame === tf}
              onPress={() => setTimeFrame(tf)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Fallback intraday generator ──

function generateFallbackIntraday(
  basePrice: number,
  count: number,
  seed: number
): number[] {
  const prices: number[] = [basePrice];
  let s = seed;
  for (let i = 1; i < count; i++) {
    // Simple PRNG step
    s = ((s * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    const r = (s / 0x7fffffff - 0.5) * 0.008;
    prices.push(prices[i - 1] * (1 + r));
  }
  return prices;
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  chartSymbol: {
    ...typography.h3,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleBtn: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  crosshairInfo: {
    position: 'absolute',
    top: 52,
    left: spacing.md,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  crosshairPrice: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    fontWeight: '700',
  },
  crosshairTime: {
    fontSize: 12,
  },
  controlsRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  timeFrameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    height: 44,
    minWidth: 48,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
