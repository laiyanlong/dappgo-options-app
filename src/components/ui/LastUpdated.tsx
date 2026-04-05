import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store/app-store';

/**
 * Displays relative time since last data update with a colored freshness dot.
 * Green (<5min), yellow (5-30min), red (>30min).
 */
export function LastUpdated() {
  const { colors } = useTheme();
  const lastQuoteUpdate = useAppStore((s) => s.lastQuoteUpdate);
  const [now, setNow] = useState(Date.now());

  // Re-render every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (lastQuoteUpdate === 0) return null;

  const diffMs = now - lastQuoteUpdate;
  const diffMin = Math.floor(diffMs / 60_000);

  // Freshness color
  let dotColor: string;
  if (diffMin < 5) {
    dotColor = colors.positive;
  } else if (diffMin < 30) {
    dotColor = colors.gold;
  } else {
    dotColor = colors.negative;
  }

  // Human-readable label
  let label: string;
  if (diffMin < 1) {
    label = 'Updated just now';
  } else if (diffMin < 60) {
    label = `Updated ${diffMin}m ago`;
  } else {
    const hours = Math.floor(diffMin / 60);
    label = `Updated ${hours}h ago`;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
  },
});
