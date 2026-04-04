import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../../src/theme';
import { ErrorBoundary } from '../../src/components/ui/ErrorBoundary';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabBarIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

function TabNavigator() {
  const { colors } = useTheme();

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
            <TabBarIcon name="document-text" color={color} size={size} />
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
            <TabBarIcon name="grid" color={color} size={size} />
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

export default function TabLayout() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <TabNavigator />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
