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
 * Clean, emoji-rich format designed for sharing on social media and messaging.
 */
export function backtestToShareText(result: BacktestResult): string {
  const { input } = result;
  const otmStr = input.otmPct ? `${input.otmPct}% OTM` : '';
  const parts = [input.symbol, strategyLabel(input.strategy), otmStr, input.period].filter(Boolean);
  const sep = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
  const pnlSign = result.totalPnl >= 0 ? '+' : '';
  const ddSign = result.maxDrawdown >= 0 ? '-' : '';

  const lines = [
    '\uD83D\uDCCA DappGo Options Backtest',
    sep,
    parts.join(' | '),
    sep,
    `\u2705 Win Rate: ${result.winRate}%`,
    `\uD83D\uDCB0 Total P&L: ${pnlSign}$${result.totalPnl.toFixed(2)}`,
    `\uD83D\uDCC8 Sharpe: ${result.sharpe.toFixed(2)}`,
    `\uD83D\uDCC9 Max DD: ${ddSign}$${Math.abs(result.maxDrawdown).toFixed(2)}`,
    `\u2696\uFE0F Profit Factor: ${result.profitFactor >= 999 ? 'INF' : result.profitFactor.toFixed(1)}`,
    `\uD83D\uDD22 Trades: ${result.trades}`,
    sep,
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
