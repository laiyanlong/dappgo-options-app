import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';

type BadgeSize = 'sm' | 'md' | 'lg';
type BadgeVariant = 'filled' | 'outlined' | 'soft';

interface BadgeProps {
  label: string;
  color: string;
  textColor?: string;
  /** Size preset (default: 'md') */
  size?: BadgeSize;
  /** Visual variant (default: 'soft') */
  variant?: BadgeVariant;
}

const SIZE_STYLES: Record<BadgeSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    text: { fontSize: 9, letterSpacing: 0.4 },
  },
  md: {
    container: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    text: { fontSize: 11, letterSpacing: 0.5 },
  },
  lg: {
    container: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
    text: { fontSize: 13, letterSpacing: 0.5 },
  },
};

/**
 * Small colored badge/tag for status indicators and labels.
 * Supports size ('sm' | 'md' | 'lg') and variant ('filled' | 'outlined' | 'soft').
 */
export function Badge({
  label,
  color,
  textColor,
  size = 'md',
  variant = 'soft',
}: BadgeProps) {
  const sizeStyle = SIZE_STYLES[size];
  const { containerStyle, labelColor } = getVariantStyle(variant, color, textColor);

  return (
    <View style={[styles.badge, sizeStyle.container, containerStyle]}>
      <Text style={[styles.text, sizeStyle.text, { color: labelColor }]}>
        {label}
      </Text>
    </View>
  );
}

function getVariantStyle(
  variant: BadgeVariant,
  color: string,
  textColor?: string,
): { containerStyle: ViewStyle; labelColor: string } {
  switch (variant) {
    case 'filled':
      return {
        containerStyle: { backgroundColor: color },
        labelColor: textColor ?? '#fff',
      };
    case 'outlined':
      return {
        containerStyle: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: color,
        },
        labelColor: textColor ?? color,
      };
    case 'soft':
    default:
      return {
        containerStyle: { backgroundColor: color + '26' }, // 15% opacity
        labelColor: textColor ?? color,
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
