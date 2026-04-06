import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { ThemeProvider } from '../src/theme';
import { startAutoRefresh } from '../src/data/refresh-engine';
import { NetworkBanner } from '../src/components/ui/NetworkBanner';
import { useSettingsStore } from '../src/store/settings-store';
import { useBacktestStore } from '../src/store/backtest-store';
import { useWatchlistStore } from '../src/store/watchlist-store';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Track store hydration so splash screen stays visible until data is ready
  const [storesHydrated, setStoresHydrated] = useState(false);

  useEffect(() => {
    // Wait for all persisted stores to rehydrate before showing UI
    const unsubs: (() => void)[] = [];
    let settled = false;

    const checkAll = () => {
      if (settled) return;
      const allReady =
        useSettingsStore.persist.hasHydrated() &&
        useBacktestStore.persist.hasHydrated() &&
        useWatchlistStore.persist.hasHydrated();
      if (allReady) {
        settled = true;
        setStoresHydrated(true);
      }
    };

    // Check immediately (may already be hydrated)
    checkAll();
    if (!settled) {
      unsubs.push(useSettingsStore.persist.onFinishHydration(checkAll));
      unsubs.push(useBacktestStore.persist.onFinishHydration(checkAll));
      unsubs.push(useWatchlistStore.persist.onFinishHydration(checkAll));
    }

    return () => unsubs.forEach((u) => u());
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    // Only hide splash after fonts AND stores are ready
    if (loaded && storesHydrated) {
      SplashScreen.hideAsync();
    }
  }, [loaded, storesHydrated]);

  if (!loaded || !storesHydrated) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // Start background auto-refresh when app mounts
  useEffect(() => {
    const cleanup = startAutoRefresh();
    return cleanup;
  }, []);

  return (
    <ThemeProvider>
      <NavThemeProvider value={{
        ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
        colors: {
          ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme).colors,
          background: colorScheme === 'dark' ? '#0c0c1d' : '#f5f6fa',
          card: colorScheme === 'dark' ? '#0c0c1d' : '#ffffff',
        },
      }}>
        <StatusBar barStyle="light-content" />
        <NetworkBanner />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="report/[date]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="glossary" options={{ headerShown: false }} />
          <Stack.Screen name="feedback" options={{ headerShown: false }} />
        </Stack>
      </NavThemeProvider>
    </ThemeProvider>
  );
}
