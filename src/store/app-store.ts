import { create } from 'zustand';
import type { StockQuote, DailyReport, ModelVerdict, StrikeComparison } from '../utils/types';

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

  // Matrix
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
  setTslaMatrix: (matrix) => set({ tslaMatrix: matrix }),
  setLoading: (key, value) => set({ [key]: value }),
}));
