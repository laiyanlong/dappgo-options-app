import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface EmptyStateProps {
  /** Large emoji displayed above the message */
  emoji: string;
  /** Primary message text */
  message: string;
  /** Optional secondary hint text */
  hint?: string;
}

/**
 * Consistent empty-state placeholder used across tabs
 * when no data is available. Shows a large emoji, a muted message,
 * and an optional hint.
 */
export function EmptyState({ emoji, message, hint }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      {hint && (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
  },
});
