/**
 * Generate realistic sample price data for backtesting.
 * Uses geometric Brownian motion with seeded PRNG for reproducibility.
 */

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

// Box-Muller transform for normal distribution
function normalRandom(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Default starting prices per ticker (approximate real-world levels)
const DEFAULT_PRICES: Record<string, number> = {
  TSLA: 365,
  AMZN: 210,
  NVDA: 175,
  AAPL: 195,
  MSFT: 415,
  META: 500,
  GOOG: 155,
  SPY: 640,
};

// Typical annual volatilities per ticker
const DEFAULT_VOLS: Record<string, number> = {
  TSLA: 0.55,
  AMZN: 0.35,
  NVDA: 0.50,
  AAPL: 0.25,
  MSFT: 0.25,
  META: 0.40,
  GOOG: 0.30,
  SPY: 0.18,
};

export interface SamplePriceData {
  prices: number[];
  dates: string[];
}

/**
 * Generate realistic sample daily prices using geometric Brownian motion.
 *
 * @param startPrice  Starting stock price
 * @param days        Number of trading days to generate
 * @param annualReturn  Expected annual return (default 0.10 = 10%)
 * @param annualVol     Annual volatility (default 0.40 = 40%)
 * @param seed          PRNG seed for reproducibility (default 42)
 */
export function generateSamplePrices(
  startPrice: number,
  days: number,
  annualReturn: number = 0.10,
  annualVol: number = 0.40,
  seed: number = 42
): SamplePriceData {
  const rng = mulberry32(seed);
  const dt = 1 / 252; // one trading day
  const drift = (annualReturn - 0.5 * annualVol * annualVol) * dt;
  const diffusion = annualVol * Math.sqrt(dt);

  const prices: number[] = [startPrice];
  const dates: string[] = [];

  // Generate start date working backward from today
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - Math.round(days * 1.45)); // rough calendar-to-trading ratio

  let currentDate = new Date(startDate);
  let tradingDay = 0;

  while (tradingDay < days) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Weekday = trading day
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);

      if (tradingDay > 0) {
        const z = normalRandom(rng);
        const prevPrice = prices[prices.length - 1];
        const newPrice = prevPrice * Math.exp(drift + diffusion * z);
        prices.push(Math.round(newPrice * 100) / 100);
      }
      tradingDay++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { prices, dates };
}

/**
 * Generate sample prices for a specific ticker with sensible defaults.
 */
export function generateTickerPrices(
  symbol: string,
  tradingDays: number = 504
): SamplePriceData {
  const startPrice = DEFAULT_PRICES[symbol] ?? 100;
  const annualVol = DEFAULT_VOLS[symbol] ?? 0.35;
  // Use symbol hash as seed for reproducibility per ticker
  const seed = symbol.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0);
  return generateSamplePrices(startPrice, tradingDays, 0.10, annualVol, seed);
}

/**
 * Map period string to approximate number of trading days.
 */
export function periodToTradingDays(period: '3mo' | '6mo' | '1y' | '2y'): number {
  switch (period) {
    case '3mo': return 63;
    case '6mo': return 126;
    case '1y': return 252;
    case '2y': return 504;
  }
}
