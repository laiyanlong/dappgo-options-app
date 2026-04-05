import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface TabPageProps {
  /** Page title displayed at the top */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Page content */
  children: React.ReactNode;
  /** Pull-to-refresh handler. When provided, enables pull-to-refresh. */
  onRefresh?: () => Promise<void>;
  /** Whether the page is in a loading state (shows RefreshControl) */
  loading?: boolean;
  /** Additional style applied to the ScrollView */
  style?: StyleProp<ViewStyle>;
  /** Additional style applied to the content container */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Whether to use ScrollView (true, default) or plain View */
  scrollable?: boolean;
}

/**
 * Consistent tab page wrapper used by all tabs.
 * Handles safe area insets, page title, subtitle, pull-to-refresh, and scroll behavior.
 */
export function TabPage({
  title,
  subtitle,
  children,
  onRefresh,
  loading = false,
  style,
  contentContainerStyle,
  scrollable = true,
}: TabPageProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const headerContent = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.textHeading }]}>{title}</Text>
      {subtitle != null && (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      )}
    </View>
  );

  if (!scrollable) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top + 8 },
          style,
        ]}
      >
        {headerContent}
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 8 },
        style,
      ]}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      bounces
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {headerContent}
      {children}
      {/* Bottom spacer for tab bar */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 48,
  },
});
