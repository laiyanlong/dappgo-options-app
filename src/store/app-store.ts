import { create } from 'zustand';
import type { StockQuote, DailyReport, StrikeComparison } from '../utils/types';

interface AppState {
  // Live data
  quotes: Record<string, StockQuote>;
  lastQuoteUpdate: number;

  // Reports
  reportDates: string[];
  reports: Record<string, DailyReport>;
  latestReportDate: string | null;

  // Dashboard data (from data.json)
  dashboardData: Record<string, unknown> | null;

  // Options matrices (per ticker)
  matrices: Record<string, StrikeComparison>;

  // Legacy alias
  tslaMatrix: StrikeComparison | null;

  // Loading states
  isLoadingQuotes: boolean;
  isLoadingReports: boolean;
  isLoadingDashboard: boolean;

  // Actions
  setQuote: (symbol: string, quote: StockQuote) => void;
  setQuotes: (quotes: Record<string, StockQuote>) => void;
  setReportDates: (dates: string[]) => void;
  setReport: (date: string, report: DailyReport) => void;
  setLatestReportDate: (date: string) => void;
  setDashboardData: (data: Record<string, unknown>) => void;
  setMatrix: (symbol: string, matrix: StrikeComparison) => void;
  setTslaMatrix: (matrix: StrikeComparison) => void;
  setLoading: (key: 'isLoadingQuotes' | 'isLoadingReports' | 'isLoadingDashboard', value: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  quotes: {},
  lastQuoteUpdate: 0,
  reportDates: [],
  reports: {},
  latestReportDate: null,
  dashboardData: null,
  matrices: {},
  tslaMatrix: null,
  isLoadingQuotes: false,
  isLoadingReports: false,
  isLoadingDashboard: false,

  setQuote: (symbol, quote) =>
    set((s) => ({
      quotes: { ...s.quotes, [symbol]: quote },
      lastQuoteUpdate: Date.now(),
    })),
  setQuotes: (quotes) => set({ quotes, lastQuoteUpdate: Date.now() }),
  setReportDates: (dates) => set({ reportDates: dates }),
  setReport: (date, report) =>
    set((s) => ({ reports: { ...s.reports, [date]: report } })),
  setLatestReportDate: (date) => set({ latestReportDate: date }),
  setDashboardData: (data) => set({ dashboardData: data }),
  setMatrix: (symbol, matrix) =>
    set((s) => ({
      matrices: { ...s.matrices, [symbol]: matrix },
      // Keep tslaMatrix updated for backward compat
      tslaMatrix: symbol === 'TSLA' ? matrix : s.tslaMatrix,
    })),
  setTslaMatrix: (matrix) =>
    set((s) => ({
      tslaMatrix: matrix,
      matrices: { ...s.matrices, TSLA: matrix },
    })),
  setLoading: (key, value) => set({ [key]: value }),
}));
