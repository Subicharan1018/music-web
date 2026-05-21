/**
 * settingsStore.js
 * Persisted Zustand store for application settings, Subsonic server config, and theme preferences.
 *
 * Persistence strategy:
 *   - Credentials + sensitive URLs → cookies (30-day, survives hard reload, no XSS in localStorage)
 *   - Non-sensitive settings (v2ShuffleEnabled, transcodeFormat, theme, etc.) → Zustand localStorage persist
 *   - v2ShuffleEnabled lives ONLY in localStorage via Zustand persist — NOT in cookies — to avoid
 *     the split-brain bug where a stale cookie written before this field existed would shadow localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authCookies } from '../lib/auth';

const initialAuth = authCookies.get() || {};

// Only write sensitive credentials to cookies — NOT v2ShuffleEnabled
const syncCookies = (state) => {
  authCookies.set({
    serverUrl:        state.serverUrl,
    username:         state.username,
    password:         state.password,
    isConfigured:     state.isConfigured,
    localShuffleUrl:  state.localShuffleUrl,
    v2ShuffleUrl:     state.v2ShuffleUrl,
    lastfmSessionKey: state.lastfmSessionKey,
    lastfmApiKey:     state.lastfmApiKey,
    lastfmApiSecret:  state.lastfmApiSecret,
    lastfmUsername:   state.lastfmUsername,
  });
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // ── Credentials (hydrated from cookies at module load) ────────────────
      serverUrl:    initialAuth.serverUrl    || '',
      username:     initialAuth.username     || '',
      password:     initialAuth.password     || '',
      isConfigured: initialAuth.isConfigured || false,

      localShuffleUrl: initialAuth.localShuffleUrl || '',
      v2ShuffleUrl:    initialAuth.v2ShuffleUrl    || 'http://100.99.105.51:5000',

      lastfmSessionKey: initialAuth.lastfmSessionKey || null,
      lastfmApiKey:     initialAuth.lastfmApiKey     || '',
      lastfmApiSecret:  initialAuth.lastfmApiSecret  || '',
      lastfmUsername:   initialAuth.lastfmUsername   || '',

      // ── Non-sensitive settings (persisted via Zustand localStorage) ───────
      // NOTE: v2ShuffleEnabled is intentionally NOT read from cookies.
      // It is restored by the Zustand persist middleware from localStorage on hydration.
      // Default false here is only used on a completely fresh install (no localStorage entry).
      v2ShuffleEnabled: false,

      transcodeFormat:  'mp3',
      transcodeBitrate: '320',
      replayGainMode:   'none',
      replayGainPreamp: '0',
      scrobblingEnabled: true,
      theme: 'dark',

      // ── Actions ───────────────────────────────────────────────────────────
      setServerConfig: (config) => {
        set((state) => {
          const nextState = {
            ...state,
            serverUrl:    config.serverUrl,
            username:     config.username,
            password:     config.password,
            isConfigured: true,
          };
          syncCookies(nextState);
          return nextState;
        });
      },

      clearConfig: () => {
        authCookies.remove();
        set({
          serverUrl:    '',
          username:     '',
          password:     '',
          isConfigured: false,
          localShuffleUrl: '',
          v2ShuffleUrl: 'http://100.99.105.51:5000',
          lastfmSessionKey: null,
          lastfmApiKey:     '',
          lastfmApiSecret:  '',
          lastfmUsername:   '',
        });
      },

      updateSettings: (newSettings) => set((state) => {
        const nextState = { ...state, ...newSettings };
        syncCookies(nextState);
        return nextState;
      }),
    }),
    {
      name: 'navivibe-settings',
      // Only persist non-sensitive, non-credential fields to localStorage.
      // Credentials and sensitive URLs live in cookies via authCookies (set above).
      partialize: (state) => ({
        v2ShuffleEnabled: state.v2ShuffleEnabled,
        transcodeFormat:  state.transcodeFormat,
        transcodeBitrate: state.transcodeBitrate,
        replayGainMode:   state.replayGainMode,
        replayGainPreamp: state.replayGainPreamp,
        scrobblingEnabled: state.scrobblingEnabled,
        theme:            state.theme,
      }),
      onRehydrateStorage: () => (restoredState, error) => {
        if (error) {
          console.error('[settingsStore] Rehydration failed:', error);
        } else {
          console.log(
            `[settingsStore] ✓ Rehydrated — v2ShuffleEnabled=${restoredState?.v2ShuffleEnabled ?? 'NOT FOUND (key missing from localStorage)'}`
          );
        }
      },
    }
  )
);
