import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
}

export const InsightCard = React.memo(function InsightCard({
  icon,
  title,
  content,
  linkText,
  onPress,
  onDismiss,
  accentColor,
}: InsightCardProps) {
  const { colors } = useTheme();
  const accent = accentColor || colors.accent;

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: accent }]}
    >
      {/* Dismiss */}
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.dismissBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={16} color={colors.tabInactive} />
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

      {/* Link */}
      <Text style={[styles.link, { color: accent }]}>{linkText}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 0.5,
    borderLeftWidth: 3,
    padding: 16,
    paddingRight: 36,
    marginBottom: 10,
  },
  dismissBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
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
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
});
