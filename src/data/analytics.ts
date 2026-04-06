import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'dappgo-analytics';

export interface AnalyticsEvent {
  event: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * Track a local analytics event. Privacy-first — no server calls.
 * Events are stored in AsyncStorage under 'dappgo-analytics'.
 */
export async function trackEvent(event: string, data?: Record<string, unknown>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const events: AnalyticsEvent[] = raw ? JSON.parse(raw) : [];
    events.push({ event, timestamp: new Date().toISOString(), data });
    // Keep only the last 500 events to avoid unbounded storage growth
    const trimmed = events.length > 500 ? events.slice(-500) : events;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Silently ignore — analytics should never break the app
  }
}

/**
 * Retrieve stored analytics events, optionally limited to the most recent N.
 */
export async function getEvents(limit?: number): Promise<AnalyticsEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const events: AnalyticsEvent[] = raw ? JSON.parse(raw) : [];
    if (limit && limit > 0) {
      return events.slice(-limit);
    }
    return events;
  } catch {
    return [];
  }
}

/**
 * Compute high-level usage statistics from local analytics data.
 */
export async function getUsageStats(): Promise<{
  totalSessions: number;
  mostUsedTab: string;
  backtestRuns: number;
  matrixViews: number;
  reportsViewed: number;
  lastActive: string;
}> {
  try {
    const events = await getEvents();

    const totalSessions = events.filter((e) => e.event === 'app_open').length;
    const backtestRuns = events.filter((e) => e.event === 'backtest_run').length;
    const matrixViews = events.filter((e) => e.event === 'matrix_view').length;
    const reportsViewed = events.filter((e) => e.event === 'report_view').length;

    // Count tab switches to determine most-used tab
    const tabCounts: Record<string, number> = {};
    for (const e of events) {
      if (e.event === 'tab_switch' && e.data?.tab) {
        const tab = String(e.data.tab);
        tabCounts[tab] = (tabCounts[tab] ?? 0) + 1;
      }
    }
    let mostUsedTab = 'Dashboard';
    let maxCount = 0;
    for (const [tab, count] of Object.entries(tabCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostUsedTab = tab;
      }
    }

    const lastActive =
      events.length > 0 ? events[events.length - 1].timestamp : new Date().toISOString();

    return {
      totalSessions,
      mostUsedTab,
      backtestRuns,
      matrixViews,
      reportsViewed,
      lastActive,
    };
  } catch {
    return {
      totalSessions: 0,
      mostUsedTab: 'Dashboard',
      backtestRuns: 0,
      matrixViews: 0,
      reportsViewed: 0,
      lastActive: new Date().toISOString(),
    };
  }
}
