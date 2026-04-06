/**
 * OHLC bar data generator.
 * Converts intraday prices into candlestick bars and generates
 * realistic daily OHLC data for extended time frames.
 */

export interface OHLCBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Group intraday price data into a fixed number of OHLC bars.
 * Each bar aggregates a slice of the input arrays.
 */
export function intradayToOHLC(
  prices: number[],
  times: string[],
  barsCount: number
): OHLCBar[] {
  if (prices.length === 0) return [];
  const count = Math.min(barsCount, prices.length);
  const groupSize = Math.max(1, Math.floor(prices.length / count));
  const bars: OHLCBar[] = [];

  for (let i = 0; i < count; i++) {
    const start = i * groupSize;
    const end = i === count - 1 ? prices.length : (i + 1) * groupSize;
    const slice = prices.slice(start, end);
    if (slice.length === 0) continue;

    const open = slice[0];
    const close = slice[slice.length - 1];
    const high = Math.max(...slice);
    const low = Math.min(...slice);
    // Synthetic volume proportional to price range
    const range = high - low;
    const avgPrice = (high + low) / 2;
    const volume = Math.round((range / avgPrice) * 1e6 + Math.random() * 5e5);

    bars.push({
      time: times[start] ?? `${i}`,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
  }

  return bars;
}

// Simple seeded PRNG (Mulberry32)
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalRandom(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generate realistic daily OHLC data using geometric Brownian motion.
 */
export function generateDailyOHLC(
  startPrice: number,
  days: number,
  volatility: number = 0.35,
  seed: number = 42
): OHLCBar[] {
  const rng = mulberry32(seed);
  const dt = 1 / 252;
  const drift = (0.08 - 0.5 * volatility * volatility) * dt;
  const diffusion = volatility * Math.sqrt(dt);

  const bars: OHLCBar[] = [];
  let price = startPrice;

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - Math.round(days * 1.45));
  const currentDate = new Date(startDate);
  let tradingDay = 0;

  while (tradingDay < days) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');

      const open = price;
      // Simulate intraday movement
      const z1 = normalRandom(rng);
      const z2 = normalRandom(rng);
      const z3 = normalRandom(rng);

      const close = open * Math.exp(drift + diffusion * z1);
      const intradayVol = volatility * Math.sqrt(dt) * 0.6;
      const high = Math.max(open, close) * (1 + Math.abs(z2) * intradayVol);
      const low = Math.min(open, close) * (1 - Math.abs(z3) * intradayVol);

      const range = high - low;
      const avgPrice = (high + low) / 2;
      const volume = Math.round(
        (1 + Math.abs(z1)) * 5e6 + (range / avgPrice) * 2e7
      );

      bars.push({
        time: `${yyyy}-${mm}-${dd}`,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume,
      });

      price = close;
      tradingDay++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return bars;
}
