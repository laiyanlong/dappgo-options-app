import React from 'react';
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
export function SparkLine({
  prices,
  color,
  width = 80,
  height = 32,
  strokeWidth = 1.5,
}: SparkLineProps) {
  if (prices.length < 2) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = prices
    .map((v, i) => {
      const x = padding + (i / (prices.length - 1)) * innerW;
      const y = padding + innerH - ((v - min) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Build a closed polygon for the gradient fill area
  const firstX = padding;
  const lastX = padding + innerW;
  const fillPoints = `${points} ${lastX.toFixed(1)},${height} ${firstX.toFixed(1)},${height}`;

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
}
