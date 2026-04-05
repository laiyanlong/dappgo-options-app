/**
 * Background data refresh manager.
 * Refreshes dashboard data periodically when app is in foreground.
 */
import { AppState, type AppStateStatus } from 'react-native';
import { fetchDashboardData } from './github-api';
import { mapTslaMatrix } from './mappers';
import { useAppStore } from '../store/app-store';
import { GITHUB_OWNER, GITHUB_REPO, CACHE_TTL } from '../utils/constants';

let refreshInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoRefresh(intervalMs: number = 5 * 60 * 1000) {
  stopAutoRefresh();

  // Only refresh when app is active
  const handleAppState = (state: AppStateStatus) => {
    if (state === 'active') {
      refreshIfStale();
    }
  };

  const sub = AppState.addEventListener('change', handleAppState);

  refreshInterval = setInterval(() => {
    if (AppState.currentState === 'active') {
      refreshIfStale();
    }
  }, intervalMs);

  return () => {
    sub.remove();
    stopAutoRefresh();
  };
}

export function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

async function refreshIfStale() {
  const store = useAppStore.getState();
  const lastUpdate = store.lastQuoteUpdate;
  const now = Date.now();

  if (now - lastUpdate < CACHE_TTL.prices) return; // Not stale yet

  try {
    const data = await fetchDashboardData(GITHUB_OWNER, GITHUB_REPO);
    store.setDashboardData(data);

    // Update network status on success
    store.setNetworkStatus('online');

    const allMatrices = (data as Record<string, unknown>)?.options_matrices as
      | Record<string, unknown>
      | undefined;
    if (allMatrices) {
      for (const [sym, raw] of Object.entries(allMatrices)) {
        const mapped = mapTslaMatrix(raw);
        if (mapped) store.setMatrix(sym, mapped);
      }
    }
  } catch {
    // Mark offline on fetch failure
    store.setNetworkStatus('offline');
  }
}
