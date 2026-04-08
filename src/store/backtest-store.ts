import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BacktestInput, BacktestResult } from '../utils/types';

export interface SavedBacktestResult extends BacktestResult {
  /** ISO timestamp when the result was saved */
  savedAt: string;
}

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
  savedResults: SavedBacktestResult[];

  // Flag to auto-run backtest after navigating from dashboard
  pendingAutoRun: boolean;

  // Actions
  setMode: (mode: 'simple' | 'advanced') => void;
  setSimpleInput: (input: Partial<BacktestState['simpleInput']>) => void;
  addToPortfolio: (input: BacktestInput) => void;
  removeFromPortfolio: (index: number) => void;
  clearPortfolio: () => void;
  setResults: (results: BacktestResult[]) => void;
  saveResult: (result: BacktestResult) => void;
  removeSavedResult: (index: number) => void;
  clearResults: () => void;
  setPendingAutoRun: (pending: boolean) => void;
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
      pendingAutoRun: false,

      setMode: (mode) => set({ mode }),
      setSimpleInput: (input) =>
        set((s) => ({ simpleInput: { ...s.simpleInput, ...input } })),
      addToPortfolio: (input) =>
        set((s) => {
          // Deduplicate: same symbol + strategy + strike
          const isDuplicate = s.portfolio.some(
            (p) => p.symbol === input.symbol && p.strategy === input.strategy && p.strike === input.strike
          );
          if (isDuplicate) return s;
          return { portfolio: [...s.portfolio, input] };
        }),
      removeFromPortfolio: (index) =>
        set((s) => ({
          portfolio: s.portfolio.filter((_, i) => i !== index),
        })),
      clearPortfolio: () => set({ portfolio: [] }),
      setResults: (results) => set({ results }),
      saveResult: (result) =>
        set((s) => {
          // Prevent exact duplicates (same symbol + strategy + trades + pnl)
          const isDuplicate = s.savedResults.some(
            (sr) =>
              sr.input.symbol === result.input.symbol &&
              sr.input.strategy === result.input.strategy &&
              sr.trades === result.trades &&
              sr.totalPnl === result.totalPnl
          );
          if (isDuplicate) return s;
          return {
            savedResults: [
              ...s.savedResults,
              { ...result, savedAt: new Date().toISOString() },
            ],
          };
        }),
      removeSavedResult: (index) =>
        set((s) => ({
          savedResults: s.savedResults.filter((_, i) => i !== index),
        })),
      clearResults: () => set({ results: [] }),
      setPendingAutoRun: (pending) => set({ pendingAutoRun: pending }),
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
