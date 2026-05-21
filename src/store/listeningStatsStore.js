/**
 * listeningStatsStore.js
 * Zustand store for server-side listening stats.
 *
 * Hits GET <localShuffleUrl>/listening-log/stats?period=weekly|monthly|all
 * Maps the full response shape from listening_stats.dart:
 *   { period, label, total_plays, total_minutes,
 *     top_artists[], top_albums[], top_tracks[], recent_plays[] }
 *
 * TTL cache per period (15min) — mirrors Flutter's shuffleStatsProvider Timer.
 * Error differentiation: ENDPOINT_NOT_SUPPORTED (404) vs generic network error.
 */

import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';

const TTL_MS = 15 * 60 * 1000;   // 15 minutes
const TIMEOUT_MS = 15_000;

// ── Typed error sentinels (match Flutter's AsyncValue.error contract) ─────────
export const ERR_NOT_CONFIGURED   = 'NOT_CONFIGURED';
export const ERR_ENDPOINT_404     = 'ENDPOINT_NOT_SUPPORTED';
export const ERR_NETWORK          = 'NETWORK_ERROR';

// ── Stats fetch helper (pure, no Zustand dependency) ─────────────────────────
async function _fetchStats(baseUrl, period) {
  if (!baseUrl) throw new Error(ERR_NOT_CONFIGURED);

  const url = `${baseUrl.replace(/\/+$/, '')}/listening-log/stats?period=${period}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    clearTimeout(timer);
    throw new Error(ERR_NETWORK);
  }
  clearTimeout(timer);

  if (res.status === 404) throw new Error(ERR_ENDPOINT_404);
  if (!res.ok) throw new Error(`SERVER_ERROR_${res.status}`);

  return res.json();
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useListeningStatsStore = create((set, get) => ({
  // UI state
  selectedPeriod: 'weekly',   // 'weekly' | 'monthly' | 'all'
  isLoading:      false,
  error:          null,       // null | ERR_* sentinel string

  // TTL cache: { [period]: { data: {...}, fetchedAt: number } }
  cache: {},

  // ── Selectors ───────────────────────────────────────────────────────────────

  /** Returns cached data for the currently selected period, or null. */
  currentData: () => {
    const { cache, selectedPeriod } = get();
    return cache[selectedPeriod]?.data ?? null;
  },

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Switch the active period tab and fetch if not cached.
   */
  setSelectedPeriod: (period) => {
    set({ selectedPeriod: period });
    get().fetchStats(period);
  },

  /**
   * Fetch stats for [period] if not in TTL cache.
   * Respects the 15min TTL — rapid tab toggles hit cache.
   */
  fetchStats: async (period) => {
    const { cache } = get();
    period = period ?? get().selectedPeriod;

    // Cache hit
    const cached = cache[period];
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) return;

    const baseUrl = useSettingsStore.getState().localShuffleUrl;

    set({ isLoading: true, error: null });
    try {
      const data = await _fetchStats(baseUrl, period);
      set(s => ({
        isLoading: false,
        cache: { ...s.cache, [period]: { data, fetchedAt: Date.now() } },
      }));
    } catch (e) {
      const errorCode = e.message.startsWith('SERVER_ERROR') || Object.values({
        ERR_NOT_CONFIGURED, ERR_ENDPOINT_404, ERR_NETWORK,
      }).includes(e.message)
        ? e.message
        : ERR_NETWORK;
      set({ isLoading: false, error: errorCode });
    }
  },

  /**
   * Force-invalidate the TTL cache for a specific period (or all periods).
   * Used by the refresh button in StatsPage.
   */
  invalidate: (period = null) => {
    set(s => {
      const c = { ...s.cache };
      if (period) delete c[period];
      else Object.keys(c).forEach(k => delete c[k]);
      return { cache: c, error: null };
    });
  },

  /**
   * Refresh: invalidate + re-fetch the current period.
   */
  refresh: async () => {
    const period = get().selectedPeriod;
    get().invalidate(period);
    await get().fetchStats(period);
  },
}));
