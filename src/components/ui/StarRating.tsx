import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface StarRatingProps {
  /** Score from 0 to 5 */
  score: number;
  /** Font size for star characters (default 16) */
  size?: number;
}

/**
 * Displays a star rating like ★★★☆☆.
 */
export function StarRating({ score, size = 16 }: StarRatingProps) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(5, Math.round(score)));
  const filled = '★'.repeat(clamped);
  const empty = '☆'.repeat(5 - clamped);

  return (
    <View style={styles.row}>
      <Text style={[styles.star, { fontSize: size, color: colors.gold }]}>
        {filled}
      </Text>
      <Text style={[styles.star, { fontSize: size, color: colors.tabInactive }]}>
        {empty}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  star: { lineHeight: undefined },
});
