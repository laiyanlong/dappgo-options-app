import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SkeletonProps {
  /** Width of the skeleton placeholder */
  width: number;
  /** Height of the skeleton placeholder */
  height: number;
  /** Border radius (default 8) */
  borderRadius?: number;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
}

/**
 * Shimmer/pulse skeleton placeholder for loading states.
 * Animates opacity between 0.3 and 0.7 in a continuous loop.
 */
export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Pre-built skeleton layouts for common dashboard patterns */
export function DashboardSkeleton() {
  return (
    <>
      {/* 4 skeleton price cards (horizontal row) */}
      <Animated.View style={skeletonStyles.priceRow}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={90} height={72} borderRadius={12} />
        ))}
      </Animated.View>

      {/* 1 skeleton summary card */}
      <Skeleton
        width={SCREEN_WIDTH - 32}
        height={120}
        borderRadius={12}
        style={skeletonStyles.summaryCard}
      />

      {/* 2 skeleton top pick cards */}
      <Skeleton
        width={SCREEN_WIDTH - 32}
        height={88}
        borderRadius={12}
        style={skeletonStyles.pickCard}
      />
      <Skeleton
        width={SCREEN_WIDTH - 32}
        height={88}
        borderRadius={12}
        style={skeletonStyles.pickCard}
      />
    </>
  );
}

const skeletonStyles = StyleSheet.create({
  priceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  pickCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
});
