import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

interface PnLChartProps {
  /** Array of cumulative P&L data points */
  data: { date: string; pnl: number }[];
  /** Line color (overridden by positive/negative logic if not provided) */
  color?: string;
  /** Width of the SVG canvas */
  width?: number;
  /** Height of the SVG canvas */
  height?: number;
}

/**
 * SVG-based P&L curve chart with gradient fill.
 * Renders green if final P&L is positive, red if negative.
 * Shows horizontal zero line, date labels, and final P&L value.
 */
export function PnLChart({
  data,
  color,
  width = 320,
  height = 200,
}: PnLChartProps) {
  if (data.length < 2) return null;

  const finalPnl = data[data.length - 1].pnl;
  const lineColor = color ?? (finalPnl >= 0 ? '#22c55e' : '#ef4444');

  const pnls = data.map((d) => d.pnl);
  const minPnl = Math.min(...pnls, 0);
  const maxPnl = Math.max(...pnls, 0);
  const range = maxPnl - minPnl || 1;

  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 16;
  const paddingBottom = 28;
  const innerW = width - paddingLeft - paddingRight;
  const innerH = height - paddingTop - paddingBottom;

  // Map P&L values to SVG coordinates
  const toX = (i: number) => paddingLeft + (i / (data.length - 1)) * innerW;
  const toY = (val: number) => paddingTop + innerH - ((val - minPnl) / range) * innerH;

  // Zero line Y position
  const zeroY = toY(0);

  // Build polyline points
  const points = data
    .map((d, i) => `${toX(i).toFixed(1)},${toY(d.pnl).toFixed(1)}`)
    .join(' ');

  // Build closed polygon for gradient fill (down to zero line)
  const clampedZeroY = Math.min(Math.max(zeroY, paddingTop), paddingTop + innerH);
  const firstX = toX(0);
  const lastX = toX(data.length - 1);
  const fillPoints = `${points} ${lastX.toFixed(1)},${clampedZeroY.toFixed(1)} ${firstX.toFixed(1)},${clampedZeroY.toFixed(1)}`;

  // Date labels
  const startDate = formatShortDate(data[0].date);
  const endDate = formatShortDate(data[data.length - 1].date);

  // Final P&L label
  const finalLabel = `${finalPnl >= 0 ? '+' : ''}$${finalPnl.toFixed(0)}`;
  const finalX = lastX;
  const finalY = toY(finalPnl);

  // Unique gradient ID to avoid collisions with multiple charts
  const gradId = `pnl-grad-${finalPnl >= 0 ? 'pos' : 'neg'}`;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.3" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Gradient fill area */}
        <Polyline
          points={fillPoints}
          fill={`url(#${gradId})`}
          stroke="none"
        />

        {/* Zero line */}
        <Line
          x1={paddingLeft}
          y1={zeroY}
          x2={paddingLeft + innerW}
          y2={zeroY}
          stroke="#888"
          strokeWidth={0.5}
          strokeDasharray="4,3"
        />

        {/* P&L curve */}
        <Polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Start date label */}
        <SvgText
          x={paddingLeft}
          y={height - 6}
          fontSize={10}
          fill="#888"
          textAnchor="start"
        >
          {startDate}
        </SvgText>

        {/* End date label */}
        <SvgText
          x={paddingLeft + innerW}
          y={height - 6}
          fontSize={10}
          fill="#888"
          textAnchor="end"
        >
          {endDate}
        </SvgText>

        {/* Final P&L label */}
        <SvgText
          x={Math.min(finalX + 4, width - paddingRight - 40)}
          y={Math.max(finalY - 6, paddingTop + 10)}
          fontSize={11}
          fontWeight="bold"
          fill={lineColor}
          textAnchor="end"
        >
          {finalLabel}
        </SvgText>
      </Svg>
    </View>
  );
}

/**
 * Format a YYYY-MM-DD date to short "MMM DD" format.
 */
function formatShortDate(dateStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${months[monthIdx] ?? parts[1]} ${day}`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
