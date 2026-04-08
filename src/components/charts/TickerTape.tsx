import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface TickerTapePrice {
  symbol: string;
  price: number;
  changePct: number;
}

interface TickerTapeProps {
  /** Array of price entries to display in the scrolling tape */
  prices: TickerTapePrice[];
  /** Background color of the tape bar */
  backgroundColor?: string;
  /** Primary text color for symbol and price (defaults to #ffffff) */
  textColor?: string;
  /** Muted text color for separator (defaults to #444) */
  textMutedColor?: string;
}

/**
 * Bloomberg-style horizontal auto-scrolling ticker tape.
 * Content is duplicated for seamless looping via Animated.loop.
 */
export function TickerTape({
  prices,
  backgroundColor = '#0a0a1a',
  textColor = '#ffffff',
  textMutedColor = '#444',
}: TickerTapeProps) {
  const scrollAnim = useRef(new Animated.Value(0)).current;

  // Each ticker item is roughly 200px wide; duplicate for seamless loop
  const contentWidth = prices.length * 200;

  useEffect(() => {
    if (prices.length === 0) return;

    scrollAnim.setValue(0);
    const animation = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -contentWidth,
        duration: prices.length * 4000, // ~4s per ticker
        useNativeDriver: true,
      }),
    );
    animation.start();

    return () => animation.stop();
  }, [prices.length, contentWidth, scrollAnim]);

  if (prices.length === 0) return null;

  const renderItems = (keyPrefix: string) =>
    prices.map((p) => {
      const isPositive = p.changePct >= 0;
      const arrow = isPositive ? '\u25B2' : '\u25BC';
      const color = isPositive ? '#00e676' : '#ff5252';
      const sign = isPositive ? '+' : '';

      return (
        <View key={`${keyPrefix}-${p.symbol}`} style={styles.item}>
          <Text style={[styles.symbol, { color: textColor }]}>{p.symbol}</Text>
          <Text style={[styles.price, { color: textColor }]}>${p.price.toFixed(2)}</Text>
          <Text style={[styles.change, { color }]}>
            {arrow}{sign}{p.changePct.toFixed(1)}%
          </Text>
          <Text style={[styles.separator, { color: textMutedColor }]}>|</Text>
        </View>
      );
    });

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Animated.View
        style={[
          styles.scrollRow,
          { transform: [{ translateX: scrollAnim }] },
        ]}
      >
        {/* Render content twice for seamless loop */}
        {renderItems('a')}
        {renderItems('b')}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 32,
    overflow: 'hidden',
    justifyContent: 'center',
    marginBottom: 8,
    borderRadius: 4,
  },
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    width: 200,
  },
  symbol: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  price: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  change: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '700',
  },
  separator: {
    fontFamily: 'Courier',
    fontSize: 12,
    marginLeft: 8,
  },
});
