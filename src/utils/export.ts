import type { BacktestResult } from './types';
import type { WatchlistItem } from '../store/watchlist-store';

/**
 * Format a backtest strategy key into a human-readable label.
 */
function strategyLabel(strategy: string): string {
  const map: Record<string, string> = {
    sell_put: 'Sell Put',
    sell_call: 'Sell Call',
    iron_condor: 'Iron Condor',
    bull_put_spread: 'Bull Put Spread',
    bear_call_spread: 'Bear Call Spread',
  };
  return map[strategy] ?? strategy;
}

/**
 * Generate a shareable plain-text summary of backtest results.
 */
export function backtestToShareText(result: BacktestResult): string {
  const { input } = result;
  const otmStr = input.otmPct ? `${input.otmPct}% OTM` : '';
  const parts = [input.symbol, strategyLabel(input.strategy), otmStr, input.period].filter(Boolean);

  const lines = [
    'DappGo Options Backtest Results',
    '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
    parts.join(' | '),
    '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
    `Win Rate: ${result.winRate}%`,
    `Total P&L: $${result.totalPnl.toFixed(2)}`,
    `Sharpe Ratio: ${result.sharpe.toFixed(2)}`,
    `Max Drawdown: $${result.maxDrawdown.toFixed(2)}`,
    `Profit Factor: ${result.profitFactor >= 999 ? 'INF' : result.profitFactor.toFixed(1)}`,
    `Trades: ${result.trades}`,
    '',
    'Powered by DappGo Options',
    'dappgo.com',
  ];

  return lines.join('\n');
}

/**
 * Generate CSV string from backtest pnlCurve data.
 * Headers: Date, P&L, Cumulative P&L
 */
export function backtestToCsv(result: BacktestResult): string {
  const rows: string[] = ['Date,P&L,Cumulative P&L'];
  let cumulative = 0;

  for (const point of result.pnlCurve) {
    cumulative += point.pnl;
    rows.push(`${point.date},${point.pnl.toFixed(2)},${cumulative.toFixed(2)}`);
  }

  return rows.join('\n');
}

/**
 * Generate a shareable plain-text summary of watchlist items.
 */
export function watchlistToShareText(items: WatchlistItem[]): string {
  if (items.length === 0) {
    return 'DappGo Options Watchlist\n(empty)';
  }

  const header = [
    'DappGo Options Watchlist',
    '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
    `${items.length} item${items.length !== 1 ? 's' : ''}`,
    '',
  ];

  const rows = items.map((item) => {
    const parts = [
      item.symbol,
      item.strategy,
      `$${item.strike}`,
      `Exp: ${item.expiry}`,
    ];
    const line = parts.join(' | ');
    return item.notes ? `${line}\n  Note: ${item.notes}` : line;
  });

  const footer = ['', 'Powered by DappGo Options', 'dappgo.com'];

  return [...header, ...rows, ...footer].join('\n');
}
