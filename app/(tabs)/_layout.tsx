import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../../src/theme';
import { ErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { useWatchlistStore } from '../../src/store/watchlist-store';
import { useAppStore } from '../../src/store/app-store';
import { useSettingsStore } from '../../src/store/settings-store';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Animated tab bar icon that scales up (1.0 -> 1.15) with a spring
 * animation when the tab becomes active, and fades the label in.
 */
function AnimatedTabBarIcon({
  name,
  color,
  size,
  focused,
  badge,
}: {
  name: IoniconsName;
  color: string;
  size: number;
  focused: boolean;
  badge?: number;
}) {
  const scale = useRef(new Animated.Value(focused ? 1.15 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  }, [focused, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View>
        <Ionicons name={name} size={size} color={color} />
        {badge != null && badge > 0 && (
          <View style={badgeStyles.container}>
            <Text style={badgeStyles.text}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Animated tab label that fades in when the tab is active.
 */
function AnimatedTabLabel({
  label,
  color,
  focused,
}: {
  label: string;
  color: string;
  focused: boolean;
}) {
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: focused ? 1 : 0.6,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [focused, opacity]);

  return (
    <Animated.Text
      style={[
        labelStyles.text,
        { color, opacity },
      ]}
    >
      {label}
    </Animated.Text>
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
        animation: 'shift',
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarAccessibilityLabel: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabBarIcon name="home" color={color} size={size} focused={focused} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel label="Dashboard" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarAccessibilityLabel: 'Reports',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabBarIcon name="document-text" color={color} size={size} focused={focused} badge={reportsBadge} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel label="Reports" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="backtest"
        options={{
          title: 'Backtest',
          tabBarAccessibilityLabel: 'Backtest',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabBarIcon name="trending-up" color={color} size={size} focused={focused} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel label="Backtest" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="matrix"
        options={{
          title: 'Matrix',
          tabBarAccessibilityLabel: 'Matrix',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabBarIcon name="grid" color={color} size={size} focused={focused} badge={matrixBadge} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel label="Matrix" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabBarIcon name="settings" color={color} size={size} focused={focused} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel label="Settings" color={color} focused={focused} />
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

const labelStyles = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: '600',
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
