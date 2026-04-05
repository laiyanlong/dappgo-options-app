/**
 * Deep link generators for DappGo Options App.
 * Scheme: dappgooptionsapp://
 */

/** Generate a shareable deep link to a report by date. */
export function generateReportLink(date: string): string {
  return `dappgooptionsapp://report/${date}`;
}

/** Generate a shareable deep link to a backtest configuration. */
export function generateBacktestLink(
  symbol: string,
  strategy: string,
  otmPct: number
): string {
  return `dappgooptionsapp://backtest?symbol=${encodeURIComponent(symbol)}&strategy=${encodeURIComponent(strategy)}&otm=${otmPct}`;
}

/** Generate a shareable deep link to the matrix view for a symbol. */
export function generateMatrixLink(symbol: string): string {
  return `dappgooptionsapp://matrix?symbol=${encodeURIComponent(symbol)}`;
}
