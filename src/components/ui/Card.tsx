import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '../../theme';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'highlight';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: CardVariant;
  padding?: CardPadding;
}

const PADDING_MAP: Record<CardPadding, number> = {
  none: 0,
  sm: 8,
  md: 16,
  lg: 24,
};

/**
 * Unified card component — all cards in the app should use this or match its tokens.
 *
 * Design tokens (keep in sync across all card-like elements):
 *   borderRadius: 14
 *   borderWidth: 1 (default), 0 (elevated)
 *   shadow (dark):  offset 0,2  opacity 0.35  radius 8
 *   shadow (light): offset 0,1  opacity 0.06  radius 4
 */
export const CARD_RADIUS = 14;

export function Card({
  children,
  style,
  onPress,
  variant = 'default',
  padding = 'md',
}: CardProps) {
  const { colors, isDark } = useTheme();

  const variantStyle = getVariantStyle(variant, colors, isDark);
  const cardStyle: ViewStyle[] = [
    styles.card,
    { padding: PADDING_MAP[padding] },
    variantStyle,
    style as ViewStyle,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

/** Shared shadow style that any inline card can import */
export function cardShadow(isDark: boolean): ViewStyle {
  return Platform.select({
    ios: isDark
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 8 }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    android: { elevation: isDark ? 6 : 3 },
  }) as ViewStyle;
}

function getVariantStyle(
  variant: CardVariant,
  colors: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
): ViewStyle {
  const shadow = cardShadow(isDark);

  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: colors.card,
        borderColor: 'transparent',
        borderWidth: 0,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.4 : 0.1,
            shadowRadius: 14,
          },
          android: { elevation: isDark ? 10 : 5 },
        }),
      } as ViewStyle;

    case 'outlined':
      return {
        backgroundColor: 'transparent',
        borderColor: colors.border,
        borderWidth: 1,
      };

    case 'highlight':
      return {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderLeftColor: colors.gold,
        borderLeftWidth: 3,
        ...shadow,
      } as ViewStyle;

    case 'default':
    default:
      return {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        ...shadow,
      } as ViewStyle;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
    marginBottom: 12,
  },
});
