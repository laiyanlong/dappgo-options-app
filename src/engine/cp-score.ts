/**
 * CP (Cost-Performance) Score
 * Composite metric ranking options trades by risk-adjusted value.
 *
 * CP = annualized_return × 0.30
 *    + safety_margin     × 0.25
 *    + (1 - |delta|)     × 0.25
 *    + theta_efficiency   × 0.20
 */

export function cpScore(
  annualizedReturn: number,
  otmPct: number,
  delta: number,
  theta: number,
  premium: number
): number {
  // Normalize annualized return (cap at 200% for scoring)
  const retScore = (Math.min(annualizedReturn, 200) / 200) * 100;

  // Safety margin: higher OTM% = safer
  const safetyScore = (Math.min(Math.abs(otmPct), 10) / 10) * 100;

  // Delta score: lower |delta| = lower assignment risk
  const deltaScore = (1 - Math.min(Math.abs(delta), 1)) * 100;

  // Theta efficiency: higher |theta|/premium = better time decay capture
  let thetaEff = 0;
  if (premium > 0) {
    thetaEff = Math.min(Math.abs(theta) / premium, 1) * 100;
  }

  return Math.round(
    (retScore * 0.30 + safetyScore * 0.25 + deltaScore * 0.25 + thetaEff * 0.20) * 10
  ) / 10;
}

/**
 * Calculate annualized return for selling an option
 */
export function annualizedReturn(
  premium: number,
  strike: number,
  daysToExp: number
): number {
  if (strike <= 0 || premium <= 0 || daysToExp <= 0) return 0;
  return (premium / strike) * (365 / daysToExp) * 100;
}
