import { CACHE_TTL } from '../utils/constants';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.ttl !== Infinity && Date.now() - entry.timestamp > entry.ttl) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL.dashboardData): void {
  memoryCache.set(key, { data, timestamp: Date.now(), ttl });
}

export function clearCache(): void {
  memoryCache.clear();
}

export function getCacheSize(): number {
  return memoryCache.size;
}

// Cache keys
export const cacheKeys = {
  reportDates: 'report-dates',
  report: (date: string) => `report-${date}`,
  dashboard: 'dashboard-data',
  quote: (symbol: string) => `quote-${symbol}`,
  matrix: (symbol: string) => `matrix-${symbol}`,
};
