/**
 * aiShuffleStore.js
 * Zustand store for AI shuffle server state.
 * Persisted to cookies via Zustand middleware to maintain session across reloads.
 *
 * Module-level variables hold the class instance and interval ID
 * so Zustand state stays serializable for devtools.
 *
 * Maps all 7 Flutter Riverpod providers from shuffle_providers.dart.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ShuffleApiService, ShuffleNetworkError } from '../services/ShuffleApiService';

const cookieStorage = {
  getItem: (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
  },
  setItem: (name, value) => {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000`; // 1 year
  },
  removeItem: (name) => {
    document.cookie = `${name}=; path=/; max-age=0`;
  },
};

// ── Module-level non-serializable state ─────────────────────────────────────
let _serviceInstance = null;  // ShuffleApiService | null
let _intervalId = null;       // setInterval handle | null

const HEALTH_POLL_MS = 30_000;
const STATS_TTL_MS   = 15 * 60_000; // 15 minutes

// ── Store ────────────────────────────────────────────────────────────────────
export const useAIShuffleStore = create(
  persist(
    (set, get) => ({
      // Server config
      serverUrl:    '',
      isConfigured: false,

      // Health
      health:           null,
      isHealthy:        false,
      healthLastChecked: null,

      // Queue
      recommendedQueue: [],
      isLoadingQueue:   false,
      queueError:       null,
      sessionId:        '',
      queueSource:      '',        // 'model' | 'cold_start' | 'fallback' | 'legacy' | ''

      // Session
      sessionStatus: null,

      // Stats (15min TTL)
      stats:            null,
      statsLastFetched: null,

      // ── Actions ────────────────────────────────────────────────────────────────

      /**
       * Create a new ShuffleApiService instance from the given URL.
       * Immediately checks health and fetches session status.
       * Mirrors shuffleApiServiceProvider + shuffleRepositoryProvider.
       */
      init: async (url) => {
        _serviceInstance = new ShuffleApiService({ baseUrl: url || '' });
        const isConfigured = !_serviceInstance._unconfigured;

        set({ serverUrl: url || '', isConfigured });

        if (isConfigured) {
          // Immediately check health so isHealthy is accurate before first shuffle
          await get().checkHealth();
        } else {
          set({ health: null, isHealthy: false, sessionStatus: null });
        }
      },

      /**
       * GET /health — mirrors serverHealthProvider.
       * Also fetches session status on success.
       */
      checkHealth: async () => {
        if (!_serviceInstance || _serviceInstance._unconfigured) return;
        try {
          const health = await _serviceInstance.getHealth();
          const wasHealthy = get().isHealthy;
          set({ health, isHealthy: health.isHealthy, healthLastChecked: Date.now() });
        } catch (err) {
          set({ health: null, isHealthy: false });
          if (!(err instanceof ShuffleNetworkError)) {
            console.error('[aiShuffleStore] checkHealth error:', err);
          }
        }
      },


      /**
       * GET /next — mirrors ShuffleQueueNotifier.fetchNext().
       * Stores source for cold-start UI label.
       */
      fetchNext: async ({ current, playlist, artist, count = 10 }) => {
        if (!_serviceInstance || _serviceInstance._unconfigured) return;
        set({ isLoadingQueue: true, queueError: null });
        try {
          const response = await _serviceInstance.getNext({ current, playlist, artist, count });
          if (!response.songs.length) {
            set({ isLoadingQueue: false, queueError: 'empty' });
            return;
          }
          set({
            recommendedQueue: response.songs,
            queueSource:      response.source,
            sessionId:        response.sessionId,
            isLoadingQueue:   false,
            queueError:       null,
          });
        } catch (err) {
          set({ isLoadingQueue: false, queueError: err.message, recommendedQueue: [] });
          throw err; // re-throw so playerStore can fall back to local
        }
      },

      /**
       * GET /profile — not stored globally (per-call).
       * Mirrors songProfileProvider.
       */
      fetchProfile: async (song) => {
        if (!_serviceInstance || _serviceInstance._unconfigured) return null;
        try {
          return await _serviceInstance.getProfile({ song });
        } catch {
          return null;
        }
      },

      /**
       * GET /stats — 15min TTL mirrors shuffleStatsProvider Timer pattern.
       */
      fetchStats: async () => {
        const { stats, statsLastFetched } = get();
        if (statsLastFetched && Date.now() - statsLastFetched < STATS_TTL_MS) {
          return stats; // within TTL — no network call
        }
        if (!_serviceInstance || _serviceInstance._unconfigured) return null;
        try {
          const fresh = await _serviceInstance.getStats();
          set({ stats: fresh, statsLastFetched: Date.now() });
          return fresh;
        } catch {
          return null;
        }
      },

      /**
       * POST /session/reset — clears queue and immediately refetches with context.
       * Caller should provide currentSong for immediate re-fetch.
       */
      resetSession: async (currentSongTitle) => {
        if (!_serviceInstance || _serviceInstance._unconfigured) return;
        try {
          await _serviceInstance.resetSession();
          set({ recommendedQueue: [], sessionId: '', queueSource: '' });
          // Immediately refetch so overlay has fresh recommendations
          if (currentSongTitle) {
            await get().fetchNext({ current: currentSongTitle }).catch(() => {});
          }
        } catch (err) {
          console.error('[aiShuffleStore] resetSession error:', err);
        }
      },

      /**
       * Start polling /health every 30s — mirrors serverHealthProvider (Stream).
       * Stops any existing interval first.
       */
      startHealthPolling: () => {
        if (_intervalId) clearInterval(_intervalId);
        _intervalId = setInterval(() => {
          get().checkHealth();
        }, HEALTH_POLL_MS);
      },

      /**
       * Stop health polling — call in useEffect cleanup.
       */
      stopHealthPolling: () => {
        if (_intervalId) {
          clearInterval(_intervalId);
          _intervalId = null;
        }
      },
    }),
    {
      name: 'ai-shuffle-cookie-storage',
      storage: cookieStorage,
      partialize: (state) => ({ 
        sessionId: state.sessionId, 
        recommendedQueue: state.recommendedQueue, 
        sessionStatus: state.sessionStatus, 
        queueSource: state.queueSource 
      }),
    }
  )
);
