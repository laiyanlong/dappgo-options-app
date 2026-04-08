import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface InsightCardProps {
  icon: string;
  title: string;
  content: string;
  linkText: string;
  onPress: () => void;
  onDismiss: () => void;
  accentColor?: string;
  /** How many cards are stacked behind this one (0 = no peek layers) */
  stackBehind?: number;
  /** Hint text shown when there are more cards */
  dismissHint?: string;
}

export const InsightCard = React.memo(function InsightCard({
  icon,
  title,
  content,
  linkText,
  onPress,
  onDismiss,
  accentColor,
  stackBehind = 0,
  dismissHint,
}: InsightCardProps) {
  const { colors } = useTheme();
  const accent = accentColor || colors.accent;

  return (
    <View style={styles.stackContainer}>
      {/* ── Peek layers (back cards) ── */}
      {stackBehind >= 2 && (
        <View
          style={[
            styles.peekLayer,
            styles.peekLayer3,
            { backgroundColor: colors.backgroundAlt, borderColor: colors.border },
          ]}
        />
      )}
      {stackBehind >= 1 && (
        <View
          style={[
            styles.peekLayer,
            styles.peekLayer2,
            { backgroundColor: colors.cardHover || colors.backgroundAlt, borderColor: colors.border },
          ]}
        />
      )}

      {/* ── Top card ── */}
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={onPress}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: accent }]}
      >
        {/* Dismiss */}
        <TouchableOpacity
          onPress={onDismiss}
          style={[styles.dismissBtn, { backgroundColor: colors.backgroundAlt }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={14} color={colors.tabInactive} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[styles.title, { color: colors.textHeading }]}>{title}</Text>
        </View>

        {/* Content */}
        <Text
          style={[styles.content, { color: colors.text }]}
          numberOfLines={3}
        >
          {content}
        </Text>

        {/* Footer: link + swipe hint */}
        <View style={styles.footer}>
          <Text style={[styles.link, { color: accent }]}>{linkText}</Text>
          {stackBehind > 0 && dismissHint && (
            <Text style={[styles.swipeHint, { color: colors.textMuted }]}>
              {dismissHint}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  stackContainer: {
    position: 'relative',
    // Extra bottom space for peek layers
    marginBottom: 6,
  },

  // Back layers peeking out
  peekLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '100%',
    borderRadius: 12,
    borderWidth: 0.5,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  peekLayer2: {
    top: 6,
    marginHorizontal: 6,
    opacity: 0.7,
  },
  peekLayer3: {
    top: 12,
    marginHorizontal: 12,
    opacity: 0.4,
  },

  // Top card
  card: {
    borderRadius: 12,
    borderWidth: 0.5,
    borderLeftWidth: 3,
    padding: 16,
    paddingRight: 40,
  },
  dismissBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
  swipeHint: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
