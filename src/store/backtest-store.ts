import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BacktestInput, BacktestResult } from '../utils/types';

interface BacktestState {
  // Current backtest config
  mode: 'simple' | 'advanced';
  simpleInput: {
    symbol: string;
    strategy: BacktestInput['strategy'];
    otmPct: number;
    period: BacktestInput['period'];
  };

  // Advanced mode portfolio
  portfolio: BacktestInput[];

  // Results
  results: BacktestResult[];
  savedResults: BacktestResult[];

  // Actions
  setMode: (mode: 'simple' | 'advanced') => void;
  setSimpleInput: (input: Partial<BacktestState['simpleInput']>) => void;
  addToPortfolio: (input: BacktestInput) => void;
  removeFromPortfolio: (index: number) => void;
  clearPortfolio: () => void;
  setResults: (results: BacktestResult[]) => void;
  saveResult: (result: BacktestResult) => void;
  clearResults: () => void;
}

export const useBacktestStore = create<BacktestState>()(
  persist(
    (set) => ({
      mode: 'simple',
      simpleInput: {
        symbol: 'TSLA',
        strategy: 'sell_put',
        otmPct: 5,
        period: '6mo',
      },
      portfolio: [],
      results: [],
      savedResults: [],

      setMode: (mode) => set({ mode }),
      setSimpleInput: (input) =>
        set((s) => ({ simpleInput: { ...s.simpleInput, ...input } })),
      addToPortfolio: (input) =>
        set((s) => ({ portfolio: [...s.portfolio, input] })),
      removeFromPortfolio: (index) =>
        set((s) => ({
          portfolio: s.portfolio.filter((_, i) => i !== index),
        })),
      clearPortfolio: () => set({ portfolio: [] }),
      setResults: (results) => set({ results }),
      saveResult: (result) =>
        set((s) => ({ savedResults: [...s.savedResults, result] })),
      clearResults: () => set({ results: [] }),
    }),
    {
      name: 'dappgo-backtest',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        mode: state.mode,
        simpleInput: state.simpleInput,
        savedResults: state.savedResults,
      }),
    }
  )
);
