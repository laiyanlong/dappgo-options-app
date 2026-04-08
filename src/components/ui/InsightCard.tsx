import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { CARD_RADIUS, cardShadow } from './Card';

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
  const { colors, isDark } = useTheme();
  const accent = accentColor || colors.accent;
  const shadow = cardShadow(isDark);

  // Peek layer colors — progressively lighter/darker to create depth
  const peekBg2 = isDark ? '#1e1e42' : '#edeef4';
  const peekBg3 = isDark ? '#252550' : '#e4e5ee';
  const peekBorder = isDark ? '#2e2e58' : '#d4d6e0';

  return (
    <View style={[styles.stackContainer, { marginBottom: stackBehind >= 2 ? 16 : stackBehind >= 1 ? 10 : 4 }]}>
      {/* ── 3rd peek layer (deepest) ── */}
      {stackBehind >= 2 && (
        <View
          style={[
            styles.peekLayer,
            styles.peekLayer3,
            { backgroundColor: peekBg3, borderColor: peekBorder },
          ]}
        />
      )}

      {/* ── 2nd peek layer ── */}
      {stackBehind >= 1 && (
        <View
          style={[
            styles.peekLayer,
            styles.peekLayer2,
            { backgroundColor: peekBg2, borderColor: peekBorder },
            Platform.select({
              ios: isDark
                ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4 }
                : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
              android: { elevation: 2 },
            }),
          ]}
        />
      )}

      {/* ── Top card ── */}
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderLeftColor: accent,
          },
          shadow,
        ]}
      >
        {/* Dismiss */}
        <TouchableOpacity
          onPress={onDismiss}
          style={[styles.dismissBtn, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={14} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: accent + '18' }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          <Text style={[styles.title, { color: colors.textHeading }]}>{title}</Text>
        </View>

        {/* Content */}
        <Text
          style={[styles.content, { color: colors.text }]}
          numberOfLines={3}
        >
          {content}
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.linkPill, { backgroundColor: accent + '14' }]}>
            <Text style={[styles.link, { color: accent }]}>{linkText}</Text>
          </View>
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
  },

  // Back layers — visible edges create physical deck illusion
  peekLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderLeftWidth: 5,
    borderLeftColor: 'transparent',
  },
  peekLayer2: {
    top: 7,
    bottom: -7,
    marginHorizontal: 8,
  },
  peekLayer3: {
    top: 14,
    bottom: -14,
    marginHorizontal: 16,
  },

  // Top card
  card: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderLeftWidth: 5,
    padding: 16,
    paddingRight: 44,
  },
  dismissBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
  },
  swipeHint: {
    fontSize: 11,
  },
});
