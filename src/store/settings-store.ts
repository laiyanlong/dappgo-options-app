import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  themeMode: 'dark' | 'light' | 'auto';
  language: 'zh' | 'en';
  tickers: string[];
  githubUsername: string;
  githubRepo: string;
  geminiApiKey: string;
  alphaVantageKey: string;
  notifications: {
    dailyReport: boolean;
    highCpAlert: boolean;
    ivSpikeAlert: boolean;
  };
  setThemeMode: (mode: 'dark' | 'light' | 'auto') => void;
  setLanguage: (lang: 'zh' | 'en') => void;
  setTickers: (tickers: string[]) => void;
  addTicker: (ticker: string) => void;
  removeTicker: (ticker: string) => void;
  setGithubUsername: (username: string) => void;
  setGithubRepo: (repo: string) => void;
  setGeminiApiKey: (key: string) => void;
  setAlphaVantageKey: (key: string) => void;
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
      geminiApiKey: '',
      alphaVantageKey: '',
      notifications: {
        dailyReport: true,
        highCpAlert: true,
        ivSpikeAlert: false,
      },
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
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setAlphaVantageKey: (key) => set({ alphaVantageKey: key }),
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
