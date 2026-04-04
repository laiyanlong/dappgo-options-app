import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface WinRateCircleProps {
  /** Win rate percentage (0-100) */
  percentage: number;
  /** Diameter of the circle in pixels */
  size?: number;
}

/**
 * SVG circular progress indicator for win rate display.
 * Green >60%, yellow 50-60%, red <50%.
 */
export function WinRateCircle({ percentage, size = 120 }: WinRateCircleProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference * (1 - clampedPct / 100);

  // Color based on win rate threshold
  let color: string;
  if (clampedPct >= 60) {
    color = '#00e676'; // green
  } else if (clampedPct >= 50) {
    color = '#f5c542'; // yellow
  } else {
    color = '#ff5252'; // red
  }

  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#2a2a4a"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Colored progress arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          // Rotate -90deg so arc starts from top
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {/* Centered percentage text */}
      <View style={styles.labelContainer}>
        <Text style={[styles.percentage, { color }]}>
          {clampedPct.toFixed(0)}%
        </Text>
        <Text style={styles.label}>Win Rate</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontSize: 24,
    fontWeight: '800',
  },
  label: {
    fontSize: 10,
    color: '#90a4ae',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
