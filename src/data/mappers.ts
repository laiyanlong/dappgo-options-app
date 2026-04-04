/**
 * Map snake_case data.json fields to camelCase TypeScript types.
 * GitHub data.json uses Python naming (snake_case), app uses TS (camelCase).
 */

import type { StrikeComparison, OptionEntry } from '../utils/types';

export function mapTslaMatrix(raw: any): StrikeComparison | null {
  if (!raw || !raw.price || !raw.expiries) return null;

  return {
    price: raw.price,
    expiries: raw.expiries.map((exp: any) => ({
      date: exp.date,
      dte: exp.dte,
      puts: (exp.puts || []).map(mapOptionEntry),
      calls: (exp.calls || []).map(mapOptionEntry),
    })),
  };
}

function mapOptionEntry(raw: any): OptionEntry {
  return {
    strike: raw.strike ?? 0,
    otmPct: raw.otm_pct ?? raw.otmPct ?? 0,
    bid: raw.bid ?? 0,
    ask: raw.ask ?? 0,
    mid: raw.mid ?? ((raw.bid ?? 0) + (raw.ask ?? 0)) / 2,
    spreadPct: raw.spread_pct ?? raw.spreadPct ?? 0,
    spreadQuality: raw.spread_quality ?? raw.spreadQuality ?? 'Fair',
    iv: raw.iv ?? 0,
    delta: raw.delta ?? 0,
    gamma: raw.gamma ?? 0,
    theta: raw.theta ?? 0,
    vega: raw.vega ?? 0,
    volume: raw.volume ?? 0,
    oi: raw.oi ?? raw.openInterest ?? 0,
    annualized: raw.annualized ?? 0,
    pop: raw.pop ?? 0,
    cpScore: raw.cp_score ?? raw.cpScore ?? 0,
    days: raw.days ?? raw.dte ?? 0,
  };
}
