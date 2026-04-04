import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  themeMode: 'dark' | 'light' | 'auto';
  language: 'zh' | 'en';
  tickers: string[];
  githubUsername: string;
  githubRepo: string;
  hasCompletedOnboarding: boolean;
  notifications: {
    dailyReport: boolean;
    highCpAlert: boolean;
    ivSpikeAlert: boolean;
  };
  lastViewedReportCount: number;
  lastViewedMatrixCount: number;
  setLastViewedReportCount: (count: number) => void;
  setLastViewedMatrixCount: (count: number) => void;
  setThemeMode: (mode: 'dark' | 'light' | 'auto') => void;
  setLanguage: (lang: 'zh' | 'en') => void;
  setTickers: (tickers: string[]) => void;
  addTicker: (ticker: string) => void;
  removeTicker: (ticker: string) => void;
  setGithubUsername: (username: string) => void;
  setGithubRepo: (repo: string) => void;
  setHasCompletedOnboarding: (value: boolean) => void;
  setNotification: (key: keyof SettingsState['notifications'], value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'dark',
      language: 'zh',
      tickers: ['TSLA', 'AMZN', 'NVDA'],
      githubUsername: 'laiyanlong',
      githubRepo: 'options-daily-report',
      hasCompletedOnboarding: false,
      notifications: {
        dailyReport: true,
        highCpAlert: true,
        ivSpikeAlert: false,
      },
      lastViewedReportCount: 0,
      lastViewedMatrixCount: 0,
      setLastViewedReportCount: (count) => set({ lastViewedReportCount: count }),
      setLastViewedMatrixCount: (count) => set({ lastViewedMatrixCount: count }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setLanguage: (lang) => set({ language: lang }),
      setTickers: (tickers) => set({ tickers }),
      addTicker: (ticker) =>
        set((s) => ({
          tickers: s.tickers.includes(ticker.toUpperCase())
            ? s.tickers
            : [...s.tickers, ticker.toUpperCase()],
        })),
      removeTicker: (ticker) =>
        set((s) => ({
          tickers: s.tickers.filter((t) => t !== ticker.toUpperCase()),
        })),
      setGithubUsername: (username) => set({ githubUsername: username }),
      setGithubRepo: (repo) => set({ githubRepo: repo }),
      setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
      setNotification: (key, value) =>
        set((s) => ({
          notifications: { ...s.notifications, [key]: value },
        })),
    }),
    {
      name: 'dappgo-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
