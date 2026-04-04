/**
 * IV Mean Reversion Analysis
 * Predicts IV direction based on historical z-score.
 */

export interface IVAnalysis {
  currentIv: number;
  mean: number;
  std: number;
  zScore: number;
  percentile: number;
  upperBand: number;
  lowerBand: number;
  signal: 'Strong Sell' | 'Sell' | 'Neutral' | 'Buy' | 'Strong Buy';
}

/**
 * Analyze IV relative to historical volatility.
 * @param currentIv Current implied volatility %
 * @param historicalReturns Array of daily returns (e.g., 252 days)
 * @param window Rolling window for HV calculation (default 30)
 */
export function analyzeIV(
  currentIv: number,
  historicalReturns: number[],
  window: number = 30
): IVAnalysis | null {
  if (historicalReturns.length < window + 10) return null;

  // Calculate rolling HV
  const hvValues: number[] = [];
  for (let i = window; i <= historicalReturns.length; i++) {
    const slice = historicalReturns.slice(i - window, i);
    const std = standardDeviation(slice);
    hvValues.push(std * Math.sqrt(252) * 100); // annualized %
  }

  if (hvValues.length < 10) return null;

  const mean = average(hvValues);
  const std = standardDeviation(hvValues);
  const zScore = std > 0 ? (currentIv - mean) / std : 0;
  const percentile = clamp(((currentIv - Math.min(...hvValues)) / (Math.max(...hvValues) - Math.min(...hvValues) || 1)) * 100, 0, 100);

  let signal: IVAnalysis['signal'];
  if (zScore > 1.5) signal = 'Strong Sell';
  else if (zScore > 0.5) signal = 'Sell';
  else if (zScore < -1.5) signal = 'Strong Buy';
  else if (zScore < -0.5) signal = 'Buy';
  else signal = 'Neutral';

  return {
    currentIv,
    mean: round(mean),
    std: round(std),
    zScore: round(zScore),
    percentile: round(percentile),
    upperBand: round(mean + 1.5 * std),
    lowerBand: round(mean - 1.5 * std),
    signal,
  };
}

/**
 * Classify volatility regime based on HV and VIX.
 */
export type VolRegime = 'low_vol' | 'normal' | 'high_vol' | 'crisis';

export interface RegimeResult {
  regime: VolRegime;
  hv20: number;
  score: number;
  positionSizeMultiplier: number;
  strategies: string[];
}

export function classifyRegime(hv20: number, vix?: number): RegimeResult {
  const effectiveVol = vix ?? hv20;
  let regime: VolRegime;
  let multiplier: number;
  let strategies: string[];

  if (effectiveVol > 35 || hv20 > 35) {
    regime = 'crisis';
    multiplier = 0.25;
    strategies = ['Far OTM only', 'Cash position', 'Reduce all exposure'];
  } else if (effectiveVol > 22 || hv20 > 20) {
    regime = 'high_vol';
    multiplier = 0.5;
    strategies = ['Iron Condor', 'Bull Put Spread', 'Bear Call Spread'];
  } else if (effectiveVol > 15 || hv20 > 12) {
    regime = 'normal';
    multiplier = 0.8;
    strategies = ['Sell Put', 'Sell Call', 'Strangle'];
  } else {
    regime = 'low_vol';
    multiplier = 1.0;
    strategies = ['Sell Put', 'Sell Call', 'Wheel Strategy'];
  }

  const score = clamp(Math.round(effectiveVol / 50 * 100), 0, 100);

  return { regime, hv20: round(hv20), score, positionSizeMultiplier: multiplier, strategies };
}

// Helpers
function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr: number[]): number {
  const avg = average(arr);
  const sqDiffs = arr.map((v) => (v - avg) ** 2);
  return Math.sqrt(average(sqDiffs));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(n: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
