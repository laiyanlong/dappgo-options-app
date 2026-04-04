import { probabilityOfProfit } from './pop';
import type { BacktestInput, BacktestResult } from '../utils/types';

/**
 * Run a backtest simulation on historical price data.
 *
 * @param prices Array of daily closing prices (oldest first)
 * @param dates Array of date strings matching prices
 * @param input Backtest parameters
 */
export function runBacktest(
  prices: number[],
  dates: string[],
  input: BacktestInput
): BacktestResult | null {
  if (prices.length < 30) return null;

  const holdingDays = input.holdingDays ?? 7;
  const otmPct = input.otmPct ?? 5;
  const trades: { date: string; entryPrice: number; exitPrice: number; strike: number; premium: number; pnl: number; win: boolean }[] = [];

  // Start from day 30 (need lookback for HV)
  for (let i = 30; i < prices.length - holdingDays; i++) {
    const entryPrice = prices[i];
    const exitPrice = prices[i + holdingDays];

    // Calculate strike
    let strike: number;
    if (input.strike) {
      strike = input.strike;
    } else {
      strike = input.strategy.includes('put')
        ? Math.round(entryPrice * (1 - otmPct / 100) * 100) / 100
        : Math.round(entryPrice * (1 + otmPct / 100) * 100) / 100;
    }

    // Estimate premium from HV
    const recentReturns = [];
    for (let j = i - 30; j < i; j++) {
      recentReturns.push((prices[j + 1] - prices[j]) / prices[j]);
    }
    const hv = std(recentReturns) * Math.sqrt(252);
    const premium = estimatePremium(entryPrice, strike, hv, holdingDays);

    // Determine outcome
    let pnl: number;
    let win: boolean;

    if (input.strategy === 'sell_put' || input.strategy === 'bull_put_spread') {
      win = exitPrice >= strike;
      pnl = win ? premium : premium - (strike - exitPrice);
    } else if (input.strategy === 'sell_call' || input.strategy === 'bear_call_spread') {
      win = exitPrice <= strike;
      pnl = win ? premium : premium - (exitPrice - strike);
    } else {
      // Iron condor: assume symmetric
      const putStrike = entryPrice * (1 - otmPct / 100);
      const callStrike = entryPrice * (1 + otmPct / 100);
      win = exitPrice >= putStrike && exitPrice <= callStrike;
      pnl = win ? premium : premium - Math.max(putStrike - exitPrice, exitPrice - callStrike, 0);
    }

    trades.push({ date: dates[i], entryPrice, exitPrice, strike, premium, pnl, win });
  }

  if (trades.length === 0) return null;

  // Calculate statistics
  const wins = trades.filter((t) => t.win);
  const losses = trades.filter((t) => !t.win);
  const pnls = trades.map((t) => t.pnl);
  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b.pnl, 0) / losses.length : 0;
  const totalProfit = wins.reduce((a, b) => a + b.pnl, 0);
  const totalLossAbs = Math.abs(losses.reduce((a, b) => a + b.pnl, 0));

  // Sharpe
  const avgReturn = totalPnl / trades.length;
  const stdReturn = std(pnls);
  const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  // Max drawdown
  let peak = 0;
  let maxDD = 0;
  let cumPnl = 0;
  const pnlCurve: { date: string; pnl: number }[] = [];
  for (const t of trades) {
    cumPnl += t.pnl;
    pnlCurve.push({ date: t.date, pnl: Math.round(cumPnl * 100) / 100 });
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak - cumPnl;
    if (dd > maxDD) maxDD = dd;
  }

  return {
    input,
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: Math.round((wins.length / trades.length) * 1000) / 10,
    totalPnl: Math.round(totalPnl * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    maxDrawdown: Math.round(maxDD * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: totalLossAbs > 0 ? Math.round((totalProfit / totalLossAbs) * 100) / 100 : 999,
    pop: 0, // Will be calculated separately
    annualized: 0, // Will be calculated separately
    rating: 0, // Will be calculated separately
    pnlCurve,
  };
}

function estimatePremium(spot: number, strike: number, hv: number, dte: number): number {
  // Simple premium estimate using BS approximation
  const T = dte / 365;
  const d1 = (Math.log(spot / strike) + (0.05 + 0.5 * hv * hv) * T) / (hv * Math.sqrt(T));
  const premium = spot * normPdf(d1) * hv * Math.sqrt(T);
  return Math.max(premium, spot * 0.002); // minimum 0.2% of spot
}

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sqDiffs = arr.map((v) => (v - avg) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / arr.length);
}
