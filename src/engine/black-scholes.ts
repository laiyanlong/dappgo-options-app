/**
 * Black-Scholes Option Pricing & Greeks
 * Pure TypeScript — no external dependencies
 */

// Standard normal CDF (Abramowitz & Stegun approximation)
function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1.0 / (1.0 + p * Math.abs(x));
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1.0 + sign * y);
}

// Standard normal PDF
function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface BSResult {
  price: number;
  greeks: Greeks;
}

/**
 * Calculate d1 and d2 for Black-Scholes
 */
function d1d2(
  spot: number,
  strike: number,
  T: number,
  r: number,
  sigma: number
): { d1: number; d2: number } {
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(spot / strike) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  return { d1, d2 };
}

/**
 * Black-Scholes option pricing with Greeks
 */
export function blackScholes(
  spot: number,
  strike: number,
  daysToExp: number,
  ivPct: number,
  optionType: 'call' | 'put' = 'put',
  riskFreeRate: number = 0.05
): BSResult | null {
  if (daysToExp <= 0 || ivPct <= 0 || strike <= 0 || spot <= 0) return null;

  const T = daysToExp / 365;
  const sigma = ivPct / 100;
  const sqrtT = Math.sqrt(T);
  const { d1, d2 } = d1d2(spot, strike, T, riskFreeRate, sigma);

  let price: number;
  let delta: number;
  let theta: number;

  const gamma = normPdf(d1) / (spot * sigma * sqrtT);
  const vega = spot * normPdf(d1) * sqrtT / 100; // per 1% move

  if (optionType === 'call') {
    price = spot * normCdf(d1) - strike * Math.exp(-riskFreeRate * T) * normCdf(d2);
    delta = normCdf(d1);
    theta = (-spot * normPdf(d1) * sigma / (2 * sqrtT)
      - riskFreeRate * strike * Math.exp(-riskFreeRate * T) * normCdf(d2)) / 365;
  } else {
    price = strike * Math.exp(-riskFreeRate * T) * normCdf(-d2) - spot * normCdf(-d1);
    delta = normCdf(d1) - 1;
    theta = (-spot * normPdf(d1) * sigma / (2 * sqrtT)
      + riskFreeRate * strike * Math.exp(-riskFreeRate * T) * normCdf(-d2)) / 365;
  }

  return {
    price: Math.max(0, price),
    greeks: {
      delta: round(delta, 4),
      gamma: round(gamma, 4),
      theta: round(theta, 4),
      vega: round(vega, 4),
    },
  };
}

/**
 * Calculate theoretical value at a specific DTE (for theta decay curve)
 */
export function theoreticalValue(
  spot: number,
  strike: number,
  currentDte: number,
  targetDte: number,
  ivPct: number,
  optionType: 'call' | 'put' = 'put',
  riskFreeRate: number = 0.05
): number {
  if (targetDte <= 0) {
    // At expiry: intrinsic value only
    return optionType === 'put'
      ? Math.max(0, strike - spot)
      : Math.max(0, spot - strike);
  }
  const result = blackScholes(spot, strike, targetDte, ivPct, optionType, riskFreeRate);
  return result?.price ?? 0;
}

export { normCdf, normPdf };

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
