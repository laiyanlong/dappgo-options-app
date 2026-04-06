import React, { useMemo } from 'react';
import Svg, { Polyline, Defs, LinearGradient, Stop } from 'react-native-svg';

interface SparkLineProps {
  /** Array of price values to render */
  prices: number[];
  /** Stroke color for the line */
  color: string;
  /** Width of the SVG canvas */
  width?: number;
  /** Height of the SVG canvas */
  height?: number;
  /** Stroke width of the polyline */
  strokeWidth?: number;
}

/**
 * Minimal SVG sparkline chart.
 * Maps an array of numeric values to an SVG polyline that fills the
 * given width/height, with a subtle gradient fill beneath the line.
 */
export const SparkLine = React.memo(function SparkLine({
  prices,
  color,
  width = 80,
  height = 32,
  strokeWidth = 1.5,
}: SparkLineProps) {
  // Memoize SVG path calculations — only recompute when prices, width, or height change
  const { points, fillPoints } = useMemo(() => {
    if (prices.length < 2) return { points: '', fillPoints: '' };

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const padding = 2;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;

    const pts = prices
      .map((v, i) => {
        const x = padding + (i / (prices.length - 1)) * innerW;
        const y = padding + innerH - ((v - min) / range) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const firstX = padding;
    const lastX = padding + innerW;
    const fill = `${pts} ${lastX.toFixed(1)},${height} ${firstX.toFixed(1)},${height}`;

    return { points: pts, fillPoints: fill };
  }, [prices, width, height]);

  if (prices.length < 2) return null;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.25" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Polyline
        points={fillPoints}
        fill={`url(#grad-${color})`}
        stroke="none"
      />
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
});
