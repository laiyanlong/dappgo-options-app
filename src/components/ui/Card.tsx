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
  /** Visual variant for the card */
  variant?: CardVariant;
  /** Padding preset */
  padding?: CardPadding;
}

const PADDING_MAP: Record<CardPadding, number> = {
  none: 0,
  sm: 8,
  md: 16,
  lg: 24,
};

/**
 * Reusable card component with themed border and background.
 * Supports variants: default, elevated, outlined, highlight.
 * Renders a TouchableOpacity when onPress is provided, otherwise a View.
 */
export function Card({
  children,
  style,
  onPress,
  variant = 'default',
  padding = 'md',
}: CardProps) {
  const { colors } = useTheme();

  const variantStyle = getVariantStyle(variant, colors);
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

function getVariantStyle(
  variant: CardVariant,
  colors: ReturnType<typeof useTheme>['colors'],
): ViewStyle {
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
            shadowOpacity: 0.25,
            shadowRadius: 12,
          },
          android: { elevation: 8 },
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
        borderWidth: 0.5,
        borderLeftColor: colors.gold,
        borderLeftWidth: 3,
        ...Platform.select({
          ios: {
            shadowColor: colors.gold,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
          },
          android: { elevation: 4 },
        }),
      } as ViewStyle;

    case 'default':
    default:
      return {
        backgroundColor: colors.card + 'ee', // slight transparency for glass effect
        borderColor: colors.border,
        borderWidth: 0.5,
      };
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 12,
  },
});
