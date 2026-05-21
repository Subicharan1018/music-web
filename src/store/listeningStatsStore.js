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

// ── V2 Stats fetch helper (pure, no Zustand dependency) ──────────────────────
async function _fetchV2(baseUrl, endpoint) {
  if (!baseUrl) throw new Error(ERR_NOT_CONFIGURED);

  const url = `${baseUrl.replace(/\/+$/, '')}/${endpoint}`;
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

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    // Python's json.dumps maps NaN to unquoted NaN which breaks strict JSON.
    const sanitized = text
      .replace(/:\s*NaN/g, ': null')
      .replace(/:\s*Infinity/g, ': null')
      .replace(/:\s*-Infinity/g, ': null');
    return JSON.parse(sanitized);
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useListeningStatsStore = create((set, get) => ({
  // UI state
  selectedPeriod: 'weekly',   // 'weekly' | 'monthly' | 'all'
  isLoading:      false,
  error:          null,       // null | ERR_* sentinel string

  // TTL cache: { [period]: { data: {...}, fetchedAt: number } }
  cache: {},
  historyCache: null,
  composersCache: null,
  modelStatusCache: null,

  // ── Selectors ───────────────────────────────────────────────────────────────

  /** Returns cached data for the currently selected period, or null. */
  currentData: () => {
    const { cache, selectedPeriod } = get();
    return cache[selectedPeriod]?.data ?? null;
  },

  // ── Actions ─────────────────────────────────────────────────────────────────

  setSelectedPeriod: (period) => {
    set({ selectedPeriod: period });
    get().fetchStats(period);
  },

  fetchStats: async (period) => {
    const { cache } = get();
    period = period ?? get().selectedPeriod;

    // Cache hit
    const cached = cache[period];
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) return;

    const baseUrl = useSettingsStore.getState().v2ShuffleUrl; // V2 Migration

    set({ isLoading: true, error: null });
    try {
      const data = await _fetchV2(baseUrl, `listening-log/stats?period=${period}`);
      set(s => ({
        isLoading: false,
        cache: { ...s.cache, [period]: { data, fetchedAt: Date.now() } },
      }));
    } catch (e) {
      set({ isLoading: false, error: e.message || ERR_NETWORK });
    }
  },

  fetchHistory: async (limit = 15) => {
    const { historyCache } = get();
    if (historyCache && Date.now() - historyCache.fetchedAt < TTL_MS) return historyCache.data;

    const baseUrl = useSettingsStore.getState().v2ShuffleUrl;
    try {
      const data = await _fetchV2(baseUrl, `listening-log/history?limit=${limit}`);
      set({ historyCache: { data, fetchedAt: Date.now() } });
      return data;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  fetchComposers: async () => {
    const { composersCache } = get();
    if (composersCache && Date.now() - composersCache.fetchedAt < TTL_MS) return composersCache.data;

    const baseUrl = useSettingsStore.getState().v2ShuffleUrl;
    try {
      const data = await _fetchV2(baseUrl, `listening-log/composers`);
      set({ composersCache: { data, fetchedAt: Date.now() } });
      return data;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  fetchModelStatus: async () => {
    const { modelStatusCache } = get();
    if (modelStatusCache && Date.now() - modelStatusCache.fetchedAt < TTL_MS) return modelStatusCache.data;

    const baseUrl = useSettingsStore.getState().v2ShuffleUrl;
    try {
      const data = await _fetchV2(baseUrl, `model/status`);
      set({ modelStatusCache: { data, fetchedAt: Date.now() } });
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  fetchSongDeepDive: async (title) => {
    const baseUrl = useSettingsStore.getState().v2ShuffleUrl;
    try {
      return await _fetchV2(baseUrl, `listening-log/song?title=${encodeURIComponent(title)}`);
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  invalidate: (period = null) => {
    set(s => {
      const c = { ...s.cache };
      if (period) delete c[period];
      else Object.keys(c).forEach(k => delete c[k]);
      return { cache: c, error: null, historyCache: null, composersCache: null, modelStatusCache: null };
    });
  },

  refresh: async () => {
    const period = get().selectedPeriod;
    get().invalidate(period);
    await get().fetchStats(period);
    // Also re-fetch new endpoints proactively if they were being viewed? 
    // They fetch automatically on mount so it's fine.
  },
}));
