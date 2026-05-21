/**
 * v2ShuffleStore.js
 * Zustand store for V2 AI shuffle server state.
 * Manages session history (played_titles, listen ratios) required by the V2 model.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { V2ShuffleApiService, V2ShuffleNetworkError } from '../services/V2ShuffleApiService';

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

let _serviceInstance = null;
let _intervalId = null;
const HEALTH_POLL_MS = 30_000;

function _uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const useV2ShuffleStore = create(
  persist(
    (set, get) => ({
      // Server config
      serverUrl: '',
      isConfigured: false,

      // Health
      health: null,
      isHealthy: false,
      weather: null,

      // Session State (V2 Requires explicit tracking)
      sessionId: '',
      depth: 0,
      playedTitles: [],
      recentListenRatios: [],
      lastEndReason: null,

      // Queue State
      recommendedQueue: [],
      isLoadingQueue: false,
      queueError: null,
      currentContext: null, // Holds context info returned by /next

      // ── Actions ────────────────────────────────────────────────────────────────

      init: async (url) => {
        _serviceInstance = new V2ShuffleApiService({ baseUrl: url || '' });
        const isConfigured = !_serviceInstance._unconfigured;
        set({ serverUrl: url || '', isConfigured });

        if (isConfigured) {
          if (!get().sessionId) set({ sessionId: _uuid() });
          await get().checkHealth();
        } else {
          set({ health: null, isHealthy: false });
        }
      },

      checkHealth: async () => {
        if (!_serviceInstance || _serviceInstance._unconfigured) return;
        try {
          const health = await _serviceInstance.getHealth();
          set({ health, isHealthy: health.isHealthy, weather: health.weather || null });
        } catch (err) {
          set({ health: null, isHealthy: false });
        }
      },

      startHealthPolling: () => {
        if (_intervalId) clearInterval(_intervalId);
        _intervalId = setInterval(() => get().checkHealth(), HEALTH_POLL_MS);
      },

      stopHealthPolling: () => {
        if (_intervalId) {
          clearInterval(_intervalId);
          _intervalId = null;
        }
      },

      resetSession: () => {
        set({
          sessionId: _uuid(),
          depth: 0,
          playedTitles: [],
          recentListenRatios: [],
          lastEndReason: null,
          recommendedQueue: [],
          currentContext: null,
        });
        console.log('[v2ShuffleStore] Session reset manually');
      },

      /**
       * Submits feedback for a completed/skipped track and records it in session history.
       */
      submitFeedback: (title, listenRatio, endReason) => {
        if (!_serviceInstance || _serviceInstance._unconfigured) return;
        
        const { sessionId, depth } = get();

        // Fire and forget network call
        _serviceInstance.submitFeedback({ 
          title, 
          listenRatio, 
          endReason,
          sessionId,
          sessionDepth: depth
        });

        // Update local session history for the next /next call
        set(s => {
          const newPlayed = [...s.playedTitles, title];
          // Keep only the last 5 ratios to avoid stale context driving future songs too hard
          const newRatios = [...s.recentListenRatios, listenRatio].slice(-5);
          return {
            playedTitles: newPlayed,
            recentListenRatios: newRatios,
            lastEndReason: endReason,
            depth: s.depth + 1,
          };
        });
      },

      /**
       * Fetches the next batch of recommended songs.
       * @param {number}  count    — number of songs to request (default 15)
       * @param {string}  playlist — optional genre hint ('melody', 'kuthu', etc.)
       */
      fetchNext: async ({ count = 15, playlist = null } = {}) => {
        if (!_serviceInstance || _serviceInstance._unconfigured) return;
        
        set({ isLoadingQueue: true, queueError: null });
        const { sessionId, depth, playedTitles, recentListenRatios, lastEndReason } = get();

        try {
          const response = await _serviceInstance.getNext({
            sessionId,
            depth,
            playedTitles,
            recentListenRatios,
            lastEndReason,
            count,
            playlist,
          });

          if (!response.queue || !response.queue.length) {
            set({ isLoadingQueue: false, queueError: 'empty' });
            return;
          }

          set({
            recommendedQueue: response.queue,
            currentContext: response.context || null,
            isLoadingQueue: false,
            queueError: null,
          });
        } catch (err) {
          set({ isLoadingQueue: false, queueError: err.message, recommendedQueue: [] });
          throw err; // Re-throw to allow playerStore fallback
        }
      },
    }),
    {
      name: 'v2-shuffle-cookie-storage',
      storage: cookieStorage,
      partialize: (state) => ({
        sessionId: state.sessionId,
        depth: state.depth,
        playedTitles: state.playedTitles,
        recentListenRatios: state.recentListenRatios,
      }),
    }
  )
);
