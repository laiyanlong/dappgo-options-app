import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../../src/theme';
import { ErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { useWatchlistStore } from '../../src/store/watchlist-store';
import { useAppStore } from '../../src/store/app-store';
import { useSettingsStore } from '../../src/store/settings-store';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabBarIcon({ name, color, size, badge }: { name: IoniconsName; color: string; size: number; badge?: number }) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {badge != null && badge > 0 && (
        <View style={badgeStyles.container}>
          <Text style={badgeStyles.text}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

function TabNavigator() {
  const { colors } = useTheme();

  // Badge data
  const watchlistCount = useWatchlistStore((s) => s.items.length);
  const reportDatesCount = useAppStore((s) => s.reportDates.length);
  const lastViewedReportCount = useSettingsStore((s) => s.lastViewedReportCount);
  const unreadReports = Math.max(0, reportDatesCount - lastViewedReportCount);

  // Matrix badge: show watchlist count as indicator for "items to review"
  const matrixBadge = watchlistCount > 0 ? watchlistCount : undefined;
  const reportsBadge = unreadReports > 0 ? unreadReports : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="document-text" color={color} size={size} badge={reportsBadge} />
          ),
        }}
      />
      <Tabs.Screen
        name="backtest"
        options={{
          title: 'Backtest',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="trending-up" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="matrix"
        options={{
          title: 'Matrix',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="grid" color={color} size={size} badge={matrixBadge} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#ff3b30',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default function TabLayout() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <TabNavigator />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
