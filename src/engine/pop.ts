import { normCdf } from './black-scholes';

/**
 * Probability of Profit for selling options.
 *
 * Sell Put POP = P(stock >= strike at expiry) = N(d2)
 * Sell Call POP = P(stock <= strike at expiry) = 1 - N(d2)
 */
export function probabilityOfProfit(
  strike: number,
  currentPrice: number,
  daysToExp: number,
  ivPct: number,
  optionType: 'put' | 'call' = 'put',
  riskFreeRate: number = 0.05
): number {
  if (daysToExp <= 0 || ivPct <= 0 || strike <= 0 || currentPrice <= 0) {
    // At expiry with 0 DTE
    if (optionType === 'put') return currentPrice >= strike ? 100 : 0;
    return currentPrice <= strike ? 100 : 0;
  }

  const T = daysToExp / 365;
  const sigma = ivPct / 100;
  const d2 = (Math.log(currentPrice / strike) + (riskFreeRate - 0.5 * sigma * sigma) * T)
    / (sigma * Math.sqrt(T));

  if (optionType === 'put') {
    return Math.round(normCdf(d2) * 1000) / 10; // round to 1 decimal
  }
  return Math.round((1 - normCdf(d2)) * 1000) / 10;
}
