import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface StarRatingProps {
  /** Score from 0 to 5 (supports half-stars, e.g. 3.7 shows 3 full + 1 half + 1 empty) */
  score: number;
  /** Font size for star characters (default 16) */
  size?: number;
}

/**
 * Displays a star rating with full, half, and empty stars.
 * Half-star logic: fractional part >= 0.25 and < 0.75 shows half star.
 */
export function StarRating({ score, size = 16 }: StarRatingProps) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(5, score));

  const fullCount = Math.floor(clamped);
  const fractional = clamped - fullCount;
  const hasHalf = fractional >= 0.25 && fractional < 0.75;
  const roundUp = fractional >= 0.75;
  const filledStars = roundUp ? fullCount + 1 : fullCount;
  const halfStars = hasHalf ? 1 : 0;
  const emptyStars = 5 - filledStars - halfStars;

  return (
    <View style={styles.row}>
      {/* Filled stars */}
      {filledStars > 0 && (
        <Text style={[styles.star, { fontSize: size, color: colors.gold }]}>
          {'\u2605'.repeat(filledStars)}
        </Text>
      )}
      {/* Half star — using a dimmer filled star to simulate */}
      {halfStars > 0 && (
        <View style={styles.halfStarContainer}>
          <Text style={[styles.star, { fontSize: size, color: colors.border }]}>
            {'\u2605'}
          </Text>
          <View style={[styles.halfStarOverlay, { width: size * 0.5 }]}>
            <Text style={[styles.star, { fontSize: size, color: colors.gold }]}>
              {'\u2605'}
            </Text>
          </View>
        </View>
      )}
      {/* Empty stars — very subtle, using border color */}
      {emptyStars > 0 && (
        <Text style={[styles.star, { fontSize: size, color: colors.border }]}>
          {'\u2605'.repeat(emptyStars)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  star: { lineHeight: undefined },
  halfStarContainer: {
    position: 'relative',
  },
  halfStarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
});
