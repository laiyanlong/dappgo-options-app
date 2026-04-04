import type { TickerReport, OptionsExpiry, OptionEntry } from '../utils/types';

/**
 * Parse a daily report markdown into structured data.
 * Extracts per-ticker sections with key metrics.
 */
export function parseReport(markdown: string): {
  date: string;
  tickers: string[];
  sections: Record<string, string>;
} {
  const dateMatch = markdown.match(/每日選擇權策略報告 — (\d{4}-\d{2}-\d{2})/);
  const date = dateMatch?.[1] || '';

  // Split by ## ticker sections
  const tickerPattern = /^## ([A-Z]{1,5})$/gm;
  const tickers: string[] = [];
  let match;
  while ((match = tickerPattern.exec(markdown)) !== null) {
    if (!['最終總結', '🧠', '🤖'].some((s) => match![1].includes(s))) {
      tickers.push(match[1]);
    }
  }

  // Extract named sections
  const sections: Record<string, string> = {};
  const sectionPattern = /^## (.+)$/gm;
  const sectionStarts: { name: string; start: number }[] = [];
  while ((match = sectionPattern.exec(markdown)) !== null) {
    sectionStarts.push({ name: match[1], start: match.index });
  }
  for (let i = 0; i < sectionStarts.length; i++) {
    const end = i + 1 < sectionStarts.length ? sectionStarts[i + 1].start : markdown.length;
    sections[sectionStarts[i].name] = markdown.slice(sectionStarts[i].start, end).trim();
  }

  return { date, tickers, sections };
}

/**
 * Extract key metrics from a ticker section.
 */
export function extractTickerMetrics(section: string, symbol: string): Partial<TickerReport> {
  const price = extractNumber(section, /現價.*?\*\*\$([0-9,.]+)\*\*/);
  const changePct = extractNumber(section, /昨日漲跌.*?([+-]?[0-9.]+)%/);
  const avgIv = extractNumber(section, /平均 IV.*?([0-9.]+)%/);
  const ivRank = extractNumber(section, /IV Rank.*?([0-9.]+)%/);

  return { symbol, price: price || 0, changePct: changePct || 0, avgIv: avgIv || 0, ivRank };
}

function extractNumber(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (!match) return undefined;
  return parseFloat(match[1].replace(',', ''));
}
