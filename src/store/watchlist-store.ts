import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WatchlistItem {
  symbol: string;
  strategy: string;
  strike: number;
  expiry: string;
  addedAt: string; // ISO date
  notes?: string;
}

interface WatchlistState {
  items: WatchlistItem[];
  addItem: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  removeItem: (index: number) => void;
  removeByKey: (symbol: string, strike: number) => void;
  clearAll: () => void;
  hasItem: (symbol: string, strike: number) => boolean;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((s) => ({
          items: [
            ...s.items,
            { ...item, addedAt: new Date().toISOString() },
          ],
        })),

      removeItem: (index) =>
        set((s) => ({
          items: s.items.filter((_, i) => i !== index),
        })),

      removeByKey: (symbol, strike) =>
        set((s) => ({
          items: s.items.filter(
            (it) => !(it.symbol === symbol && it.strike === strike)
          ),
        })),

      clearAll: () => set({ items: [] }),

      hasItem: (symbol, strike) =>
        get().items.some(
          (it) => it.symbol === symbol && it.strike === strike
        ),
    }),
    {
      name: 'dappgo-watchlist',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
