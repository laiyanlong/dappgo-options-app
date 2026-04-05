import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface SectionHeaderAction {
  label: string;
  onPress: () => void;
}

interface SectionHeaderProps {
  /** Section title text */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Optional right-side action button (e.g. "See All") */
  action?: SectionHeaderAction;
  /** Optional Ionicons icon name to show before the title */
  icon?: string;
}

/**
 * Consistent section header used across all tabs.
 * Renders a title (18pt semibold), optional subtitle, and optional action.
 */
export function SectionHeader({ title, subtitle, action, icon }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.leftGroup}>
          {icon != null && (
            <Ionicons
              name={icon as React.ComponentProps<typeof Ionicons>['name']}
              size={18}
              color={colors.textHeading}
              style={styles.icon}
            />
          )}
          <Text style={[styles.title, { color: colors.textHeading }]}>{title}</Text>
        </View>
        {action != null && (
          <TouchableOpacity onPress={action.onPress} activeOpacity={0.7} hitSlop={8}>
            <Text style={[styles.actionLabel, { color: colors.accent }]}>
              {action.label} {'\u2192'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {subtitle != null && (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
