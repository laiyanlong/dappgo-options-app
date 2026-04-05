import { create } from 'zustand';

export interface CompareItem {
  symbol: string;
  strike: number;
  bid: number;
  iv: number;
  pop: number;
  annualized: number;
  delta: number;
  spreadQuality: string;
  expiry: string;
  dte: number;
}

const MAX_ITEMS = 5;

interface CompareState {
  items: CompareItem[];
  addItem: (item: CompareItem) => void;
  removeItem: (symbol: string, strike: number) => void;
  clearAll: () => void;
  hasItem: (symbol: string, strike: number) => boolean;
}

export const useCompareStore = create<CompareState>()((set, get) => ({
  items: [],

  addItem: (item) =>
    set((s) => {
      // Prevent duplicates
      if (s.items.some((i) => i.symbol === item.symbol && i.strike === item.strike)) {
        return s;
      }
      if (s.items.length >= MAX_ITEMS) return s;
      return { items: [...s.items, item] };
    }),

  removeItem: (symbol, strike) =>
    set((s) => ({
      items: s.items.filter((i) => !(i.symbol === symbol && i.strike === strike)),
    })),

  clearAll: () => set({ items: [] }),

  hasItem: (symbol, strike) =>
    get().items.some((i) => i.symbol === symbol && i.strike === strike),
}));
