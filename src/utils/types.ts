// ── Stock & Price ──
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
  marketState: string;
  intradayPrices?: number[];
  intradayTimes?: string[];
}

// ── Options ──
export interface OptionEntry {
  strike: number;
  otmPct: number;
  bid: number;
  ask: number;
  mid: number;
  spreadPct: number;
  spreadQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  volume: number;
  oi: number;
  annualized: number;
  pop: number;
  cpScore: number;
  days: number;
}

export interface OptionsExpiry {
  date: string;
  dte: number;
  puts: OptionEntry[];
  calls: OptionEntry[];
}

// ── Report ──
export interface DailyReport {
  date: string;
  generatedAt?: string; // e.g. "2026-04-07 13:00"
  tickers: TickerReport[];
  modelVerdict?: ModelVerdict;
  aiCommentary?: string;
}

export interface TickerReport {
  symbol: string;
  price: number;
  changePct: number;
  avgIv: number;
  ivRank?: number;
  pcRatio?: { volumeRatio: number; oiRatio: number; signal: string };
  maxPain?: { price: number; distancePct: number; direction: string };
  expectedMove?: { dollar: number; pct: number; upper: number; lower: number };
  expiries: OptionsExpiry[];
  bestPut?: OptionEntry;
  bestCall?: OptionEntry;
}

// ── Model Verdict ──
export interface ModelVerdict {
  regime: { name: string; vix: number; hv20: number; positionSize: number; strategies: string[] };
  tickers: TickerVerdict[];
  correlation: { current: number; historical: number; regime: string; trend: string };
  overallConclusion: string;
}

export interface TickerVerdict {
  symbol: string;
  score: number;
  ivSignal: string;
  ivZscore: number;
  direction: string;
  directionConfidence: number;
  sellerEdge: number;
  verdict: string;
  suggestedTrade: string;
}

// ── Backtest ──
export interface BacktestInput {
  symbol: string;
  strategy: 'sell_put' | 'sell_call' | 'iron_condor' | 'bull_put_spread' | 'bear_call_spread';
  strike?: number;
  otmPct?: number;
  period: '3mo' | '6mo' | '1y' | '2y';
  holdingDays?: number;
}

export interface BacktestResult {
  input: BacktestInput;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  sharpe: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  pop: number;
  annualized: number;
  rating: number;
  pnlCurve: { date: string; pnl: number }[];
}

// ── Matrix ──
export interface StrikeComparison {
  price: number;
  expiries: {
    date: string;
    dte: number;
    puts: OptionEntry[];
    calls: OptionEntry[];
  }[];
}
