import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ColorScheme } from './colors';
import { useSettingsStore } from '../store/settings-store';

type ThemeMode = 'dark' | 'light' | 'auto';

interface ThemeContextType {
  colors: ColorScheme;
  isDark: boolean;
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: darkColors,
  isDark: true,
  mode: 'auto',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);

  const value = useMemo(() => {
    const isDark =
      themeMode === 'auto'
        ? systemScheme !== 'light'
        : themeMode === 'dark';
    return {
      colors: isDark ? darkColors : lightColors,
      isDark,
      mode: themeMode,
    };
  }, [themeMode, systemScheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
