import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

/**
 * Reusable card component with themed border and background.
 * Renders a TouchableOpacity when onPress is provided, otherwise a View.
 */
export function Card({ children, style, onPress }: CardProps) {
  const { colors } = useTheme();

  const cardStyle: ViewStyle[] = [
    styles.card,
    { backgroundColor: colors.card, borderColor: colors.border },
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
});
