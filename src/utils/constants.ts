export const DEFAULT_TICKERS = ['TSLA', 'AMZN', 'NVDA'];

export const GITHUB_OWNER = 'laiyanlong';
export const GITHUB_REPO = 'options-daily-report';
export const GITHUB_API_BASE = 'https://api.github.com';

export const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

export const CACHE_TTL = {
  reports: Infinity,        // Reports never change
  prices: 5 * 60 * 1000,   // 5 minutes
  optionsChain: 60 * 60 * 1000, // 1 hour
  dashboardData: 30 * 60 * 1000, // 30 minutes
};

export const MIN_DTE = 5;
export const MIN_PREMIUM = 1.0;
export const MAX_PREMIUM = 7.0;
export const OTM_PCTS = [5, 6, 7, 8, 9, 10];
export const RISK_FREE_RATE = 0.05;
